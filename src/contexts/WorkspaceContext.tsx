import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Workspace, TeamMember, TeamGroup, Project, Sprint, ViewFilter, ViewMode } from '../types';
import { createWorkspace, fetchUserWorkspaces, fetchWorkspaceMembers, fetchTeamGroups, joinWorkspaceByInvite } from '../services/workspaceService';
import { createProject, fetchWorkspaceProjects } from '../services/projectService';
import { fetchProjectSprints, createSprint, updateSprint as updateSprintInDB, fetchWorkspaceSprints, deleteSprint as deleteSprintInDB } from '../services/sprintService';
import { updateWorkspace as updateWorkspaceInDB } from '../services/workspaceService';
import { createInitiative, fetchInitiatives } from '../services/initiativeService';
import { getBacklogSettings, autoArchiveStaleBacklog } from '../services/backlogService';
import type { Initiative } from '../types';
import { checkPendingInvites, acceptInvite } from '../services/invitationService';


interface WorkspaceContextType {
    // Workspace
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    setCurrentWorkspace: (ws: Workspace) => void;
    addWorkspace: (name: string, color: string, type: Workspace['type']) => Promise<Workspace>;
    refreshWorkspaces: () => Promise<void>;
    updateWorkspaceConfig: (updates: Partial<Workspace>) => Promise<void>;

    // Team Groups
    teamGroups: TeamGroup[];
    currentTeamGroup: TeamGroup | null;
    setCurrentTeamGroup: (tg: TeamGroup | null) => void;
    refreshTeamGroups: () => Promise<void>;

    // Initiatives
    initiatives: Initiative[];
    addInitiative: (name: string, description?: string, targetDate?: string, projectIds?: string[]) => Promise<Initiative>;
    refreshInitiatives: () => Promise<void>;

    // Projects
    projects: Project[];
    currentProject: Project | null;
    setCurrentProject: (p: Project | null) => void;
    addProject: (name: string, color: string, teamGroupId?: string, initiativeId?: string) => Promise<Project>;
    refreshProjects: () => Promise<void>;

    // Sprints
    sprints: Sprint[];
    allWorkspaceSprints: Sprint[];
    currentSprint: Sprint | null;
    setCurrentSprint: (s: Sprint | null) => void;
    addSprint: (name: string, type?: Sprint['type'], startDate?: string, endDate?: string, parentId?: string, linkedSprintIds?: string[]) => Promise<Sprint>;
    updateCurrentSprint: (updates: Partial<Sprint>) => Promise<void>;
    updateSprint: (id: string, updates: Partial<Sprint>) => Promise<void>;
    deleteSprint: (id: string) => Promise<void>;
    refreshSprints: () => Promise<void>;

    // Members
    currentMembers: TeamMember[];
    refreshMembers: () => Promise<void>;

    // Scope
    scope: 'mine' | 'all';
    setScope: (s: 'mine' | 'all') => void;

    // Hierarchy helpers
    getChildSprints: (parentId: string) => Sprint[];
    getLinkedSprints: (milestoneId: string) => Sprint[];

    // View mode (Linear/Jira style — shared between sidebar and content)
    currentViewMode: ViewMode;
    setCurrentViewMode: (v: ViewMode) => void;

    // Custom View filter
    activeViewFilter: ViewFilter | null;
    setActiveViewFilter: (f: ViewFilter | null) => void;

    // Loading state — true after initial workspace data is loaded
    workspaceReady: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();

