import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
    Box, Typography, Paper, List, ListItem, ListItemAvatar, ListItemText,
    Avatar, Chip, IconButton, Tooltip, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider,
    ToggleButtonGroup, ToggleButton, Select, MenuItem, FormControl, AvatarGroup,
    InputLabel, Checkbox, FormControlLabel,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import EditIcon from '@mui/icons-material/Edit';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FlagIcon from '@mui/icons-material/Flag';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { regenerateInviteCode, createTeamGroup, assignMemberToTeam, removeMemberFromTeam, updateMemberRole } from '../services/workspaceService';
import { deleteProject } from '../services/projectService';
import { deleteSprint, updateSprint } from '../services/sprintService';
import type { Sprint } from '../types';
import { PROJECT_COLORS, TG_COLORS } from '../constants/colors';
import ConfirmDialog from '../components/ConfirmDialog';
import InviteDialog from '../components/InviteDialog';
import IssueTemplateDialog from '../components/IssueTemplateDialog';
import { fetchAutomationRules, createAutomationRule, deleteAutomationRule, toggleAutomationRule } from '../services/automationService';
import { fetchIssueTemplates, createIssueTemplate, updateIssueTemplate, deleteIssueTemplate } from '../services/issueTemplateService';
import type { AutomationRule, AutomationAction, IssueTemplate } from '../types';
import { STATUS_CONFIG } from '../types';
import { useAuth } from '../contexts/AuthContext';
import AutomationIcon from '@mui/icons-material/SmartToy';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import {
  getWeeklyPlannerPreferences,
  setWeeklyPlannerPreferences,
  DEFAULT_WEEKLY_PLANNER_PREFERENCES,
  type WeeklyPlannerPreferences,
} from '../utils/plannerPreferences';
import HelpTooltip from '../components/HelpTooltip';


