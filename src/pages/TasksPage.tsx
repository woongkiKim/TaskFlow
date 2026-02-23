import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useApiData from '../hooks/useApiData';
import { useTaskActions } from '../hooks/useTaskActions';
import {
    Box, Typography, Button, ToggleButtonGroup, ToggleButton,
    alpha, IconButton, Tooltip, Divider, CircularProgress,
    Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Snackbar, Chip, Grow, Paper, InputBase, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FlagIcon from '@mui/icons-material/Flag';
import ListAltIcon from '@mui/icons-material/ListAlt';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import HomeIcon from '@mui/icons-material/Home';
import BusinessIcon from '@mui/icons-material/Business';
import {
    fetchProjectTasks, fetchPersonalTasks, fetchMyWorkTasks,
} from '../services/taskService';
import { fetchCustomViews, saveCustomView, deleteCustomView } from '../services/savedViewService';
import { DEFAULT_KANBAN_COLUMNS } from '../services/projectService';
import type { Task, PriorityLevel, CustomView, ViewMode as GlobalViewMode } from '../types';
import ListView from '../components/ListView';
import BoardView from '../components/BoardView';
import TableView from '../components/TableView';
import GanttChart from '../components/GanttChart';
import CategoryFilter from '../components/CategoryFilter';
import AddTaskDialog from '../components/AddTaskDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';
import Calendar from './Calendar';
import TimelineIcon from '@mui/icons-material/Timeline';
import SaveIcon from '@mui/icons-material/Save';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SpeedIcon from '@mui/icons-material/Speed';
import ArticleIcon from '@mui/icons-material/Article';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { toast } from 'sonner';
import { handleError } from '../utils/errorHandler';


type LocalViewMode = GlobalViewMode;
type TaskScope = 'personal' | 'work';

const TasksPage = () => {
    const { user } = useAuth();
    const { t, lang } = useLanguage();
    const { currentProject, setCurrentProject, currentWorkspace, currentSprint, scope, sprints, updateCurrentSprint, currentViewMode, setCurrentViewMode, activeViewFilter, setActiveViewFilter, projects } = useWorkspace();

    const viewMode = currentViewMode as LocalViewMode;
    const setViewMode = setCurrentViewMode;
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [detailTask, setDetailTask] = useState<Task | null>(null);

    // Saved Views
    const [savedViews, setSavedViews] = useState<CustomView[]>([]);
    const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
    const [isSavingView, setIsSavingView] = useState(false);
    const [newViewName, setNewViewName] = useState('');
    const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
    const [viewAnchorEl, setViewAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedViewForMenu, setSelectedViewForMenu] = useState<CustomView | null>(null);

    // Sprint Management
    const [sprintAnchorEl, setSprintAnchorEl] = useState<null | HTMLElement>(null);
    const [rolloverDialogOpen, setRolloverDialogOpen] = useState(false);
    const [targetSprintId, setTargetSprintId] = useState('');
    const [isRollingOver, setIsRollingOver] = useState(false);

    const [taskScope, setTaskScope] = useState<TaskScope>('personal');

    // Determine available view modes based on iteration type
    const iterationType = currentSprint?.type;
    const availableViews: LocalViewMode[] = useMemo(() => {
        if (iterationType === 'milestone') return ['list'];
        if (iterationType === 'phase') return ['list', 'table', 'calendar'];
        return ['list', 'board', 'calendar', 'table', 'timeline'];
    }, [iterationType]);

    // Auto-correct viewMode when iteration type changes
    useEffect(() => {
        if (!availableViews.includes(viewMode)) {
            setViewMode('list');
        }
    }, [availableViews, viewMode, setViewMode]);

    // Quick-Add bar state
    const [quickAddText, setQuickAddText] = useState('');
    const [quickAddFocused, setQuickAddFocused] = useState(false);
    const quickAddRef = useRef<HTMLInputElement>(null);

    // Fetch saved views
    useEffect(() => {
        if (!currentWorkspace) return;
        const loadViews = async () => {
            try {
                const views = await fetchCustomViews(currentWorkspace.id, currentProject?.id);
                setSavedViews(views);
            } catch (e) { console.error('Failed to load views:', e); }
        };
        loadViews();
    }, [currentWorkspace, currentProject]);

    // ─── SWR-based task loading (instant from cache, background revalidation) ───
    const taskCacheKey = useMemo(() => {
        if (!user) return null;
        if (currentProject) return `tasks:project:${currentProject.id}`;
        if (activeViewFilter?.initiativeId && currentWorkspace) return `tasks:initiative:${activeViewFilter.initiativeId}`;
        if (taskScope === 'work' && currentWorkspace) return `tasks:work:${user.uid}:${currentWorkspace.id}`;
        return `tasks:personal:${user.uid}`;
    }, [user, currentProject, currentWorkspace, taskScope, activeViewFilter]);

    const taskFetcher = useCallback(async () => {
        if (!user) return [];
        if (currentProject) return fetchProjectTasks(currentProject.id);
        if (activeViewFilter?.initiativeId && currentWorkspace) {
            const linkedProjs = projects.filter(p => p.initiativeId === activeViewFilter.initiativeId);
            if (linkedProjs.length > 0) {
                const results = await Promise.all(linkedProjs.map(p => fetchProjectTasks(p.id)));
                return results.flat();
            }
            return [];
        }
        if (taskScope === 'work' && currentWorkspace) return fetchMyWorkTasks(user.uid, currentWorkspace.id);
        return fetchPersonalTasks(user.uid);
    }, [user, currentProject, currentWorkspace, taskScope, activeViewFilter, projects]);

    const { data: swrTasks = [], loading, mutate: _mutateTasks } = useApiData<Task[]>(
        taskCacheKey,
        taskFetcher,
        { ttlMs: 3 * 60_000, persist: true },
    );

    const [tasks, setTasks] = useState<Task[]>([]);
    // Sync SWR data into local state for optimistic updates
    useEffect(() => { setTasks(swrTasks); }, [swrTasks]);

    // ─── Task Actions (extracted to hook) ───
    const {
        pendingDelete,
        handleAddInline, handleQuickAdd, handleBoardInlineAdd, handleAddDialog,
        handleToggle, handleEdit, handleDelete, handleUndoDelete, handleSnackbarClose,
        handleKanbanStatusChange, handleColumnsChange, handleTaskUpdate,
        handleMoveListTask, handleReorderTodayTasks, handleMoveBoardTask, handleReorderBoardTasks,
        handleCreateSubIssue, handleRolloverTasks,
    } = useTaskActions(tasks, setTasks, {
        user, t: t as (key: string) => string, lang,
        currentProject, currentWorkspace, currentSprint,
        setCurrentProject, updateCurrentSprint,
    });

    // Filter: scope + sprint
    const filteredTasks = useMemo(() => {
        // Exclude archived tasks
        let result = tasks.filter(t => !t.archived);

        // Initiative View: Skip sprint filtering to show all tasks
        if (activeViewFilter?.initiativeId) {
            // Pass through
        }
        // Sprint filter — hierarchy-aware
        else if (currentSprint) {
            if (currentSprint.type === 'phase') {
                const childIds = sprints.filter(s => s.parentId === currentSprint.id).map(s => s.id);
                const phaseGroup = new Set([currentSprint.id, ...childIds]);
                result = result.filter(t => t.sprintId && phaseGroup.has(t.sprintId));
            } else if (currentSprint.type === 'milestone' && currentSprint.linkedSprintIds?.length) {
                const linkedIds = new Set<string>(currentSprint.linkedSprintIds);
                for (const lid of currentSprint.linkedSprintIds) {
                    const linked = sprints.find(s => s.id === lid);
                    if (linked?.type === 'phase') {
                        sprints.filter(s => s.parentId === lid).forEach(c => linkedIds.add(c.id));
                    }
                }
                result = result.filter(t => t.sprintId && linkedIds.has(t.sprintId));
            } else {
                result = result.filter(t => t.sprintId === currentSprint.id);
            }
        } else if (currentProject && sprints.length > 0) {
            const sprintIds = new Set(sprints.map(s => s.id));
            result = result.filter(t => !t.sprintId || !sprintIds.has(t.sprintId));
        }

        // Scope filter
        if (scope === 'mine' && user) {
            result = result.filter(t => t.assigneeId === user.uid || (!t.assigneeId && !t.workspaceId));
        }

        return result;
    }, [tasks, scope, user, currentSprint, sprints, currentProject, activeViewFilter]);

    // Apply custom view filter on top of filteredTasks
    const viewFilteredTasks = useMemo(() => {
        if (!activeViewFilter) return filteredTasks;
        let result = filteredTasks;
        const f = activeViewFilter;

        if (f.statuses && f.statuses.length > 0) {
            result = result.filter(t => f.statuses!.includes(t.status || 'todo'));
        }
        if (f.priorities && f.priorities.length > 0) {
            result = result.filter(t => {
                const np = t.priority ? (t.priority as string) : undefined;
                return np && f.priorities!.includes(np as PriorityLevel);
            });
        }
        if (f.types && f.types.length > 0) {
            result = result.filter(t => f.types!.includes(t.type || 'task'));
        }
        if (f.tags && f.tags.length > 0) {
            result = result.filter(t =>
                f.tags!.some(tag => t.tags?.includes(tag) || t.category === tag)
            );
        }
        if (f.hideCompleted) {
            result = result.filter(t => !t.completed);
        }
        if (f.hasBlocker) {
            result = result.filter(t => t.blockerStatus === 'blocked');
        }
        if (f.hasDueDate) {
            const today = new Date().toISOString().split('T')[0];
            const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            if (f.hasDueDate === 'overdue') {
                result = result.filter(t => t.dueDate && !t.completed && t.dueDate < today);
            } else if (f.hasDueDate === 'today') {
                result = result.filter(t => t.dueDate === today);
            } else if (f.hasDueDate === 'thisWeek') {
                result = result.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd);
            }
        }
        return result;
    }, [filteredTasks, activeViewFilter]);

    // Progress stats for phase/milestone
    const progressStats = useMemo(() => {
        const total = viewFilteredTasks.length;
        const done = viewFilteredTasks.filter(t => t.completed).length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return { total, done, percent };
    }, [viewFilteredTasks]);

    const allTags = useMemo(() => {
        const s = new Set<string>();
        filteredTasks.forEach(t => { t.tags?.forEach(tag => s.add(tag)); if (t.category) s.add(t.category); });
        return Array.from(s);
    }, [filteredTasks]);

    // Build sprint group map for Phase/Milestone views
    const sprintGroups = useMemo(() => {
        if (!currentSprint) return undefined;
        if (currentSprint.type === 'phase') {
            const groups: Record<string, string> = {};
            groups[currentSprint.id] = currentSprint.name;
            sprints.filter(s => s.parentId === currentSprint.id).forEach(s => { groups[s.id] = s.name; });
            return Object.keys(groups).length > 1 ? groups : undefined;
        }
        if (currentSprint.type === 'milestone' && currentSprint.linkedSprintIds?.length) {
            const groups: Record<string, string> = {};
            for (const lid of currentSprint.linkedSprintIds) {
                const linked = sprints.find(s => s.id === lid);
                if (linked) {
                    groups[linked.id] = linked.name;
                    if (linked.type === 'phase') {
                        sprints.filter(s => s.parentId === lid).forEach(c => { groups[c.id] = c.name; });
                    }
                }
            }
            return Object.keys(groups).length > 0 ? groups : undefined;
        }
        return undefined;
    }, [currentSprint, sprints]);

    // Quick-Add submit
    const handleQuickAddSubmit = () => {
        if (quickAddText.trim()) {
            handleQuickAdd(quickAddText);
            setQuickAddText('');
        }
    };

    const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleQuickAddSubmit();
        } else if (e.key === 'Escape') {
            setQuickAddText('');
            quickAddRef.current?.blur();
        }
    };

    // --- View Management Handlers ---
    const handleApplyView = useCallback((view: CustomView | null) => {
        if (!view) {
            setActiveViewFilter(null);
            setViewMode('list');
            setActiveSavedViewId(null);
            return;
        }
        setActiveViewFilter(view.filters);
        setViewMode(view.viewMode as LocalViewMode);
        setActiveSavedViewId(view.id);
    }, [setActiveViewFilter, setViewMode]);

    const handleSaveNewView = async () => {
        if (!user || !currentWorkspace || !newViewName.trim()) return;
        setIsSavingView(true);
        try {
            const view = await saveCustomView({
                name: newViewName.trim(),
                icon: '📋',
                color: '#6366f1',
                filters: activeViewFilter || {},
                viewMode: viewMode,
                workspaceId: currentWorkspace.id,
                projectId: currentProject?.id || '',
                createdBy: user.uid,
            });
            setSavedViews(prev => [...prev, view]);
            setActiveSavedViewId(view.id);
            setSaveViewDialogOpen(false);
            setNewViewName('');
            toast.success('View saved successfully');
        } catch (e) {
            handleError(e, { fallbackMessage: 'Failed to save view' });
        } finally {
            setIsSavingView(false);
        }
    };

    const handleDeleteView = async (id: string) => {
        try {
            await deleteCustomView(id);
            setSavedViews(prev => prev.filter(v => v.id !== id));
            if (activeSavedViewId === id) {
                handleApplyView(null);
            }
            toast.success('View deleted');
        } catch (e) {
            handleError(e, { fallbackMessage: 'Failed to delete view' });
        }
    };

    const handleDoRollover = async () => {
        setIsRollingOver(true);
        await handleRolloverTasks(targetSprintId, () => setRolloverDialogOpen(false));
        setIsRollingOver(false);
    };

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
            if (isInput) return;

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                quickAddRef.current?.focus();
                return;
            }

            const viewKeys: Record<string, LocalViewMode> = { '1': 'list', '2': 'board', '3': 'calendar', '4': 'table' };
            if (viewKeys[e.key] && availableViews.includes(viewKeys[e.key])) {
                e.preventDefault();
                setViewMode(viewKeys[e.key]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [availableViews, setViewMode]);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /></Box>;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* Personal / Work scope toggle */}
                    {!currentProject && (
                        <ToggleButtonGroup
                            value={taskScope}
                            exclusive
                            onChange={(_, v) => v && setTaskScope(v)}
                            size="small"
                            sx={{
                                bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                                borderRadius: 2, p: 0.25,
                                '& .MuiToggleButton-root': {
                                    border: 'none', borderRadius: '6px !important', px: 1.5, py: 0.5,
                                    fontWeight: 600, fontSize: '0.8rem', textTransform: 'none', gap: 0.5,
                                    '&.Mui-selected': {
                                        bgcolor: taskScope === 'personal' ? 'info.main' : 'success.main',
                                        color: 'white',
                                        '&:hover': { bgcolor: taskScope === 'personal' ? 'info.dark' : 'success.dark' },
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="personal">
                                <HomeIcon sx={{ fontSize: 16 }} />
                                {t('personal') as string}
                            </ToggleButton>
                            <ToggleButton value="work">
                                <BusinessIcon sx={{ fontSize: 16 }} />
                                {t('work') as string}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    )}

                    {currentProject && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: currentProject.color }} />
                            <Typography variant="h6" fontWeight={700}>{currentProject.name}</Typography>
                        </Box>
                    )}
                    {currentSprint && (
                        <>
                            <Chip
                                icon={
                                    currentSprint.type === 'milestone' ? <FlagIcon sx={{ fontSize: 14 }} /> :
                                        currentSprint.type === 'phase' ? <ListAltIcon sx={{ fontSize: 14 }} /> :
                                            <RocketLaunchIcon sx={{ fontSize: 14 }} />
                                }
                                label={
                                    currentSprint.type === 'milestone' ? '🎯 ' + currentSprint.name :
                                        currentSprint.type === 'phase' ? '📋 ' + currentSprint.name :
                                            currentSprint.name
                                }
                                size="small"
                                color={
                                    currentSprint.type === 'milestone' ? 'error' :
                                        currentSprint.type === 'phase' ? 'success' :
                                            'primary'
                                }
                                variant="outlined"
                                onClick={(e) => setSprintAnchorEl(e.currentTarget)}
                                sx={{ fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} />
                            <Menu
                                anchorEl={sprintAnchorEl}
                                open={Boolean(sprintAnchorEl)}
                                onClose={() => setSprintAnchorEl(null)}
                                PaperProps={{ sx: { borderRadius: 2, minWidth: 180 } }}
                            >
                                <MenuItem onClick={() => { setSprintAnchorEl(null); setRolloverDialogOpen(true); }}>
                                    <SpeedIcon sx={{ fontSize: 18, mr: 1, color: 'text.secondary' }} />
                                    {lang === 'ko' ? '다음으로 넘기기 (Rollover)' : 'Rollover Tasks'}
                                </MenuItem>
                            </Menu>
                        </>
                    )}
                    {!currentSprint && sprints.length > 0 && (
                        <Chip label={t('backlog') as string} size="small" variant="outlined"
                            sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary' }} />
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* View Switcher (System + Custom) */}
                    <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', borderRadius: 2.5, p: 0.5, border: '1px solid', borderColor: 'divider', overflowX: 'auto', maxWidth: { xs: '300px', sm: '100%' }, scrollbarWidth: 'none' }}>
                        {[
                            { id: 'list', name: (t('listView') as string), icon: <ArticleIcon sx={{ fontSize: 18 }} /> },
                            { id: 'board', name: (t('boardView') as string), icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
                            { id: 'calendar', name: (t('calendarView') as string), icon: <CalendarMonthIcon sx={{ fontSize: 18 }} /> },
                            { id: 'table', name: (t('tableView') as string), icon: <SpeedIcon sx={{ fontSize: 18 }} /> },
                            { id: 'timeline', name: 'Timeline', icon: <TimelineIcon sx={{ fontSize: 18 }} /> },
                        ].map((v) => (
                            <Button
                                key={v.id}
                                size="small"
                                onClick={() => {
                                    if (viewMode !== v.id) {
                                        setViewMode(v.id as GlobalViewMode);
                                        setActiveSavedViewId(null);
                                    }
                                }}
                                sx={{
                                    minWidth: 'auto', px: 1.5, py: 0.5, borderRadius: 2,
                                    color: (viewMode === v.id && !activeSavedViewId) ? 'primary.main' : 'text.secondary',
                                    bgcolor: (viewMode === v.id && !activeSavedViewId) ? alpha('#6366f1', 0.1) : 'transparent',
                                    fontWeight: (viewMode === v.id && !activeSavedViewId) ? 700 : 500,
                                    fontSize: '0.78rem', textTransform: 'none', gap: 0.8, whiteSpace: 'nowrap',
                                    '&:hover': { bgcolor: alpha('#6366f1', 0.05) }
                                }}
                            >
                                {v.icon} {v.name as string}
                            </Button>
                        ))}
                        {savedViews.length > 0 && <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 0.5 }} />}
                        {savedViews.map(view => (
                            <Box key={view.id} sx={{ display: 'flex', alignItems: 'center' }}>
                                <Button
                                    size="small"
                                    onClick={() => handleApplyView(view)}
                                    sx={{
                                        minWidth: 'auto', px: 1.5, py: 0.5, borderRadius: 2,
                                        color: activeSavedViewId === view.id ? 'primary.main' : 'text.secondary',
                                        bgcolor: activeSavedViewId === view.id ? alpha('#6366f1', 0.1) : 'transparent',
                                        fontWeight: activeSavedViewId === view.id ? 700 : 500,
                                        fontSize: '0.78rem', textTransform: 'none', gap: 0.8, whiteSpace: 'nowrap',
                                        '&:hover': { bgcolor: alpha('#6366f1', 0.05) }
                                    }}
                                >
                                    {view.icon || '📋'} {view.name}
                                </Button>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        setViewAnchorEl(e.currentTarget);
                                        setSelectedViewForMenu(view);
                                    }}
                                    sx={{ p: 0.3, ml: -1, mr: 0.5, color: 'text.secondary', opacity: 0.4, '&:hover': { opacity: 1 } }}
                                >
                                    <MoreVertIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        ))}
                        <Tooltip title="Save Current View as Custom">
                            <IconButton
                                size="small"
                                onClick={() => setSaveViewDialogOpen(true)}
                                sx={{ ml: 0.5, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}
                            >
                                <SaveIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {allTags.length > 0 && viewMode !== 'calendar' && (
                        <CategoryFilter allTags={allTags} selectedTag={selectedTag} onSelectTag={setSelectedTag} />
                    )}
                </Box>

            </Box>

            {/* 🌟 Quick-Add Bar — always visible, all views */}
            {viewMode !== 'list' && (
                <Grow in>
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 2, display: 'flex', alignItems: 'center',
                            borderRadius: 3, border: '2px solid',
                            borderColor: quickAddFocused ? 'primary.main' : 'divider',
                            bgcolor: 'background.paper',
                            boxShadow: quickAddFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': { borderColor: quickAddFocused ? 'primary.main' : 'primary.light' },
                        }}
                    >
                        <Box sx={{ pl: 2, pr: 1, display: 'flex', alignItems: 'center', color: quickAddFocused ? 'primary.main' : 'text.secondary' }}>
                            <AddIcon sx={{ fontSize: 22, transition: 'color 0.15s' }} />
                        </Box>
                        <InputBase
                            inputRef={quickAddRef}
                            placeholder={t('addNewTask') as string}
                            value={quickAddText}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickAddText(e.target.value)}
                            onFocus={() => setQuickAddFocused(true)}
                            onBlur={() => setQuickAddFocused(false)}
                            onKeyDown={handleQuickAddKeyDown}
                            fullWidth
                            sx={{
                                py: 1, pr: 1,
                                '& input': {
                                    fontSize: '0.9rem',
                                    '&::placeholder': { fontWeight: 500, opacity: 0.6 },
                                },
                            }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 1 }}>
                            {!quickAddFocused && !quickAddText && (
                                <Chip
                                    icon={<KeyboardIcon sx={{ fontSize: 14 }} />}
                                    label="N"
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.5 }}
                                />
                            )}
                            {quickAddFocused && quickAddText.trim() && (
                                <Chip label="Enter ↵" size="small" color="primary"
                                    sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1.5 }} />
                            )}
                            <Tooltip title={t('addDetailedTask') as string} arrow>
                                <IconButton
                                    size="small"
                                    onClick={() => setAddDialogOpen(true)}
                                    sx={{
                                        border: '1px solid', borderColor: 'divider', borderRadius: 1.5,
                                        width: 28, height: 28,
                                        '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                                    }}
                                >
                                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.6rem' }}>···</Typography>
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Paper>
                </Grow>
            )}

            {/* Progress Bar for Phase */}
            {currentSprint?.type === 'phase' && (
                <Paper elevation={0} sx={{ mb: 2, p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                            📋 {t('progress') as string}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color={progressStats.percent === 100 ? 'success.main' : 'text.primary'}>
                            {progressStats.percent}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progressStats.percent}
                        sx={{
                            height: 8, borderRadius: 4,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: progressStats.percent === 100 ? 'success.main' : 'primary.main',
                            },
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {(t('tasksCompletedCount') as string).replace('{done}', String(progressStats.done)).replace('{total}', String(progressStats.total))}
                    </Typography>
                </Paper>
            )}

            {/* Milestone Status Banner */}
            {currentSprint?.type === 'milestone' && (
                <Paper elevation={0} sx={{ mb: 2, p: 2, borderRadius: 3, border: '1px solid', borderColor: progressStats.percent === 100 ? 'success.main' : 'divider', bgcolor: progressStats.percent === 100 ? 'success.main' : 'background.paper' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 28, color: progressStats.percent === 100 ? 'white' : 'action.disabled' }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight={700} color={progressStats.percent === 100 ? 'white' : 'text.primary'}>
                                {progressStats.percent === 100 ? (lang === 'ko' ? '🎉 달성됨' : '🎉 Achieved') : (lang === 'ko' ? '🎯 미달성' : '🎯 Not Achieved')}
                            </Typography>
                            <Typography variant="caption" color={progressStats.percent === 100 ? 'rgba(255,255,255,0.8)' : 'text.secondary'}>
                                {(t('tasksCompletedCount') as string).replace('{done}', String(progressStats.done)).replace('{total}', String(progressStats.total))}
                                {currentSprint.endDate && ' · ' + (t('targetDate') as string) + ': ' + currentSprint.endDate}
                            </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight={800} color={progressStats.percent === 100 ? 'white' : 'text.secondary'}>
                            {progressStats.percent}%
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* Active View Filter Indicator */}
            {activeViewFilter && (
                <Paper elevation={0} sx={{
                    mb: 1, p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    bgcolor: 'primary.main', color: 'white',
                    background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.85rem' }}>🔍</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem' }}>
                            Custom view active
                        </Typography>
                        <Chip
                            label={String(viewFilteredTasks.length) + ' tasks'}
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                        />
                    </Box>
                    <Button size="small" variant="text"
                        onClick={() => setActiveViewFilter(null)}
                        sx={{ color: 'white', fontSize: '0.7rem', fontWeight: 600, minWidth: 0, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}>
                        ✕ Clear
                    </Button>
                </Paper>
            )}

            {/* Views */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {viewMode === 'list' && <ListView tasks={viewFilteredTasks} selectedTag={selectedTag} onAddInline={handleAddInline} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} onTaskClick={setDetailTask} onMoveTask={handleMoveListTask} onReorderTodayTasks={handleReorderTodayTasks} sprintGroups={sprintGroups} allTasks={tasks} />}
                {viewMode === 'board' && <BoardView tasks={viewFilteredTasks} columns={currentSprint?.kanbanColumns || currentProject?.kanbanColumns || DEFAULT_KANBAN_COLUMNS} selectedTag={selectedTag} onKanbanStatusChange={handleKanbanStatusChange} onMoveTaskInColumn={handleMoveBoardTask} onReorderTasksInColumn={handleReorderBoardTasks} onTaskClick={setDetailTask} onColumnsChange={handleColumnsChange} onAddTask={handleBoardInlineAdd} />}
                {viewMode === 'calendar' && <Calendar />}
                {viewMode === 'table' && <TableView tasks={viewFilteredTasks} selectedTag={selectedTag} onToggle={handleToggle} onTaskClick={setDetailTask} />}
                {viewMode === 'timeline' && (
                    <GanttChart
                        items={viewFilteredTasks.map(t => ({
                            id: t.id,
                            name: t.text,
                            startDate: t.startDate || t.createdAt,
                            targetDate: t.dueDate,
                            createdAt: t.createdAt,
                            color: t.categoryColor || '#6366f1'
                        }))}
                        onItemClick={(item) => setDetailTask(tasks.find(t => t.id === item.id) || null)}
                    />
                )}
            </Box>


            <AddTaskDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onSubmit={handleAddDialog} />
            <TaskDetailDialog open={!!detailTask} task={detailTask} allTasks={tasks} onClose={() => setDetailTask(null)} onUpdate={handleTaskUpdate} onCreateSubIssue={handleCreateSubIssue} onTaskClick={(task) => setDetailTask(task)} />

            {/* Save View Dialog */}
            <Dialog open={saveViewDialogOpen} onClose={() => setSaveViewDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>💾 {lang === 'ko' ? '현재 뷰 저장' : 'Save Current View'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={lang === 'ko' ? '뷰 이름' : 'View Name'}
                        fullWidth
                        variant="outlined"
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        placeholder="e.g. My Urgent Tasks"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveViewDialogOpen(false)}>{t('cancel')}</Button>
                    <Button
                        onClick={handleSaveNewView}
                        variant="contained"
                        disabled={!newViewName.trim() || isSavingView}
                        sx={{ borderRadius: 2 }}
                    >
                        {isSavingView ? <CircularProgress size={20} /> : t('save')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Rollover Dialog */}
            <Dialog open={rolloverDialogOpen} onClose={() => setRolloverDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>🔄 {lang === 'ko' ? '작업 연기 (Rollover)' : 'Rollover Incomplete Tasks'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {lang === 'ko' ? '현재 스프린트의 완료되지 않은 모든 작업을 선택한 스프린트로 이동합니다.' : 'Move all incomplete tasks from the current sprint to the selected target sprint.'}
                    </Typography>
                    <TextField
                        select
                        fullWidth
                        label={lang === 'ko' ? '대상 스프린트' : 'Target Sprint'}
                        value={targetSprintId}
                        onChange={(e) => setTargetSprintId(e.target.value)}
                        SelectProps={{ native: true }}
                    >
                        <option value="">{lang === 'ko' ? '스프린트 선택' : 'Select Sprint'}</option>
                        {sprints.filter(s => s.id !== currentSprint?.id).map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRolloverDialogOpen(false)}>{t('cancel')}</Button>
                    <Button
                        onClick={handleDoRollover}
                        variant="contained"
                        disabled={!targetSprintId || isRollingOver}
                        sx={{ borderRadius: 2 }}
                    >
                        {isRollingOver ? <CircularProgress size={20} /> : (lang === 'ko' ? '연기 실행' : 'Rollover')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Context Menu */}
            <Menu
                anchorEl={viewAnchorEl}
                open={Boolean(viewAnchorEl)}
                onClose={() => setViewAnchorEl(null)}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 120, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
            >
                <MenuItem onClick={() => {
                    if (selectedViewForMenu) {
                        handleDeleteView(selectedViewForMenu.id);
                        setViewAnchorEl(null);
                    }
                }} sx={{ color: 'error.main', fontSize: '0.85rem' }}>
                    <DeleteIcon sx={{ fontSize: 16, mr: 1 }} />
                    {t('delete')}
                </MenuItem>
            </Menu>

            {/* Undo Delete Snackbar */}

            <Snackbar
                open={!!pendingDelete}
                autoHideDuration={5000}
                onClose={handleSnackbarClose}
                message={t('taskDeleted') as string}
                action={
                    <Button color="primary" size="small" onClick={handleUndoDelete} sx={{ fontWeight: 700 }}>
                        {t('undo') as string}
                    </Button>
                }
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                sx={{ '& .MuiSnackbarContent-root': { borderRadius: 2, minWidth: 280 } }}
            />
        </Box>
    );
};

export default TasksPage;