    // ✅ localStorage에서 이전 데이터로 즉시 시작 (네트워크 X)
    const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
        try {
            const cached = localStorage.getItem('tf_workspaces');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(() => {
        try {
            const cached = localStorage.getItem('tf_currentWorkspace');
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
    const [currentTeamGroup, setCurrentTeamGroup] = useState<TeamGroup | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [allWorkspaceSprints, setAllWorkspaceSprints] = useState<Sprint[]>([]);
    const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
    const [currentMembers, setCurrentMembers] = useState<TeamMember[]>([]);
    const [scope, setScope] = useState<'mine' | 'all'>('mine');
    const [currentViewMode, setCurrentViewMode] = useState<ViewMode>('list');
    const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter | null>(null);
    const [initiatives, setInitiatives] = useState<Initiative[]>([]);
    const [workspaceReady, setWorkspaceReady] = useState(false);

    // ✅ workspace가 바뀌면 localStorage에 저장
    useEffect(() => {
        if (workspaces.length > 0) {
            localStorage.setItem('tf_workspaces', JSON.stringify(workspaces));
        }
    }, [workspaces]);
    useEffect(() => {
        if (currentWorkspace) {
            localStorage.setItem('tf_currentWorkspace', JSON.stringify(currentWorkspace));
        }
    }, [currentWorkspace]);

    // 1. 워크스페이스 로드 — 즉시 렌더링 우선, 초대 수락은 백그라운드로 지연
    useEffect(() => {
        if (!user) return;
        const init = async () => {
            // ✅ Step 1: 워크스페이스 즉시 로드 (UI 블로킹 최소화)
            let wsList = await fetchUserWorkspaces(user.uid);

            if (wsList.length === 0) {
                const ws = await createWorkspace('My Workspace', '#6366f1', 'personal', {
                    uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL,
                });
                wsList = [ws];
            }

            // ✅ 즉시 화면에 반영 — 초대 확인을 기다리지 않음
            setWorkspaces(wsList);
            setCurrentWorkspace(wsList[0]);

            // ✅ Step 2: 초대 수락 + 백로그 정리는 백그라운드 (fire-and-forget)
            if (user.email) {
                checkPendingInvites(user.email).then(async (pendingInvites) => {
                    if (pendingInvites.length === 0) return;
                    for (const invite of pendingInvites) {
                        try {
                            await joinWorkspaceByInvite(invite.workspaceId, { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL });
                            await acceptInvite(invite.id);
                        } catch { /* 이미 참여 중이거나 실패 시 무시 */ }
                    }
                    // 초대 수락 후 워크스페이스 목록 갱신
                    const updated = await fetchUserWorkspaces(user.uid);
                    setWorkspaces(updated);
                }).catch(() => { });
            }

            // 백로그 정리 (fire-and-forget, UI 차단 없음)
            const ws = wsList[0];
            if (ws) {
                const lastCleanup = localStorage.getItem(`backlog_cleanup_${ws.id}`);
                const today = new Date().toISOString().split('T')[0];
                if (lastCleanup !== today) {
                    const settings = getBacklogSettings(ws.id);
                    if (settings.autoArchiveEnabled) {
                        autoArchiveStaleBacklog(ws.id, settings.archiveDaysThreshold).catch(() => { });
                    }
                    localStorage.setItem(`backlog_cleanup_${ws.id}`, today);
                }
            }
        };
        init();
    }, [user]);

    // 2. workspace 선택 시 → 멤버 + teamGroups + 프로젝트 + initiatives 병렬 로드
    useEffect(() => {
        if (!currentWorkspace || !user) return;
        const load = async () => {
            // ✅ 병렬 로드: 서로 독립적인 데이터를 동시에 가져옴
            const [members, tgs, inits, projs] = await Promise.all([
                fetchWorkspaceMembers(currentWorkspace.id),
                fetchTeamGroups(currentWorkspace.id),
                fetchInitiatives(currentWorkspace.id),
                fetchWorkspaceProjects(currentWorkspace.id),
            ]);

            setCurrentMembers(members);
            setTeamGroups(tgs);
            setCurrentTeamGroup(tgs[0] || null);
            setInitiatives(inits);

            // Projects: 없으면 기본 프로젝트 생성
            let finalProjs = projs;
            if (finalProjs.length === 0) {
                const p = await createProject('General', currentWorkspace.id, '#6366f1', user.uid);
                finalProjs = [p];
            }
            setProjects(finalProjs);
            setCurrentProject(finalProjs[0]);

            // Sprints: 프로젝트 ID에 의존하므로 프로젝트 이후 실행
            const allWsSprints = await fetchWorkspaceSprints(finalProjs.map(p => p.id));
            setAllWorkspaceSprints(allWsSprints);
            setWorkspaceReady(true);
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWorkspace?.id, user?.uid]);

    // 3. project 선택 시 → sprints 로드
    useEffect(() => {

        if (!currentProject?.id) { setSprints([]); setCurrentSprint(null); return; }
        const projectId = currentProject.id;
        const load = async () => {
            const sp = await fetchProjectSprints(projectId);
            setSprints(sp);
            const active = sp.find(s => s.status === 'active');
            setCurrentSprint(active ?? null);
        };
        load();
    }, [currentProject?.id]);

    // --- Actions ---
    const addWorkspace = useCallback(async (name: string, color: string, type: Workspace['type']) => {
        if (!user) throw new Error('Not authenticated');
        const ws = await createWorkspace(name, color, type, {
            uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL,
        });
        setWorkspaces(prev => [...prev, ws]);
        return ws;
    }, [user]);

    const refreshWorkspaces = useCallback(async () => {
        if (!user) return;
        const wsList = await fetchUserWorkspaces(user.uid);
        setWorkspaces(wsList);
    }, [user]);

    const updateWorkspaceConfig = useCallback(async (updates: Partial<Workspace>) => {
        if (!currentWorkspace) return;
        try {
            await updateWorkspaceInDB(currentWorkspace.id, updates);
            setCurrentWorkspace(prev => prev ? { ...prev, ...updates } : null);
            setWorkspaces(prev => prev.map(ws => ws.id === currentWorkspace.id ? { ...ws, ...updates } : ws));
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [currentWorkspace]);

    const addProject = useCallback(async (name: string, color: string, teamGroupId?: string, initiativeId?: string) => {
        if (!user || !currentWorkspace) throw new Error('No workspace');
        const p = await createProject(name, currentWorkspace.id, color, user.uid, teamGroupId, initiativeId);
        setProjects(prev => [...prev, p]);
        return p;
    }, [user, currentWorkspace]);

    const refreshProjects = useCallback(async () => {
        if (!currentWorkspace) return;
        const projs = await fetchWorkspaceProjects(currentWorkspace.id);
        setProjects(projs);
    }, [currentWorkspace]);

    const addSprint = useCallback(async (name: string, type: Sprint['type'] = 'sprint', startDate?: string, endDate?: string, parentId?: string, linkedSprintIds?: string[]) => {
        if (!currentProject) throw new Error('No project');
        const s = await createSprint(currentProject.id, name, type, sprints.length, startDate, endDate, parentId, linkedSprintIds);
        setSprints(prev => [...prev, s]);
        return s;
    }, [currentProject, sprints.length]);

    const getChildSprints = useCallback((parentId: string) => {
        return sprints.filter(s => s.parentId === parentId);
    }, [sprints]);

    const getLinkedSprints = useCallback((milestoneId: string) => {
        const milestone = sprints.find(s => s.id === milestoneId);
        if (!milestone?.linkedSprintIds) return [];
        return sprints.filter(s => milestone.linkedSprintIds!.includes(s.id));
    }, [sprints]);

    const updateCurrentSprint = useCallback(async (updates: Partial<Sprint>) => {
        if (!currentSprint) return;
        const prevSprint = currentSprint;
        // Optimistic update
        const updated = { ...currentSprint, ...updates };
        setCurrentSprint(updated);
        setSprints(prev => prev.map(s => s.id === updated.id ? updated : s));

        try {
            await updateSprintInDB(currentSprint.id, updates);
        } catch (e) {
            console.error(e);
            // Revert on failure
            setCurrentSprint(prevSprint);
            setSprints(prev => prev.map(s => s.id === prevSprint.id ? prevSprint : s));
        }
    }, [currentSprint]);

    const updateSprint = useCallback(async (id: string, updates: Partial<Sprint>) => {
        try {
            await updateSprintInDB(id, updates);
            setSprints(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            setAllWorkspaceSprints(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, []);

    const deleteSprint = useCallback(async (id: string) => {
        try {
            await deleteSprintInDB(id);
            setSprints(prev => prev.filter(s => s.id !== id));
            setAllWorkspaceSprints(prev => prev.filter(s => s.id !== id));
            if (currentSprint?.id === id) setCurrentSprint(null);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [currentSprint]);

    const refreshSprints = useCallback(async () => {
        if (!currentProject) return;
        const sp = await fetchProjectSprints(currentProject.id);
        setSprints(sp);
    }, [currentProject]);

    const refreshTeamGroups = useCallback(async () => {
        if (!currentWorkspace) return;
        const tgs = await fetchTeamGroups(currentWorkspace.id);
        setTeamGroups(tgs);
    }, [currentWorkspace]);

    const refreshMembers = useCallback(async () => {
        if (!currentWorkspace) return;
        const m = await fetchWorkspaceMembers(currentWorkspace.id);
        setCurrentMembers(m);
    }, [currentWorkspace]);

    const addInitiative = useCallback(async (name: string, description?: string, targetDate?: string, projectIds?: string[]) => {
        if (!user || !currentWorkspace) throw new Error("No user/workspace");
        const newInit = await createInitiative({
            name, description, targetDate, projectIds: projectIds || [],
            status: 'planned', color: '#3b82f6',
            workspaceId: currentWorkspace.id,
            createdBy: user.uid
        });
        setInitiatives(prev => [newInit, ...prev]);
        return newInit;
    }, [user, currentWorkspace]);

    const refreshInitiatives = useCallback(async () => {
        if (!currentWorkspace) return;
        const list = await fetchInitiatives(currentWorkspace.id);
        setInitiatives(list);
    }, [currentWorkspace]);

    const value: WorkspaceContextType = {
        workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace, refreshWorkspaces, updateWorkspaceConfig,
        teamGroups, currentTeamGroup, setCurrentTeamGroup, refreshTeamGroups,
        projects, currentProject, setCurrentProject, addProject, refreshProjects,
        sprints, allWorkspaceSprints, currentSprint, setCurrentSprint, addSprint, updateCurrentSprint, updateSprint, deleteSprint, refreshSprints,
        currentMembers, refreshMembers,
        scope, setScope,
        activeViewFilter, setActiveViewFilter, currentViewMode, setCurrentViewMode,
        getChildSprints, getLinkedSprints,
        initiatives, addInitiative, refreshInitiatives,
        workspaceReady,
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally co-located with provider
export const useWorkspace = (): WorkspaceContextType => {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
    return ctx;
};