const TeamSettings = () => {
    const { t, lang } = useLanguage();
    const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);
    const { user } = useAuth();
    const {
        currentWorkspace, currentMembers, projects, sprints,
        addProject, addSprint, refreshProjects, refreshSprints,
        teamGroups, refreshTeamGroups, refreshMembers,
    } = useWorkspace();

    const [createProjectOpen, setCreateProjectOpen] = useState(false);
    const [createSprintOpen, setCreateSprintOpen] = useState(false);
    const [createTGOpen, setCreateTGOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
    const [newSprintName, setNewSprintName] = useState('');
    const [newSprintType, setNewSprintType] = useState<'sprint' | 'phase' | 'milestone'>('sprint');
    const [newSprintStartDate, setNewSprintStartDate] = useState('');
    const [newSprintEndDate, setNewSprintEndDate] = useState('');
    const [newTGName, setNewTGName] = useState('');
    const [newTGColor, setNewTGColor] = useState(TG_COLORS[0]);
    const [inviteCode, setInviteCode] = useState(currentWorkspace?.inviteCode || '');
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'sprint'; id: string } | null>(null);

    // Automation state
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
    const [createRuleOpen, setCreateRuleOpen] = useState(false);
    const [newRuleName, setNewRuleName] = useState('');
    const [newRuleTriggerTo, setNewRuleTriggerTo] = useState('done');
    const [newRuleActionType, setNewRuleActionType] = useState<'assign_user' | 'add_label' | 'set_priority'>('assign_user');
    const [newRuleActionValue, setNewRuleActionValue] = useState('');
    const [newRuleActionLabel, setNewRuleActionLabel] = useState('');

    // Load automation rules
    useEffect(() => {
        if (!currentWorkspace) return;
        fetchAutomationRules(currentWorkspace.id).then(setAutomationRules);
    }, [currentWorkspace]);

    // Issue Templates State
    const [templates, setTemplates] = useState<IssueTemplate[]>([]);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<IssueTemplate | null>(null);
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

    useEffect(() => {
        if (!currentWorkspace) return;
        fetchIssueTemplates(currentWorkspace.id).then(setTemplates);
    }, [currentWorkspace]);

    // Weekly Planner Preferences
    const [plannerPrefs, setPlannerPrefs] = useState<WeeklyPlannerPreferences>(
        getWeeklyPlannerPreferences(user?.uid)
    );
    useEffect(() => {
        setPlannerPrefs(getWeeklyPlannerPreferences(user?.uid));
    }, [user?.uid]);
    const savePlannerPrefs = (next: WeeklyPlannerPreferences) => {
        setWeeklyPlannerPreferences(user?.uid, next);
        setPlannerPrefs(next);
    };
    const weekDayOrder = plannerPrefs.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const dayNames = [
        textByLang('Sun', '일'), textByLang('Mon', '월'), textByLang('Tue', '화'),
        textByLang('Wed', '수'), textByLang('Thu', '목'), textByLang('Fri', '금'), textByLang('Sat', '토'),
    ];

    const handleSaveTemplate = async (data: Partial<IssueTemplate>) => {
        if (!currentWorkspace || !user) return;
        try {
            if (editingTemplate) {
                await updateIssueTemplate(editingTemplate.id, data);
                setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...data } as IssueTemplate : t));
            } else {
                const created = await createIssueTemplate({ ...data, workspaceId: currentWorkspace.id } as Omit<IssueTemplate, 'id' | 'createdAt'>);
                setTemplates(prev => [...prev, created]);
            }
            setTemplateDialogOpen(false);
            setEditingTemplate(null);
            toast.success(textByLang('Template saved', '템플릿이 저장되었습니다'));
        } catch (e) {
            console.error(e);
            toast.error(textByLang('Failed to save template', '템플릿 저장에 실패했습니다'));
        }
    };

    const handleDeleteTemplate = (id: string) => {
        setDeleteTemplateId(id);
    };

    const confirmDeleteTemplate = async () => {
        if (!deleteTemplateId) return;
        try {
            await deleteIssueTemplate(deleteTemplateId);
            setTemplates(prev => prev.filter(t => t.id !== deleteTemplateId));
            toast.success(textByLang('Template deleted', '템플릿이 삭제되었습니다'));
        } catch (e) {
            console.error(e);
            toast.error(textByLang('Failed to delete template', '템플릿 삭제에 실패했습니다'));
        }
        setDeleteTemplateId(null);
    };

    const handleCreateAutomation = async () => {
        if (!currentWorkspace || !newRuleName.trim()) return;
        const actions: AutomationAction[] = [{
            type: newRuleActionType,
            ...(newRuleActionType === 'assign_user' ? { userId: newRuleActionValue, userName: newRuleActionLabel } : {}),
            ...(newRuleActionType === 'add_label' ? { label: newRuleActionValue } : {}),
            ...(newRuleActionType === 'set_priority' ? { priority: newRuleActionValue as 'low' | 'medium' | 'high' | 'urgent' } : {}),
        }];
        const rule = await createAutomationRule({
            workspaceId: currentWorkspace.id,
            name: newRuleName,
            trigger: { type: 'status_change', to: newRuleTriggerTo },
            actions,
            isEnabled: true,
        });
        setAutomationRules(prev => [...prev, rule]);
        setCreateRuleOpen(false);
        setNewRuleName('');
        toast.success(textByLang('Automation created', '자동화 규칙이 생성되었습니다'));
    };

    const myRole = currentMembers.find(m => m.uid === user?.uid)?.role || 'member';
    const canManageRoles = myRole === 'owner' || myRole === 'admin';

    // Edit sprint state
    const [editSprint, setEditSprint] = useState<Sprint | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState<'sprint' | 'phase' | 'milestone'>('sprint');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editParentId, setEditParentId] = useState('');
    const [editLinkedIds, setEditLinkedIds] = useState<string[]>([]);

    const copyCode = () => { navigator.clipboard.writeText(inviteCode); toast.success(t('copied') as string); };

    const handleRegenerateCode = async () => {
        if (!currentWorkspace) return;
        const newCode = await regenerateInviteCode(currentWorkspace.id);
        setInviteCode(newCode);
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        await addProject(newProjectName.trim(), newProjectColor);
        setCreateProjectOpen(false); setNewProjectName('');
    };

    const handleDeleteProject = async (id: string) => {
        setDeleteTarget({ type: 'project', id });
    };

    const handleCreateSprint = async () => {
        if (!newSprintName.trim()) return;
        const startDate = newSprintType === 'milestone' ? undefined : (newSprintStartDate || undefined);
        const endDate = newSprintType === 'milestone' ? (newSprintEndDate || undefined) : (newSprintEndDate || undefined);
        await addSprint(newSprintName.trim(), newSprintType, startDate, endDate);
        setCreateSprintOpen(false); setNewSprintName(''); setNewSprintStartDate(''); setNewSprintEndDate('');
    };

    const handleDeleteSprint = async (id: string) => {
        setDeleteTarget({ type: 'sprint', id });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === 'project') {
            await deleteProject(deleteTarget.id); await refreshProjects();
        } else {
            await deleteSprint(deleteTarget.id); await refreshSprints();
        }
        setDeleteTarget(null);
    };

    const handleToggleSprintStatus = async (id: string, currentStatus: string) => {
        const next = currentStatus === 'planning' ? 'active' : currentStatus === 'active' ? 'completed' : 'planning';
        await updateSprint(id, { status: next as 'planning' | 'active' | 'completed' });
        await refreshSprints();
    };

    const openEditSprint = (sp: Sprint) => {
        setEditSprint(sp);
        setEditName(sp.name);
        setEditType(sp.type);
        setEditStartDate(sp.startDate || '');
        setEditEndDate(sp.endDate || '');
        setEditParentId(sp.parentId || '');
        setEditLinkedIds(sp.linkedSprintIds || []);
    };

    const handleSaveEditSprint = async () => {
        if (!editSprint || !editName.trim()) return;
        try {
            const updates: Partial<Sprint> = {
                name: editName.trim(),
                type: editType,
                startDate: editType === 'milestone' ? undefined : (editStartDate || undefined),
                endDate: editEndDate || undefined,
                parentId: editType === 'sprint' && editParentId ? editParentId : undefined,
                linkedSprintIds: editType === 'milestone' && editLinkedIds.length > 0 ? editLinkedIds : undefined,
            };
            await updateSprint(editSprint.id, updates);
            await refreshSprints();
            setEditSprint(null);
            toast.success('Updated!');
        } catch (e) {
            console.error(e);
            toast.error('Failed to update');
        }
    };

    const handleCreateTG = async () => {
        if (!newTGName.trim() || !currentWorkspace) return;
        await createTeamGroup(currentWorkspace.id, newTGName.trim(), newTGColor);
        await refreshTeamGroups();
        setCreateTGOpen(false); setNewTGName('');
    };

    const handleAssignTeam = async (memberUid: string, newTeamId: string) => {
        // Remove from old team(s)
        for (const tg of teamGroups) {
            if (tg.memberIds?.includes(memberUid)) {
                await removeMemberFromTeam(tg.id, memberUid);
            }
        }
        // Assign to new team (if not 'none')
        if (newTeamId !== 'none') {
            await assignMemberToTeam(newTeamId, memberUid);
        }
        await refreshTeamGroups();
    };

    const getMemberTeam = (uid: string) => {
        const tg = teamGroups.find(g => g.memberIds?.includes(uid));
        return tg?.id || 'none';
    };

    if (!currentWorkspace) {
        return <Box sx={{ p: 3 }}><Typography>{t('noTeamSelected') as string}</Typography></Box>;
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: currentWorkspace.color, fontSize: 24, fontWeight: 700 }}>
                    {currentWorkspace.name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={700}>{currentWorkspace.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={currentWorkspace.type} size="small" sx={{ fontWeight: 600 }} />
                        <Typography variant="body2" color="text.secondary">{currentMembers.length} {t('members') as string}</Typography>
                    </Box>
                </Box>
                <Button variant="outlined" onClick={() => setInviteOpen(true)} sx={{ borderRadius: 2, fontWeight: 600 }}>
                    {t('inviteMembers') as string}
                </Button>
            </Box>

            {/* Invite Code */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{t('inviteCode') as string}<HelpTooltip title={textByLang('Invite Code', '초대 코드')} description={textByLang('Share this code with teammates so they can join your workspace. You can regenerate it anytime for security.', '이 코드를 팀원에게 공유하면 워크스페이스에 참여할 수 있습니다. 보안을 위해 언제든 코드를 재발급할 수 있습니다.')} /></Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('inviteCodeDesc') as string}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'grey.100', p: 2, borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 6, fontFamily: 'monospace', flex: 1 }}>{inviteCode}</Typography>
                    <Tooltip title={t('copyCode') as string}><IconButton onClick={copyCode}><ContentCopyIcon /></IconButton></Tooltip>
                    <Tooltip title={t('regenerateCode') as string}><IconButton onClick={handleRegenerateCode}><RefreshIcon /></IconButton></Tooltip>
                </Box>
            </Paper>

            {/* Members */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>{t('members') as string}<HelpTooltip title={textByLang('Members', '멤버')} description={textByLang('Manage workspace members. Assign them to teams and change their roles (Admin/Member). Admins can manage settings and members.', '워크스페이스 멤버를 관리합니다. 팀에 배정하고 역할(관리자/멤버)을 변경할 수 있습니다. 관리자는 설정과 멤버를 관리할 수 있습니다.')} /></Typography>
                <List disablePadding>
                    {currentMembers.map((m, i) => (
                        <Box key={m.uid}>
                            <ListItem sx={{ px: 0 }}>
                                <ListItemAvatar><Avatar src={m.photoURL} sx={{ bgcolor: 'primary.main' }}>{m.displayName.charAt(0)}</Avatar></ListItemAvatar>
                                <ListItemText primary={<Typography fontWeight={600}>{m.displayName}</Typography>} secondary={m.email} />
                                <FormControl size="small" sx={{ minWidth: 120, mr: 1 }}>
                                    <Select
                                        value={getMemberTeam(m.uid)}
                                        onChange={e => handleAssignTeam(m.uid, e.target.value)}
                                        sx={{
                                            fontSize: '0.8rem', height: 32,
                                            '& .MuiSelect-select': { py: 0.5 },
                                        }}
                                    >
                                        <MenuItem value="none" sx={{ fontSize: '0.8rem' }}>
                                            <em>No Team</em>
                                        </MenuItem>
                                        {teamGroups.map(tg => (
                                            <MenuItem key={tg.id} value={tg.id} sx={{ fontSize: '0.8rem' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tg.color }} />
                                                    {tg.name}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                {canManageRoles && m.role !== 'owner' ? (
                                    <FormControl size="small" sx={{ minWidth: 90 }}>
                                        <Select value={m.role}
                                            onChange={async (e) => {
                                                await updateMemberRole(currentWorkspace!.id, m.uid, e.target.value as 'admin' | 'member');
                                                await refreshMembers();
                                            }}
                                            sx={{ fontSize: '0.75rem', height: 28, '& .MuiSelect-select': { py: 0.3 } }}>
                                            <MenuItem value="admin" sx={{ fontSize: '0.75rem' }}>{t('admin') as string}</MenuItem>
                                            <MenuItem value="member" sx={{ fontSize: '0.75rem' }}>{t('member') as string}</MenuItem>
                                        </Select>
                                    </FormControl>
                                ) : (
                                    <Chip label={m.role === 'owner' ? t('owner') as string : m.role === 'admin' ? t('admin') as string : t('member') as string}
                                        size="small" color={m.role === 'owner' ? 'primary' : 'default'} sx={{ fontWeight: 600 }} />
                                )}
                            </ListItem>
                            {i < currentMembers.length - 1 && <Divider />}
                        </Box>
                    ))}
                </List>
            </Paper>

            {/* Team Groups */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{t('teamGroups') as string}<HelpTooltip title={textByLang('Team Groups', '팀 그룹')} description={textByLang('Organize members into sub-teams like Frontend, Backend, Design, etc. Useful for filtering tasks and targeted notifications.', '프론트엔드, 백엔드, 디자인 등 하위 팀으로 멤버를 조직합니다. 작업 필터링과 알림 대상 지정에 유용합니다.')} /></Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateTGOpen(true)} sx={{ fontWeight: 600 }}>
                        {t('createTeamGroup') as string}
                    </Button>
                </Box>
                <List disablePadding>
                    {teamGroups.map((tg, i) => {
                        const tgMembers = currentMembers.filter(m => tg.memberIds?.includes(m.uid));
                        return (
                            <Box key={tg.id}>
                                <ListItem sx={{ px: 0 }}>
                                    <ListItemAvatar><Avatar sx={{ bgcolor: tg.color + '25', color: tg.color }}>{tg.name.charAt(0)}</Avatar></ListItemAvatar>
                                    <ListItemText
                                        primary={<Typography fontWeight={600}>{tg.name}</Typography>}
                                        secondary={`${tgMembers.length} members`}
                                    />
                                    {tgMembers.length > 0 && (
                                        <AvatarGroup max={5} sx={{ mr: 1, '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.7rem' } }}>
                                            {tgMembers.map(m => (
                                                <Tooltip key={m.uid} title={m.displayName}>
                                                    <Avatar src={m.photoURL} sx={{ bgcolor: tg.color }}>{m.displayName.charAt(0)}</Avatar>
                                                </Tooltip>
                                            ))}
                                        </AvatarGroup>
                                    )}
                                </ListItem>
                                {i < teamGroups.length - 1 && <Divider />}
                            </Box>
                        );
                    })}
                    {teamGroups.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No team groups yet</Typography>
                    )}
                </List>
            </Paper>

            {/* Projects */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{t('projects') as string}<HelpTooltip title={textByLang('Projects', '프로젝트')} description={textByLang('Projects are containers for your tasks. Each project has its own board, sprints, and settings. Create one for each major initiative.', '프로젝트는 작업의 컨테이너입니다. 각 프로젝트에는 고유한 보드, 스프린트, 설정이 있습니다. 주요 이니셔티브마다 하나씩 만드세요.')} /></Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateProjectOpen(true)} sx={{ fontWeight: 600 }}>
                        {t('createProject') as string}
                    </Button>
                </Box>
                <List disablePadding>
                    {projects.map((proj, i) => (
                        <Box key={proj.id}>
                            <ListItem sx={{ px: 0 }}>
                                <ListItemAvatar><Avatar sx={{ bgcolor: proj.color + '25', color: proj.color }}><FolderIcon /></Avatar></ListItemAvatar>
                                <ListItemText primary={<Typography fontWeight={600}>{proj.name}</Typography>} secondary={proj.createdAt.split(' ')[0]} />
                                {projects.length > 1 && (
                                    <Tooltip title={t('deleteProject') as string}><IconButton size="small" onClick={() => handleDeleteProject(proj.id)}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                )}
                            </ListItem>
                            {i < projects.length - 1 && <Divider />}
                        </Box>
                    ))}
                </List>
            </Paper>

            {/* Sprints */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{t('sprints') as string}<HelpTooltip title={textByLang('Sprints & Iterations', '스프린트 & 이터레이션')} description={textByLang('Use Sprints for time-boxed work (1-2 weeks), Phases for larger groupings, and Milestones for deadline targets. Click status chips to cycle through planning → active → completed.', '스프린트는 시간 제한 작업(1-2주), 페이즈는 더 큰 그룹화, 마일스톤은 데드라인 목표에 사용합니다. 상태 칩을 클릭하면 계획 → 활성 → 완료를 순환합니다.')} /></Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateSprintOpen(true)} sx={{ fontWeight: 600 }}>
                        {t('createSprint') as string}
                    </Button>
                </Box>
                <List disablePadding>
                    {(() => {
                        const phases = sprints.filter(s => s.type === 'phase');
                        const topLevelSprints = sprints.filter(s => s.type === 'sprint' && !s.parentId);
                        const milestones = sprints.filter(s => s.type === 'milestone');
                        const childSprintsByPhase = (phaseId: string) => sprints.filter(s => s.type === 'sprint' && s.parentId === phaseId);

                        const renderSprintItem = (sp: typeof sprints[0], indent: boolean = false) => {
                            const icon = sp.type === 'milestone' ? <FlagIcon sx={{ fontSize: 20 }} />
                                : sp.type === 'phase' ? <ListAltIcon sx={{ fontSize: 20 }} />
                                    : <RocketLaunchIcon sx={{ fontSize: 20 }} />;
                            const avatarColor = sp.type === 'milestone'
                                ? (sp.status === 'active' ? 'error.main' : sp.status === 'completed' ? 'success.main' : 'grey.300')
                                : sp.type === 'phase'
                                    ? (sp.status === 'active' ? 'success.main' : sp.status === 'completed' ? 'success.main' : 'grey.300')
                                    : (sp.status === 'active' ? 'primary.main' : sp.status === 'completed' ? 'success.main' : 'grey.300');
                            const dateStr = sp.type === 'milestone'
                                ? (sp.endDate ? `${t('targetDate') as string}: ${sp.endDate}` : '')
                                : (sp.startDate && sp.endDate ? `${sp.startDate} ~ ${sp.endDate}` : '');
                            const typeLabel = sp.type === 'milestone' ? '\ud83c\udfaf Milestone' : sp.type === 'phase' ? '\ud83d\udccb Phase' : '\ud83d\ude80 Sprint';

                            // Show parent info for child sprints
                            const parentPhase = sp.parentId ? sprints.find(s => s.id === sp.parentId) : null;
                            const parentInfo = parentPhase ? ` \u2022 \u2190 ${parentPhase.name}` : '';

                            // Show linked sprints for milestones
                            const linkedNames = sp.linkedSprintIds?.map(lid => sprints.find(s => s.id === lid)?.name).filter(Boolean).join(', ');
                            const linkedInfo = linkedNames ? ` \u2022 \ud83d\udd17 ${linkedNames}` : '';

                            const secondary = `${typeLabel}${dateStr ? ` \u2022 ${dateStr}` : ''}${parentInfo}${linkedInfo}`;

                            return (
                                <ListItem key={sp.id} sx={{ px: 0, pl: indent ? 4 : 0 }}>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: avatarColor, width: indent ? 32 : 40, height: indent ? 32 : 40 }}>
                                            {icon}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={<Typography fontWeight={600} fontSize={indent ? '0.9rem' : undefined}>{sp.name}</Typography>}
                                        secondary={secondary}
                                    />
                                    <Chip label={sp.status} size="small" onClick={() => handleToggleSprintStatus(sp.id, sp.status)}
                                        sx={{
                                            cursor: 'pointer', fontWeight: 600, mr: 1,
                                            bgcolor: sp.status === 'active' ? (sp.type === 'milestone' ? 'error.main' : sp.type === 'phase' ? 'success.main' : 'primary.main') : sp.status === 'completed' ? 'success.main' : 'grey.200',
                                            color: sp.status === 'planning' ? 'text.primary' : 'white'
                                        }} />
                                    <Tooltip title={t('deleteSprint') as string}>
                                        <IconButton size="small" onClick={() => handleDeleteSprint(sp.id)}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('editIteration') as string}>
                                        <IconButton size="small" onClick={() => openEditSprint(sp)}><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                                    </Tooltip>
                                </ListItem>
                            );
                        };

                        return (
                            <>
                                {phases.map((phase, i) => (
                                    <Box key={phase.id}>
                                        {renderSprintItem(phase)}
                                        {childSprintsByPhase(phase.id).map(child => renderSprintItem(child, true))}
                                        {(i < phases.length - 1 || topLevelSprints.length > 0 || milestones.length > 0) && <Divider />}
                                    </Box>
                                ))}
                                {topLevelSprints.map((sp, i) => (
                                    <Box key={sp.id}>
                                        {renderSprintItem(sp)}
                                        {(i < topLevelSprints.length - 1 || milestones.length > 0) && <Divider />}
                                    </Box>
                                ))}
                                {milestones.map((ms, i) => (
                                    <Box key={ms.id}>
                                        {renderSprintItem(ms)}
                                        {i < milestones.length - 1 && <Divider />}
                                    </Box>
                                ))}
                            </>
                        );
                    })()}
                    {sprints.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>{t('noSprints') as string}</Typography>
                    )}
                </List>
            </Paper>

            {/* Automation Rules */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutomationIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle1" fontWeight={700}>{textByLang('Automation Rules', '자동화 규칙')}</Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateRuleOpen(true)} sx={{ fontWeight: 600 }}>
                        {textByLang('Add Rule', '규칙 추가')}
                    </Button>
                </Box>
                {automationRules.map(rule => (
                    <Box key={rule.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2, mb: 1, bgcolor: 'action.hover' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={600} fontSize="0.85rem">{rule.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {textByLang('When status → ', '상태 → ')}{rule.trigger.to}
                            </Typography>
                        </Box>
                        <Chip label={rule.isEnabled ? textByLang('Active', '활성') : textByLang('Disabled', '비활성')}
                            size="small" color={rule.isEnabled ? 'success' : 'default'}
                            onClick={() => toggleAutomationRule(rule.id, !rule.isEnabled).then(() =>
                                setAutomationRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r))
                            )} sx={{ cursor: 'pointer', fontWeight: 600 }} />
                        <IconButton size="small" onClick={() => deleteAutomationRule(rule.id).then(() =>
                            setAutomationRules(prev => prev.filter(r => r.id !== rule.id))
                        )}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                    </Box>
                ))}
                {automationRules.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {textByLang('No automation rules yet', '아직 자동화 규칙이 없습니다')}
                    </Typography>
                )}
            </Paper>

            {/* Issue Templates */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ListAltIcon sx={{ color: 'primary.main' }} />
                        <Typography variant="subtitle1" fontWeight={700}>{textByLang('Issue Templates', '이슈 템플릿')}</Typography>
                    </Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }} sx={{ fontWeight: 600 }}>
                        {textByLang('Add Template', '템플릿 추가')}
                    </Button>
                </Box>
                {templates.map(tmpl => (
                    <Box key={tmpl.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2, mb: 1, bgcolor: 'action.hover' }}>
                        <Typography fontSize="1.2rem">{tmpl.icon || '📋'}</Typography>
                        <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={600} fontSize="0.85rem">{tmpl.name}</Typography>
                            {tmpl.description && <Typography variant="caption" color="text.secondary">{tmpl.description}</Typography>}
                        </Box>
                        <IconButton size="small" onClick={() => { setEditingTemplate(tmpl); setTemplateDialogOpen(true); }}>
                            <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteTemplate(tmpl.id)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Box>
                ))}
                {templates.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        {textByLang('No templates yet', '아직 템플릿이 없습니다')}
                    </Typography>
                )}
            </Paper>

            {/* Weekly Planner Preferences */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CalendarMonthIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight={700}>{textByLang('Weekly Planner', '주간 플래너')}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{textByLang('Week Starts On', '주 시작요일')}</Typography>
                    <ToggleButtonGroup value={plannerPrefs.weekStartsOn} exclusive
                        onChange={(_, v) => { if (v !== null) savePlannerPrefs({ ...plannerPrefs, weekStartsOn: v }); }}
                        size="small" sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' } }}>
                        <ToggleButton value={0}>{textByLang('Sunday', '일요일')}</ToggleButton>
                        <ToggleButton value={1}>{textByLang('Monday', '월요일')}</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>{textByLang('Visible Days', '표시 요일')}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {weekDayOrder.map(d => (
                            <Chip key={d} label={dayNames[d]} size="small"
                                color={plannerPrefs.visibleDays.includes(d) ? 'primary' : 'default'}
                                onClick={() => {
                                    const next = plannerPrefs.visibleDays.includes(d)
                                        ? plannerPrefs.visibleDays.filter(x => x !== d)
                                        : [...plannerPrefs.visibleDays, d].sort((a, b) => a - b);
                                    if (next.length > 0) savePlannerPrefs({ ...plannerPrefs, visibleDays: next });
                                }}
                                sx={{ cursor: 'pointer', fontWeight: 600, minWidth: 44 }} />
                        ))}
                    </Box>
                </Box>
            </Paper>

            {/* === DIALOGS === */}
            {/* Create Project */}
            <Dialog open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{t('createProject') as string}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth label={t('projectName') as string} value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProject()} sx={{ mt: 1, mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {PROJECT_COLORS.map(c => <Box key={c} onClick={() => setNewProjectColor(c)} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: newProjectColor === c ? '3px solid' : '2px solid transparent', borderColor: newProjectColor === c ? 'text.primary' : 'transparent' }} />)}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateProjectOpen(false)}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={handleCreateProject} disabled={!newProjectName.trim()}>{t('save') as string}</Button>
                </DialogActions>
            </Dialog>

            {/* Create Iteration */}
            <Dialog open={createSprintOpen} onClose={() => { setCreateSprintOpen(false); setNewSprintStartDate(''); setNewSprintEndDate(''); }} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{t('createSprint') as string}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth label={t('sprintName') as string} value={newSprintName}
                        onChange={e => setNewSprintName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSprint()} sx={{ mt: 1, mb: 2 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('sprintType') as string}</Typography>
                    <ToggleButtonGroup value={newSprintType} exclusive onChange={(_, v) => { if (v) { setNewSprintType(v as 'sprint' | 'phase' | 'milestone'); setNewSprintStartDate(''); setNewSprintEndDate(''); } }} size="small" fullWidth
                        sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' } }}>
                        <ToggleButton value="sprint">🏃 Sprint</ToggleButton>
                        <ToggleButton value="phase">📋 Phase</ToggleButton>
                        <ToggleButton value="milestone">🎯 Milestone</ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 1.5, minHeight: 20, fontSize: '0.8rem', lineHeight: 1.5 }}>
                        {newSprintType === 'sprint' && (t('sprintDesc') as string)}
                        {newSprintType === 'phase' && (t('phaseDesc') as string)}
                        {newSprintType === 'milestone' && (t('milestoneDesc') as string)}
                    </Typography>
                    {/* Date fields based on type */}
                    {newSprintType === 'milestone' ? (
                        <TextField fullWidth type="date" label={t('targetDate') as string} value={newSprintEndDate}
                            onChange={e => setNewSprintEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} />
                    ) : (
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                            <TextField fullWidth type="date" label={t('startDate') as string} value={newSprintStartDate}
                                onChange={e => setNewSprintStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                            <TextField fullWidth type="date" label={t('endDate') as string} value={newSprintEndDate}
                                onChange={e => setNewSprintEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCreateSprintOpen(false); setNewSprintStartDate(''); setNewSprintEndDate(''); }}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={handleCreateSprint} disabled={!newSprintName.trim()}>{t('save') as string}</Button>
                </DialogActions>
            </Dialog>

            {/* Create Team Group */}
            <Dialog open={createTGOpen} onClose={() => setCreateTGOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{t('createTeamGroup') as string}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth label={t('teamGroupName') as string} value={newTGName}
                        onChange={e => setNewTGName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateTG()} sx={{ mt: 1, mb: 2 }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {TG_COLORS.map(c => <Box key={c} onClick={() => setNewTGColor(c)} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: newTGColor === c ? '3px solid' : '2px solid transparent', borderColor: newTGColor === c ? 'text.primary' : 'transparent' }} />)}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateTGOpen(false)}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={handleCreateTG} disabled={!newTGName.trim()}>{t('save') as string}</Button>
                </DialogActions>
            </Dialog>

            {/* Invite Dialog */}
            <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={deleteTarget?.type === 'project' ? t('confirmDeleteProject') as string : t('confirmDeleteSprint') as string}
                message={deleteTarget?.type === 'project'
                    ? (t('confirmDeleteProject') as string)
                    : (t('confirmDeleteSprint') as string)}
                confirmLabel={t('delete') as string}
                cancelLabel={t('cancel') as string}
            />

            {/* Delete Template Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteTemplateId}
                onClose={() => setDeleteTemplateId(null)}
                onConfirm={confirmDeleteTemplate}
                title={textByLang('Delete Template', '템플릿 삭제')}
                message={textByLang('Delete this template? This action cannot be undone.', '이 템플릿을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')}
                confirmLabel={t('delete') as string}
                cancelLabel={t('cancel') as string}
            />

            {/* Issue Template Dialog */}
            <IssueTemplateDialog
                open={templateDialogOpen}
                onClose={() => { setTemplateDialogOpen(false); setEditingTemplate(null); }}
                onSave={handleSaveTemplate}
                editTemplate={editingTemplate}
            />

            {/* Create Automation Rule Dialog */}
            <Dialog open={createRuleOpen} onClose={() => setCreateRuleOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{textByLang('Create Automation Rule', '자동화 규칙 생성')}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth label={textByLang('Rule Name', '규칙 이름')} value={newRuleName}
                        onChange={e => setNewRuleName(e.target.value)} sx={{ mt: 1, mb: 2 }} />
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>{textByLang('When status changes to', '상태 변경 시')}</InputLabel>
                        <Select value={newRuleTriggerTo} label={textByLang('When status changes to', '상태 변경 시')}
                            onChange={e => setNewRuleTriggerTo(e.target.value)}>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>{textByLang('Action Type', '액션 유형')}</InputLabel>
                        <Select value={newRuleActionType} label={textByLang('Action Type', '액션 유형')}
                            onChange={e => setNewRuleActionType(e.target.value as typeof newRuleActionType)}>
                            <MenuItem value="assign_user">{textByLang('Assign User', '담당자 지정')}</MenuItem>
                            <MenuItem value="add_label">{textByLang('Add Label', '레이블 추가')}</MenuItem>
                            <MenuItem value="set_priority">{textByLang('Set Priority', '우선순위 설정')}</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField fullWidth size="small" label={textByLang('Value', '값')} value={newRuleActionValue}
                        onChange={e => setNewRuleActionValue(e.target.value)} sx={{ mb: 1 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateRuleOpen(false)}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={handleCreateAutomation} disabled={!newRuleName.trim()}>{t('save') as string}</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Sprint Dialog */}
            <Dialog open={!!editSprint} onClose={() => setEditSprint(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>{t('editIteration') as string}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus fullWidth label={t('sprintName') as string} value={editName}
                        onChange={(e) => setEditName(e.target.value)} sx={{ mt: 1, mb: 2 }} />

                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('sprintType') as string}</Typography>
                    <ToggleButtonGroup value={editType} exclusive onChange={(_, v) => { if (v) setEditType(v as 'sprint' | 'phase' | 'milestone'); }} size="small" fullWidth
                        sx={{ mb: 2, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' } }}>
                        <ToggleButton value="sprint">🏃 Sprint</ToggleButton>
                        <ToggleButton value="phase">📋 Phase</ToggleButton>
                        <ToggleButton value="milestone">🎯 Milestone</ToggleButton>
                    </ToggleButtonGroup>

                    {/* Parent Phase selector (Sprint type only) */}
                    {editType === 'sprint' && sprints.filter(s => s.type === 'phase' && s.id !== editSprint?.id).length > 0 && (
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>{t('parentPhase') as string}</InputLabel>
                            <Select value={editParentId} label={t('parentPhase') as string}
                                onChange={(e) => setEditParentId(e.target.value as string)}>
                                <MenuItem value="">{t('noParent') as string}</MenuItem>
                                {sprints.filter(s => s.type === 'phase' && s.id !== editSprint?.id).map(phase => (
                                    <MenuItem key={phase.id} value={phase.id}>📋 {phase.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Linked Sprints selector (Milestone type only) */}
                    {editType === 'milestone' && sprints.filter(s => s.type !== 'milestone' && s.id !== editSprint?.id).length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {t('selectLinkedSprints') as string}
                            </Typography>
                            {sprints.filter(s => s.type !== 'milestone' && s.id !== editSprint?.id).map(sp => (
                                <FormControlLabel key={sp.id} sx={{ display: 'block', ml: 0 }}
                                    control={
                                        <Checkbox size="small" checked={editLinkedIds.includes(sp.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setEditLinkedIds(prev => [...prev, sp.id]);
                                                else setEditLinkedIds(prev => prev.filter(id => id !== sp.id));
                                            }} />
                                    }
                                    label={<Typography variant="body2">{sp.type === 'phase' ? '📋' : '🚀'} {sp.name}</Typography>}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Date fields */}
                    {editType === 'milestone' ? (
                        <TextField fullWidth type="date" label={t('targetDate') as string} value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} />
                    ) : (
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                            <TextField fullWidth type="date" label={t('startDate') as string} value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                            <TextField fullWidth type="date" label={t('endDate') as string} value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditSprint(null)}>{t('cancel') as string}</Button>
                    <Button variant="contained" onClick={handleSaveEditSprint} disabled={!editName.trim()}>{t('save') as string}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamSettings;
