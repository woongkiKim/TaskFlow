import { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField, Chip,
    IconButton, Checkbox, InputBase, Divider, ToggleButtonGroup, ToggleButton,
    LinearProgress, Avatar, AvatarGroup, Switch, FormControlLabel, Collapse,
    Select, MenuItem, FormControl, Button, Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FlagIcon from '@mui/icons-material/Flag';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import BlockIcon from '@mui/icons-material/Block';
import NextPlanIcon from '@mui/icons-material/NextPlan';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import TimerIcon from '@mui/icons-material/Timer';
import type { Task, Subtask, PriorityLevel, TaskType, TaskRelation, RelationType, EstimatePoint, TimeEntry } from '../types';
import ActivityFeed from './ActivityFeed';
import {
    PRIORITY_CONFIG, TASK_TYPE_CONFIG, TASK_TYPES, STATUS_CONFIG,
    normalizePriority, STATUS_PRESETS, RELATION_TYPES, RELATION_TYPE_CONFIG,
    ESTIMATE_POINTS, ESTIMATE_CONFIG,
} from '../types';
import { updateTaskDetailInDB, updateSubtasksInDB, addTaskRelation, removeTaskRelation } from '../services/taskService';
import { fetchTimeEntries, addManualTimeEntry, deleteTimeEntry } from '../services/timeTrackingService';
import { getTagColor } from './TagInput';
import { PomodoroStartButton } from './PomodoroTimer';
import BlockEditor from './BlockEditor';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

interface TaskDetailDialogProps {
    open: boolean;
    task: Task | null;
    allTasks?: Task[];  // all project tasks for relation autocomplete
    onClose: () => void;
    onUpdate: (task: Task) => void;
    onCreateSubIssue?: (parentTask: Task, subIssueText: string) => void;
    onTaskClick?: (task: Task) => void;
}

const TaskDetailDialog = ({ open, task, allTasks = [], onClose, onUpdate, onCreateSubIssue, onTaskClick }: TaskDetailDialogProps) => {
    const { t, lang } = useLanguage();
    useWorkspace();
    const [text, setText] = useState('');
    const [description, setDescription] = useState('');
    const descriptionRef = useRef('');
    const [priority, setPriority] = useState<PriorityLevel | ''>('');
    const [taskType, setTaskType] = useState<TaskType>('task');
    const [status, setStatus] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');

    // Enterprise fields
    const [blockerStatus, setBlockerStatus] = useState<'none' | 'blocked'>('none');
    const [blockerDetail, setBlockerDetail] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [linkText, setLinkText] = useState('');
    const [links, setLinks] = useState<string[]>([]);
    const [aiUsage, setAiUsage] = useState('');
    const [delayReason, setDelayReason] = useState('');

    // Tags editing
    const [tags, setTags] = useState<string[]>([]);
    const [newTagText, setNewTagText] = useState('');

    // Issue Relations
    const [relations, setRelations] = useState<TaskRelation[]>([]);
    const [relationSearchText, setRelationSearchText] = useState('');
    const [selectedRelationType, setSelectedRelationType] = useState<RelationType>('blocks');

    // Estimate
    const [estimate, setEstimate] = useState<EstimatePoint | null>(null);

    // Time Tracking
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [showTimeLog, setShowTimeLog] = useState(false);
    const [manualMinutes, setManualMinutes] = useState('');
    const [manualNote, setManualNote] = useState('');
    const { user } = useAuth();

    // Sub-issues
    const [newSubIssueText, setNewSubIssueText] = useState('');

    useEffect(() => {
        if (task) {
            setText(task.text);
            setDescription(task.description || '');
            descriptionRef.current = task.description || '';
            const norm = normalizePriority(task.priority);
            setPriority(norm || '');
            setTaskType(task.type || 'task');
            setStatus(task.status || 'todo');
            setDueDate(task.dueDate || '');
            setSubtasks(task.subtasks || []);
            setBlockerStatus(task.blockerStatus || 'none');
            setBlockerDetail(task.blockerDetail || '');
            setNextAction(task.nextAction || '');
            setLinks(task.links || []);
            setAiUsage(task.aiUsage || '');
            setDelayReason(task.delayReason || '');
            setRelations(task.relations || []);
            setEstimate((task.estimate ?? null) as EstimatePoint | null);
            setTags(task.tags || []);
            setNewTagText('');
            // Load time entries
            fetchTimeEntries(task.id).then(setTimeEntries).catch(() => {});
        }
    }, [task]);

    if (!task) return null;

    const handleSave = async () => {
        const updates: Partial<Task> = {};
        if (text !== task.text) updates.text = text;
        if (descriptionRef.current !== (task.description || '')) updates.description = descriptionRef.current;
        const normPriority = normalizePriority(task.priority) || '';
        if (priority !== normPriority) updates.priority = priority || undefined;
        if (taskType !== (task.type || 'task')) updates.type = taskType;
        if (status !== (task.status || 'todo')) updates.status = status;
        if (dueDate !== (task.dueDate || '')) updates.dueDate = dueDate || undefined;
        if (blockerStatus !== (task.blockerStatus || 'none')) updates.blockerStatus = blockerStatus;
        if (blockerDetail !== (task.blockerDetail || '')) updates.blockerDetail = blockerDetail;
        if (nextAction !== (task.nextAction || '')) updates.nextAction = nextAction;
        if (aiUsage !== (task.aiUsage || '')) updates.aiUsage = aiUsage;
        if (delayReason !== (task.delayReason || '')) updates.delayReason = delayReason;
        if (JSON.stringify(links) !== JSON.stringify(task.links || [])) updates.links = links;
        if (JSON.stringify(relations) !== JSON.stringify(task.relations || [])) updates.relations = relations;
        if ((estimate ?? undefined) !== (task.estimate ?? undefined)) updates.estimate = estimate ?? undefined;
        if (JSON.stringify(tags) !== JSON.stringify(task.tags || [])) updates.tags = tags;

        if (Object.keys(updates).length > 0) {
            try {
                await updateTaskDetailInDB(task.id, updates);
            } catch { /* silently fail */ }
        }

        const updatedTask: Task = {
            ...task, text, description: descriptionRef.current || undefined,
            priority: priority || undefined, type: taskType, status,
            dueDate: dueDate || undefined, subtasks,
            blockerStatus, blockerDetail, nextAction, links, aiUsage, delayReason, relations,
            estimate: estimate ?? undefined,
            tags: tags.length > 0 ? tags : undefined,
        };
        onUpdate(updatedTask);
    };

    const handleClose = () => { onClose(); };

    // Subtasks
    const handleAddSubtask = () => {
        const trimmed = newSubtaskText.trim();
        if (!trimmed) return;
        const newSub: Subtask = { id: Date.now().toString(), text: trimmed, completed: false };
        const updated = [...subtasks, newSub];
        setSubtasks(updated); setNewSubtaskText('');
        updateSubtasksInDB(task.id, updated).catch(() => { });
    };
    const handleSubtaskKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); handleAddSubtask(); }
    };
    const handleToggleSubtask = (subId: string) => {
        const updated = subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
        setSubtasks(updated); updateSubtasksInDB(task.id, updated).catch(() => { });
    };
    const handleDeleteSubtask = (subId: string) => {
        const updated = subtasks.filter(s => s.id !== subId);
        setSubtasks(updated); updateSubtasksInDB(task.id, updated).catch(() => { });
    };
    const handleAddLink = () => {
        const trimmed = linkText.trim();
        if (trimmed && !links.includes(trimmed)) { setLinks([...links, trimmed]); setLinkText(''); }
    };
    const handleLinkKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); }
    };

    // Issue Relations handlers
    const handleAddRelation = async (targetTask: Task) => {
        if (!targetTask || targetTask.id === task.id) return;
        // Prevent duplicate
        if (relations.some(r => r.targetTaskId === targetTask.id && r.type === selectedRelationType)) return;

        const newRelation: TaskRelation = {
            type: selectedRelationType,
            targetTaskId: targetTask.id,
            targetTaskCode: targetTask.taskCode,
            targetTaskText: targetTask.text,
        };
        setRelations(prev => [...prev, newRelation]);
        setRelationSearchText('');

        try {
            await addTaskRelation(
                task.id,
                targetTask,
                selectedRelationType,
                task.taskCode,
                task.text
            );
        } catch (e) {
            console.error('Failed to add relation:', e);
            // Rollback local state if needed
            setRelations(prev => prev.filter(r => !(r.targetTaskId === targetTask.id && r.type === selectedRelationType)));
        }
    };

    const handleRemoveRelation = async (idx: number) => {
        const removed = relations[idx];
        if (!removed) return;

        setRelations(prev => prev.filter((_, i) => i !== idx));

        try {
            await removeTaskRelation(task.id, removed.targetTaskId, removed.type);
        } catch (e) {
            console.error('Failed to remove relation:', e);
            // Rollback local state if needed
            setRelations(prev => [...prev, removed]);
        }
    };

    // Available tasks for relation (exclude self and already related)
    const relationCandidates = allTasks.filter(t =>
        t.id !== task.id && !relations.some(r => r.targetTaskId === t.id && r.type === selectedRelationType)
    );

    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;
    const normalizedPriority = normalizePriority(priority);
    const priorityCfg = normalizedPriority ? PRIORITY_CONFIG[normalizedPriority] : null;
    const typeCfg = TASK_TYPE_CONFIG[taskType];
    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG['todo'];

    // Overdue calculation
    const isOverdue = dueDate && !task.completed && new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);

    // Sub-issues (computed)
    const childTasks = allTasks.filter(t => t.parentTaskId === task.id);
    const completedChildTasks = childTasks.filter(t => t.completed).length;

    // Owners display
    const owners = task.owners || (task.assigneeId ? [{ uid: task.assigneeId, name: task.assigneeName || '', photo: task.assigneePhoto }] : []);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '85vh' } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {/* Task Code */}
                    {task.taskCode && (
                        <Chip label={task.taskCode} size="small" sx={{ fontWeight: 700, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: '0.75rem' }} />
                    )}
                    {/* Type Badge */}
                    <Chip label={`${typeCfg.icon} ${typeCfg.label}`} size="small"
                        sx={{ fontWeight: 600, bgcolor: typeCfg.color + '18', color: typeCfg.color }} />
                    {/* Status */}
                    <Chip label={statusCfg.label} size="small"
                        sx={{ fontWeight: 600, bgcolor: statusCfg.bgColor, color: statusCfg.color }} />
                    {/* Blocker */}
                    {blockerStatus === 'blocked' && (
                        <Chip icon={<BlockIcon />} label="Blocked" size="small" color="error" sx={{ fontWeight: 600 }} />
                    )}
                </Box>
                <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Overdue Warning */}
                {isOverdue && (
                    <Box sx={{ bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 2, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon sx={{ color: '#dc2626', fontSize: 18 }} />
                        <Typography variant="body2" color="#dc2626" fontWeight={600}>
                            Overdue — Due {dueDate}
                        </Typography>
                    </Box>
                )}

                {/* Tags & Category */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    {task.category && (
                        <Chip label={task.category} size="small"
                            sx={{ fontWeight: 700, bgcolor: (task.categoryColor || '#3b82f6') + '20', color: task.categoryColor || '#3b82f6' }} />
                    )}
                    {tags.map(tag => (
                        <Chip key={tag} label={`#${tag}`} size="small" onDelete={() => setTags(prev => prev.filter(t => t !== tag))}
                            sx={{ fontWeight: 600, bgcolor: getTagColor(tag) + '18', color: getTagColor(tag) }} />
                    ))}
                    <TextField
                        size="small"
                        placeholder="+ Tag"
                        value={newTagText}
                        onChange={e => setNewTagText(e.target.value.replace(/\s/g, ''))}
                        onKeyDown={e => {
                            if ((e.key === 'Enter' || e.key === ' ') && newTagText.trim()) {
                                e.preventDefault();
                                const t = newTagText.trim().replace(/^#/, '');
                                if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
                                setNewTagText('');
                            }
                        }}
                        sx={{ width: 80, '& .MuiInputBase-input': { p: '4px 8px', fontSize: '0.75rem' }, '& .MuiOutlinedInput-notchedOutline': { borderStyle: 'dashed' } }}
                    />
                </Box>

                {/* Parent Task Breadcrumb */}
                {task.parentTaskId && (
                    <Box
                        onClick={() => {
                            const parentTask = allTasks.find(t => t.id === task.parentTaskId);
                            if (parentTask && onTaskClick) onTaskClick(parentTask);
                        }}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5,
                            bgcolor: 'action.hover', borderRadius: 1.5, cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.selected' },
                        }}
                    >
                        <SubdirectoryArrowRightIcon sx={{ fontSize: 14, color: 'text.secondary', transform: 'rotate(180deg)' }} />
                        <Typography variant="caption" fontWeight={600} color="primary.main">
                            {t('parentTask') as string}: {task.parentTaskText || task.parentTaskId}
                        </Typography>
                    </Box>
                )}

                {/* Owners */}
                {owners.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Owners:</Typography>
                        <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 10, border: '1px solid white' } }}>
                            {owners.map(o => <Avatar key={o.uid} src={o.photo} sx={{ width: 24, height: 24 }}>{o.name?.charAt(0)}</Avatar>)}
                        </AvatarGroup>
                        <Typography variant="caption" color="text.secondary">{owners.map(o => o.name).join(', ')}</Typography>
                    </Box>
                )}

                {/* Title */}
                <TextField fullWidth value={text} onChange={e => setText(e.target.value)} variant="standard"
                    sx={{ '& .MuiInputBase-input': { fontSize: '1.25rem', fontWeight: 700 } }} />

                {/* Description (Block Editor) */}
                <BlockEditor
                    key={task?.id || 'new'}
                    initialContent={description}
                    onChange={(md) => { descriptionRef.current = md; }}
                    minHeight={100}
                />

                {/* Time Tracking */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimerIcon sx={{ fontSize: 14, color: '#06b6d4' }} /> Time Tracking
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PomodoroStartButton taskId={task.id} taskText={task.text} />
                            <Chip
                                label={(() => {
                                    const mins = task.totalTimeSpent || 0;
                                    if (mins === 0) return '0m';
                                    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
                                })()}
                                size="small"
                                sx={{ fontWeight: 700, bgcolor: '#06b6d418', color: '#06b6d4', fontSize: '0.75rem' }}
                            />
                        </Box>
                    </Box>

                    {/* Manual time input */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                        <TextField
                            size="small" type="number" placeholder="Minutes"
                            value={manualMinutes}
                            onChange={e => setManualMinutes(e.target.value)}
                            sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            slotProps={{ htmlInput: { min: 1, max: 480 } }}
                        />
                        <TextField
                            size="small" placeholder="Note (optional)"
                            value={manualNote}
                            onChange={e => setManualNote(e.target.value)}
                            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                        <Button
                            size="small" variant="outlined"
                            disabled={!manualMinutes || Number(manualMinutes) <= 0}
                            onClick={async () => {
                                if (!user || !manualMinutes) return;
                                const entry = await addManualTimeEntry(
                                    task.id, user.uid, user.displayName || '', Number(manualMinutes), manualNote || undefined
                                );
                                setTimeEntries(prev => [entry, ...prev]);
                                setManualMinutes('');
                                setManualNote('');
                                // Update local task totalTimeSpent
                                onUpdate({ ...task, totalTimeSpent: (task.totalTimeSpent || 0) + Number(manualMinutes) });
                            }}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, minWidth: 60 }}
                        >
                            + Add
                        </Button>
                    </Box>

                    {/* Time log toggle */}
                    {timeEntries.length > 0 && (
                        <>
                            <Button
                                size="small" onClick={() => setShowTimeLog(!showTimeLog)}
                                sx={{ mt: 0.5, textTransform: 'none', fontSize: '0.7rem', color: 'text.secondary' }}
                            >
                                {showTimeLog ? '▲ Hide' : '▼ Show'} {timeEntries.length} entries
                            </Button>
                            <Collapse in={showTimeLog}>
                                <Box sx={{ maxHeight: 150, overflow: 'auto', mt: 0.5 }}>
                                    {timeEntries.map(entry => (
                                        <Box key={entry.id} sx={{
                                            display: 'flex', alignItems: 'center', gap: 1, py: 0.4, px: 0.5,
                                            borderRadius: 1, '&:hover .time-delete': { opacity: 1 },
                                        }}>
                                            <Chip
                                                label={entry.type === 'pomodoro' ? '🍅' : '⏱️'}
                                                size="small" sx={{ height: 20, fontSize: '0.7rem' }}
                                            />
                                            <Typography variant="caption" fontWeight={600} sx={{ minWidth: 40 }}>
                                                {entry.durationMinutes}m
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                                                {entry.note || new Date(entry.startTime).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                {entry.userName}
                                            </Typography>
                                            <IconButton
                                                className="time-delete" size="small"
                                                onClick={async () => {
                                                    await deleteTimeEntry(entry.id, entry.taskId, entry.durationMinutes);
                                                    setTimeEntries(prev => prev.filter(e => e.id !== entry.id));
                                                    onUpdate({ ...task, totalTimeSpent: Math.max(0, (task.totalTimeSpent || 0) - entry.durationMinutes) });
                                                }}
                                                sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.3 }}
                                            >
                                                <DeleteOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            </Collapse>
                        </>
                    )}
                </Box>

                <Divider />

                {/* Type Selector */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Type</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {TASK_TYPES.map(tt => {
                            const cfg = TASK_TYPE_CONFIG[tt];
                            return (
                                <Chip key={tt} label={`${cfg.icon} ${cfg.label}`} size="small"
                                    onClick={() => setTaskType(tt)}
                                    sx={{
                                        fontWeight: taskType === tt ? 700 : 400,
                                        bgcolor: taskType === tt ? cfg.color + '20' : 'transparent',
                                        color: taskType === tt ? cfg.color : 'text.secondary',
                                        border: '1px solid', borderColor: taskType === tt ? cfg.color : 'divider',
                                    }} />
                            );
                        })}
                    </Box>
                </Box>

                {/* Status */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Status</Typography>
                    <FormControl size="small" fullWidth>
                        <Select value={status} onChange={e => setStatus(e.target.value)} sx={{ borderRadius: 2 }}>
                            {STATUS_PRESETS.map(s => {
                                const cfg = STATUS_CONFIG[s] || { label: s, color: '#6b7280' };
                                return (
                                    <MenuItem key={s} value={s}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color }} />
                                            {cfg.label}
                                        </Box>
                                    </MenuItem>
                                );
                            })}
                        </Select>
                    </FormControl>
                </Box>

                {/* Priority */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <FlagIcon sx={{ fontSize: 14, color: priorityCfg?.color || 'inherit' }} /> {t('priority') as string}
                    </Typography>
                    <ToggleButtonGroup value={priority} exclusive onChange={(_, val) => val !== null && setPriority(val)} size="small">
                        {(['P0', 'P1', 'P2', 'P3'] as PriorityLevel[]).map(p => {
                            const cfg = PRIORITY_CONFIG[p];
                            return (
                                <ToggleButton key={p} value={p} sx={{
                                    px: 1.5, fontWeight: 700, fontSize: '0.8rem', color: cfg.color,
                                    '&.Mui-selected': { bgcolor: cfg.bgColor, color: cfg.color }
                                }}>{p}</ToggleButton>
                            );
                        })}
                    </ToggleButtonGroup>
                </Box>

                {/* Estimate (Story Points) */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        🎯 {t('estimate') as string || 'Estimate'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {ESTIMATE_POINTS.filter(p => p > 0).map(pt => {
                            const cfg = ESTIMATE_CONFIG[pt];
                            const isSelected = estimate === pt;
                            return (
                                <Chip key={pt} label={pt} size="small"
                                    onClick={() => setEstimate(isSelected ? null : pt)}
                                    sx={{
                                        minWidth: 36, fontWeight: 700, fontSize: '0.8rem',
                                        bgcolor: isSelected ? cfg.bgColor : 'transparent',
                                        color: isSelected ? cfg.color : 'text.secondary',
                                        border: '1px solid',
                                        borderColor: isSelected ? cfg.color : 'divider',
                                        '&:hover': { bgcolor: cfg.bgColor },
                                    }} />
                            );
                        })}
                    </Box>
                    {estimate !== null && estimate > 0 && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: 'block', fontSize: '0.65rem' }}>
                            {ESTIMATE_CONFIG[estimate].label} — {estimate} {estimate === 1 ? 'point' : 'points'}
                        </Typography>
                    )}
                </Box>

                {/* Due Date */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <CalendarTodayIcon sx={{ fontSize: 14 }} /> {t('dueDateLabel') as string}
                    </Typography>
                    <TextField type="date" size="small" value={dueDate} onChange={e => setDueDate(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        slotProps={{ inputLabel: { shrink: true } }} />
                </Box>

                <Divider />

                {/* Blocker */}
                <Box>
                    <FormControlLabel
                        control={<Switch checked={blockerStatus === 'blocked'} onChange={e => setBlockerStatus(e.target.checked ? 'blocked' : 'none')} color="error" size="small" />}
                        label={
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <BlockIcon sx={{ fontSize: 14, color: blockerStatus === 'blocked' ? '#ef4444' : 'inherit' }} /> Blocker
                            </Typography>
                        }
                    />
                    <Collapse in={blockerStatus === 'blocked'}>
                        <TextField fullWidth size="small" placeholder="What is needed to unblock?" value={blockerDetail}
                            onChange={e => setBlockerDetail(e.target.value)} multiline rows={2}
                            sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    </Collapse>
                </Box>

                {/* Next Action */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <NextPlanIcon sx={{ fontSize: 14 }} /> Next Action
                    </Typography>
                    <TextField fullWidth size="small" placeholder="Who / What / When" value={nextAction}
                        onChange={e => setNextAction(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Box>

                {/* Links */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <LinkIcon sx={{ fontSize: 14 }} /> Links
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InputBase placeholder="https://..." value={linkText} onChange={e => setLinkText(e.target.value)} onKeyDown={handleLinkKeyDown}
                            sx={{ flex: 1, px: 1.5, py: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, fontSize: '0.875rem' }} />
                        <IconButton size="small" onClick={handleAddLink} disabled={!linkText.trim()}><AddIcon fontSize="small" /></IconButton>
                    </Box>
                    {links.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                            {links.map((link, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Chip icon={<OpenInNewIcon />} label={link.length > 50 ? link.substring(0, 50) + '...' : link}
                                        size="small" component="a" href={link} target="_blank" clickable
                                        onDelete={() => setLinks(links.filter((_, j) => j !== i))}
                                        sx={{ fontWeight: 500, maxWidth: '100%' }} />
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>

                {/* AI Usage */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <SmartToyIcon sx={{ fontSize: 14 }} /> AI Usage
                    </Typography>
                    <TextField fullWidth size="small" placeholder="e.g., Antigravity (High Usage ~5), Gemini Pro..." value={aiUsage}
                        onChange={e => setAiUsage(e.target.value)} multiline rows={2}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Box>

                {/* Delay Reason */}
                {isOverdue && (
                    <Box>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: 14 }} /> Delay Reason
                        </Typography>
                        <TextField fullWidth size="small" placeholder="Reason for delay..." value={delayReason}
                            onChange={e => setDelayReason(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    </Box>
                )}

                <Divider />

                {/* Issue Relations */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <AccountTreeIcon sx={{ fontSize: 14 }} /> Issue Relations
                    </Typography>

                    {/* Existing relations */}
                    {relations.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                            {relations.map((rel, idx) => {
                                const cfg = RELATION_TYPE_CONFIG[rel.type];
                                return (
                                    <Box key={idx} sx={{
                                        display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1,
                                        borderRadius: 1.5, bgcolor: 'action.hover',
                                        '&:hover .relation-delete': { opacity: 1 },
                                    }}>
                                        <Chip label={`${cfg.icon} ${cfg.label}`} size="small"
                                            sx={{ height: 22, fontWeight: 600, fontSize: '0.65rem', bgcolor: cfg.color + '18', color: cfg.color }} />
                                        {rel.targetTaskCode && (
                                            <Chip label={rel.targetTaskCode} size="small"
                                                sx={{ height: 20, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.65rem' }} />
                                        )}
                                        <Typography variant="body2" noWrap sx={{ flex: 1, fontSize: '0.82rem', minWidth: 0 }}>
                                            {rel.targetTaskText || rel.targetTaskId}
                                        </Typography>
                                        <IconButton className="relation-delete" size="small"
                                            onClick={() => handleRemoveRelation(idx)}
                                            sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.3 }}>
                                            <DeleteOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                        </IconButton>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}

                    {/* Add new relation */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <Select value={selectedRelationType}
                                onChange={e => setSelectedRelationType(e.target.value as RelationType)}
                                sx={{ borderRadius: 2, fontSize: '0.78rem', fontWeight: 600 }}>
                                {RELATION_TYPES.map(rt => {
                                    const cfg = RELATION_TYPE_CONFIG[rt];
                                    return (
                                        <MenuItem key={rt} value={rt}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography sx={{ fontSize: '0.9rem' }}>{cfg.icon}</Typography>
                                                <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem' }}>{cfg.label}</Typography>
                                            </Box>
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                        <Autocomplete
                            size="small"
                            sx={{ flex: 1 }}
                            options={relationCandidates}
                            inputValue={relationSearchText}
                            onInputChange={(_, val) => setRelationSearchText(val)}
                            onChange={(_, val) => { if (val) handleAddRelation(val as Task); }}
                            getOptionLabel={(opt) => {
                                const tsk = opt as Task;
                                return tsk.taskCode ? `${tsk.taskCode} ${tsk.text}` : tsk.text;
                            }}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                            filterOptions={(options, { inputValue }) => {
                                const q = inputValue.toLowerCase();
                                if (!q) return options.slice(0, 15);
                                return options.filter(o =>
                                    (o.taskCode?.toLowerCase().includes(q)) ||
                                    o.text.toLowerCase().includes(q)
                                );
                            }}
                            renderOption={(props, opt) => (
                                <Box component="li" {...props} key={opt.id}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                                    {opt.taskCode && (
                                        <Chip label={opt.taskCode} size="small"
                                            sx={{ height: 18, fontSize: '0.6rem', fontFamily: 'monospace', fontWeight: 700 }} />
                                    )}
                                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{opt.text}</Typography>
                                    <Chip label={opt.status || 'todo'} size="small" variant="outlined"
                                        sx={{ height: 16, fontSize: '0.5rem' }} />
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField {...params} placeholder="Search task..." size="small"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                            )}
                            value={null}
                            blurOnSelect
                        />
                    </Box>
                </Box>

                <Divider />

                {/* Subtasks */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ChecklistIcon sx={{ fontSize: 14 }} /> {t('subtasks') as string}
                            {subtasks.length > 0 && (
                                <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                                    ({completedSubtasks}/{subtasks.length})
                                </Typography>
                            )}
                        </Typography>
                    </Box>
                    {subtasks.length > 0 && (
                        <LinearProgress variant="determinate" value={subtaskProgress}
                            sx={{ borderRadius: 4, height: 6, mb: 1.5, bgcolor: 'action.hover' }} />
                    )}
                    {subtasks.map(sub => (
                        <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.5, '&:hover .sub-delete': { opacity: 1 } }}>
                            <Checkbox checked={sub.completed} onChange={() => handleToggleSubtask(sub.id)} size="small" sx={{ p: 0.5 }} />
                            <Typography variant="body2" sx={{
                                flex: 1, textDecoration: sub.completed ? 'line-through' : 'none',
                                color: sub.completed ? 'text.secondary' : 'text.primary',
                            }}>{sub.text}</Typography>
                            <IconButton className="sub-delete" size="small" onClick={() => handleDeleteSubtask(sub.id)}
                                sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.5 }}>
                                <DeleteOutlineIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            </IconButton>
                        </Box>
                    ))}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <AddIcon sx={{ fontSize: 18, color: 'text.disabled', ml: 0.5 }} />
                        <InputBase placeholder={t('addSubtask') as string} value={newSubtaskText}
                            onChange={e => setNewSubtaskText(e.target.value)} onKeyDown={handleSubtaskKeyDown}
                            sx={{ flex: 1, fontSize: '0.875rem' }} />
                    </Box>
                </Box>

                <Divider />

                {/* Sub-issues (Full Task children) */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SubdirectoryArrowRightIcon sx={{ fontSize: 14 }} /> {t('subIssues') as string}
                            {childTasks.length > 0 && (
                                <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                                    ({completedChildTasks}/{childTasks.length})
                                </Typography>
                            )}
                        </Typography>
                    </Box>
                    {childTasks.length > 0 && (
                        <LinearProgress variant="determinate"
                            value={childTasks.length > 0 ? (completedChildTasks / childTasks.length) * 100 : 0}
                            sx={{
                                borderRadius: 4, height: 6, mb: 1.5, bgcolor: 'action.hover',
                                '& .MuiLinearProgress-bar': { bgcolor: '#8b5cf6' }
                            }} />
                    )}
                    {childTasks.map(child => {
                        const childStatusCfg = STATUS_CONFIG[child.status || 'todo'] || STATUS_CONFIG['todo'];
                        return (
                            <Box key={child.id}
                                onClick={() => onTaskClick?.(child)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1, py: 0.8, px: 1,
                                    borderRadius: 1.5, cursor: 'pointer',
                                    '&:hover': { bgcolor: 'action.hover' },
                                    transition: 'background 0.15s',
                                }}
                            >
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: childStatusCfg.color, flexShrink: 0 }} />
                                <Typography variant="body2" sx={{
                                    flex: 1, fontWeight: 500,
                                    textDecoration: child.completed ? 'line-through' : 'none',
                                    color: child.completed ? 'text.secondary' : 'text.primary',
                                }}>
                                    {child.text}
                                </Typography>
                                {child.priority && (
                                    <Chip label={child.priority} size="small" sx={{
                                        height: 18, fontSize: '0.6rem', fontWeight: 700,
                                        bgcolor: (PRIORITY_CONFIG[child.priority as PriorityLevel]?.bgColor || '#f5f5f5'),
                                        color: (PRIORITY_CONFIG[child.priority as PriorityLevel]?.color || '#666'),
                                    }} />
                                )}
                                {child.assigneeName && (
                                    <Avatar src={child.assigneePhoto} sx={{ width: 20, height: 20, fontSize: 9 }}>
                                        {child.assigneeName.charAt(0)}
                                    </Avatar>
                                )}
                            </Box>
                        );
                    })}
                    {/* Add sub-issue inline */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <SubdirectoryArrowRightIcon sx={{ fontSize: 16, color: 'text.disabled', ml: 0.5 }} />
                        <InputBase
                            placeholder={t('addSubIssue') as string}
                            value={newSubIssueText}
                            onChange={e => setNewSubIssueText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.nativeEvent.isComposing && newSubIssueText.trim()) {
                                    e.preventDefault();
                                    onCreateSubIssue?.(task, newSubIssueText.trim());
                                    setNewSubIssueText('');
                                }
                            }}
                            sx={{ flex: 1, fontSize: '0.875rem' }}
                        />
                    </Box>
                </Box>

                <Divider />

                {/* Audit Trail Footer */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="caption" color="text.disabled">
                        {t('created') as string}: {task.createdAt}
                    </Typography>
                    {task.updatedAt && (
                        <Typography variant="caption" color="text.disabled">
                            Last Updated: {task.updatedAt}
                            {task.updatedByName && ` by ${task.updatedByName}`}
                        </Typography>
                    )}
                </Box>

                <Divider />

                {/* Activity Log */}
                <ActivityFeed entityType="task" entityId={task.id} compact limit={20}
                  title={lang === 'ko' ? '변경 이력' : 'Change History'} />

            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} color="inherit" sx={{ borderRadius: 2 }}>{t('cancel') as string}</Button>
                <Button variant="contained" onClick={() => { handleSave(); onClose(); }} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('save') as string}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default TaskDetailDialog;
