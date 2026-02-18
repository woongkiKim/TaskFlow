import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Workspace, TeamMember, TeamGroup, Project, Sprint, ViewFilter } from '../types';
import { createWorkspace, fetchUserWorkspaces, fetchWorkspaceMembers, fetchTeamGroups, joinWorkspaceByInvite } from '../services/workspaceService';
import { createProject, fetchWorkspaceProjects } from '../services/projectService';
import { fetchProjectSprints, createSprint, updateSprint as updateSprintInDB } from '../services/sprintService';
import { createInitiative, fetchInitiatives } from '../services/initiativeService';
import type { Initiative } from '../types';
import { checkPendingInvites, acceptInvite } from '../services/invitationService';


interface WorkspaceContextType {
    // Workspace
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    setCurrentWorkspace: (ws: Workspace) => void;
    addWorkspace: (name: string, color: string, type: Workspace['type']) => Promise<Workspace>;
    refreshWorkspaces: () => Promise<void>;

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
    currentSprint: Sprint | null;
    setCurrentSprint: (s: Sprint | null) => void;
    addSprint: (name: string, type?: Sprint['type'], startDate?: string, endDate?: string, parentId?: string, linkedSprintIds?: string[]) => Promise<Sprint>;
    updateCurrentSprint: (updates: Partial<Sprint>) => Promise<void>;
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
    currentViewMode: 'list' | 'board' | 'calendar' | 'table';
    setCurrentViewMode: (v: 'list' | 'board' | 'calendar' | 'table') => void;

    // Custom View filter
    activeViewFilter: ViewFilter | null;
    setActiveViewFilter: (f: ViewFilter | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
    const [currentTeamGroup, setCurrentTeamGroup] = useState<TeamGroup | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
    const [currentMembers, setCurrentMembers] = useState<TeamMember[]>([]);
    const [scope, setScope] = useState<'mine' | 'all'>('mine');
    const [currentViewMode, setCurrentViewMode] = useState<'list' | 'board' | 'calendar' | 'table'>('list');
    const [activeViewFilter, setActiveViewFilter] = useState<ViewFilter | null>(null);
    const [initiatives, setInitiatives] = useState<Initiative[]>([]);

    // 1. 워크스페이스 로드 + 자동 생성
    useEffect(() => {
        if (!user) return;
        const init = async () => {
            let wsList = await fetchUserWorkspaces(user.uid);

            // 자동 이메일 초대 수락
            if (user.email) {
                const pendingInvites = await checkPendingInvites(user.email);
                for (const invite of pendingInvites) {
                    try {
                        await joinWorkspaceByInvite(invite.workspaceId, { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL });
                        await acceptInvite(invite.id);
                    } catch { /* 이미 참여 중이거나 실패 시 무시 */ }
                }
                if (pendingInvites.length > 0) wsList = await fetchUserWorkspaces(user.uid);
            }

            // 처음이면 기본 workspace 생성
            if (wsList.length === 0) {
                const ws = await createWorkspace('My Workspace', '#6366f1', 'personal', {
                    uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL,
                });
                wsList = [ws];
            }

            setWorkspaces(wsList);
            setCurrentWorkspace(wsList[0]);
        };
        init();
    }, [user]);

    // 2. workspace 선택 시 → 멤버 + teamGroups + 프로젝트 로드
    useEffect(() => {
        if (!currentWorkspace || !user) return;
        const load = async () => {
            const members = await fetchWorkspaceMembers(currentWorkspace.id);
            setCurrentMembers(members);

            // Team groups (all workspace types)
            const tgs = await fetchTeamGroups(currentWorkspace.id);
            setTeamGroups(tgs);
            setCurrentTeamGroup(tgs[0] || null);

            // Initiatives
            const inits = await fetchInitiatives(currentWorkspace.id);
            setInitiatives(inits);


            // Projects
            let projs = await fetchWorkspaceProjects(currentWorkspace.id);
            if (projs.length === 0) {
                const p = await createProject('General', currentWorkspace.id, '#6366f1', user.uid);
                projs = [p];
            }
            setProjects(projs);
            setCurrentProject(projs[0]);
        };
        load();
    }, [currentWorkspace, user]);

    // 3. project 선택 시 → sprints 로드
    useEffect(() => {
        if (!currentProject) { setSprints([]); setCurrentSprint(null); return; }
        const load = async () => {
            const sp = await fetchProjectSprints(currentProject.id);
            setSprints(sp);
            const active = sp.find(s => s.status === 'active');
            setCurrentSprint(active || null);
        };
        load();
    }, [currentProject]);

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
        workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace, refreshWorkspaces,
        teamGroups, currentTeamGroup, setCurrentTeamGroup, refreshTeamGroups,
        projects, currentProject, setCurrentProject, addProject, refreshProjects,
        sprints, currentSprint, setCurrentSprint, addSprint, updateCurrentSprint, refreshSprints,
        currentMembers, refreshMembers,
        scope, setScope,
        activeViewFilter, setActiveViewFilter, currentViewMode, setCurrentViewMode,
        getChildSprints, getLinkedSprints,
        initiatives, addInitiative, refreshInitiatives,
    };

    return (
        <WorkspaceContext.Provider value={value}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = (): WorkspaceContextType => {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
    return ctx;
};
