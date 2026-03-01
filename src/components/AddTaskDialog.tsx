import { useState, useEffect, useRef } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, ToggleButtonGroup, ToggleButton, Chip, Typography,
    InputBase, IconButton, Avatar, Tooltip, FormControl, Select, MenuItem, Menu,
    Switch, FormControlLabel, Collapse, Divider, AvatarGroup, Paper,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import BlockIcon from '@mui/icons-material/Block';
import NextPlanIcon from '@mui/icons-material/NextPlan';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RepeatIcon from '@mui/icons-material/Repeat';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import type { TaskType, TaskOwner, PriorityLevel, IssueTemplate, EstimatePoint } from '../types';
import { TASK_TYPES, TASK_TYPE_CONFIG, PRIORITY_CONFIG, ESTIMATE_POINTS, ESTIMATE_CONFIG } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { fetchIssueTemplates, createIssueTemplate, updateIssueTemplate, deleteIssueTemplate } from '../services/issueTemplateService';
import IssueTemplateDialog from './IssueTemplateDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { toast } from 'sonner';
import { CATEGORY_COLORS } from '../constants/colors';
import BlockEditor from './BlockEditor';



interface AddTaskDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: {
        text: string; description?: string; priority?: string;
        category?: string; categoryColor?: string; dueDate?: string; tags?: string[];
        date?: Date; assigneeId?: string; assigneeName?: string; assigneePhoto?: string;
        sprintId?: string; type?: TaskType; owners?: TaskOwner[];
        blockerStatus?: 'none' | 'blocked'; blockerDetail?: string;
        nextAction?: string; links?: string[];
        estimate?: number;
        recurringConfig?: { type: string; interval: number };
        attachments?: { name: string; url: string }[];
        subtasks?: string[];
    }) => void;
    defaultDate?: Date;
}

const AddTaskDialog = ({ open, onClose, onSubmit, defaultDate }: AddTaskDialogProps) => {
    const { t, lang } = useLanguage();
    const { currentMembers, sprints, currentSprint, currentProject, currentWorkspace } = useWorkspace();
    const { user } = useAuth();
    const defaultDueDate = defaultDate ? defaultDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Quick vs Detail mode
    const [detailMode, setDetailMode] = useState(false);

    // Core fields
    const [text, setText] = useState('');
    const [description, setDescription] = useState('');
    const descriptionRef = useRef('');
    const [priority, setPriority] = useState<PriorityLevel | ''>('');
    const [taskType, setTaskType] = useState<TaskType>('task');
    const [category, setCategory] = useState('');
    const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0]);
    const [dueDate, setDueDate] = useState(defaultDueDate);
    const [tagText, setTagText] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [sprintId, setSprintId] = useState(currentSprint?.id || '');

    // Multi-owner
    const [selectedOwners, setSelectedOwners] = useState<TaskOwner[]>([]);

    // Enterprise fields
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockerDetail, setBlockerDetail] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [linkText, setLinkText] = useState('');
    const [links, setLinks] = useState<string[]>([]);

    // Estimate
    const [estimate, setEstimate] = useState<EstimatePoint | null>(null);

    // Advanced Sub
    const [recurring, setRecurring] = useState<string>('none');
    const [attachments, setAttachments] = useState<{ name: string, url: string }[]>([]);
    const [subtasks, setSubtasks] = useState<string[]>([]);

    // Issue Templates
    const [templates, setTemplates] = useState<IssueTemplate[]>([]);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<IssueTemplate | null>(null);

    // Load templates for workspace
    useEffect(() => {
        if (!currentWorkspace || !open) return;
        let cancelled = false;
        fetchIssueTemplates(currentWorkspace.id).then(tpls => {
            if (!cancelled) setTemplates(tpls);
        }).catch(e => console.error('Failed to load templates:', e));
        return () => { cancelled = true; };
    }, [currentWorkspace, open]);

    const handleApplyTemplate = (template: IssueTemplate) => {
        if (activeTemplateId === template.id) {
            // Deselect
            setActiveTemplateId(null);
            return;
        }
        setActiveTemplateId(template.id);
        if (template.titlePattern) setText(template.titlePattern);
        if (template.defaultDescription) setDescription(template.defaultDescription);
        if (template.defaultType) setTaskType(template.defaultType);
        if (template.defaultPriority) setPriority(template.defaultPriority);
        if (template.defaultTags) setTags(template.defaultTags);
        if (template.defaultCategory) setCategory(template.defaultCategory);
        if (template.defaultCategoryColor) setCategoryColor(template.defaultCategoryColor);
        if (template.defaultSubtasks) setSubtasks(template.defaultSubtasks);
        if (template.defaultDescription || template.defaultCategory || template.defaultTags?.length || template.defaultSubtasks?.length) {
            setDetailMode(true);
        }
    };

    const handleCreateOrUpdateTemplate = async (data: {
        name: string; icon: string; description?: string;
        titlePattern?: string; defaultDescription?: string;
        defaultType?: TaskType; defaultPriority?: PriorityLevel;
        defaultTags?: string[]; defaultCategory?: string; defaultCategoryColor?: string;
        defaultBlockerStatus?: 'none' | 'blocked';
        defaultSubtasks?: string[];
    }) => {
        if (editingTemplate) {
            try {
                await updateIssueTemplate(editingTemplate.id, data);
                setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...data } : t));
                toast.success('Template updated');
            } catch (e) { console.error(e); toast.error('Failed to update template'); }
            setEditingTemplate(null);
        } else {
            if (!currentProject || !currentWorkspace || !user) {
                toast.error('Please select a project first');
                return;
            }
            try {
                const tpl = await createIssueTemplate({
                    ...data,
                    projectId: currentProject.id,
                    workspaceId: currentWorkspace.id,
                    createdBy: user.uid,
                });
                setTemplates(prev => [...prev, tpl]);
                toast.success(`Template "${data.name}" created`);
            } catch (e) { console.error(e); toast.error('Failed to create template'); }
        }
    };

    const handleDeleteTemplate = async (tplId: string) => {
        try {
            await deleteIssueTemplate(tplId);
            setTemplates(prev => prev.filter(t => t.id !== tplId));
            if (activeTemplateId === tplId) setActiveTemplateId(null);
            toast.success('Template deleted');
        } catch (e) { console.error(e); toast.error('Failed to delete template'); }
    };

    // Template context menu
    const [tplMenuAnchor, setTplMenuAnchor] = useState<null | HTMLElement>(null);
    const [tplMenuTarget, setTplMenuTarget] = useState<IssueTemplate | null>(null);

    const handleTplContextMenu = (e: React.MouseEvent<HTMLElement>, tpl: IssueTemplate) => {
        e.preventDefault();
        e.stopPropagation();
        setTplMenuAnchor(e.currentTarget);
        setTplMenuTarget(tpl);
    };

    const handleAddTag = () => {
        const trimmed = tagText.trim().replace(/^#/, '');
        if (trimmed && !tags.includes(trimmed)) { setTags([...tags, trimmed]); setTagText(''); }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && tagText.trim()) { e.preventDefault(); handleAddTag(); }
    };

    const handleToggleOwner = (uid: string, name: string, photo?: string) => {
        setSelectedOwners(prev => {
            const exists = prev.some(o => o.uid === uid);
            if (exists) return prev.filter(o => o.uid !== uid);
            return [...prev, { uid, name, photo }];
        });
    };

    const handleAddLink = () => {
        const trimmed = linkText.trim();
        if (trimmed && !links.includes(trimmed)) { setLinks([...links, trimmed]); setLinkText(''); }
    };

    const handleLinkKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && linkText.trim()) { e.preventDefault(); handleAddLink(); }
    };

    const handleSubmit = () => {
        if (!text.trim()) return;
        onSubmit({
            text: text.trim(),
            description: descriptionRef.current.trim() || undefined,
            priority: priority || undefined,
            type: taskType,
            category: category.trim() || undefined,
            categoryColor: category.trim() ? categoryColor : undefined,
            dueDate: dueDate || undefined,
            tags: tags.length > 0 ? tags : undefined,
            date: defaultDate,
            owners: selectedOwners.length > 0 ? selectedOwners : undefined,
            // Legacy single assignee fallback (first owner)
            assigneeId: selectedOwners.length > 0 ? selectedOwners[0].uid : undefined,
            assigneeName: selectedOwners.length > 0 ? selectedOwners[0].name : undefined,
            assigneePhoto: selectedOwners.length > 0 ? selectedOwners[0].photo : undefined,
            sprintId: sprintId || undefined,
            blockerStatus: isBlocked ? 'blocked' : undefined,
            blockerDetail: isBlocked ? (blockerDetail.trim() || undefined) : undefined,
            nextAction: nextAction.trim() || undefined,
            links: links.length > 0 ? links : undefined,
            estimate: estimate ?? undefined,
            recurringConfig: recurring === 'none' ? undefined : { type: recurring, interval: 1 },
            attachments: attachments.length > 0 ? attachments : undefined,
            subtasks: subtasks.length > 0 ? subtasks : undefined,
        });
        // Reset
        setText(''); setDescription(''); descriptionRef.current = ''; setPriority(''); setTaskType('task');
        setCategory(''); setCategoryColor(CATEGORY_COLORS[0]);
        setDueDate(defaultDueDate);
        setTagText(''); setTags([]); setSelectedOwners([]);
        setSprintId(currentSprint?.id || ''); setIsBlocked(false); setBlockerDetail('');
        setNextAction(''); setLinkText(''); setLinks([]); setShowAdvanced(false);
        setEstimate(null);
        setRecurring('none');
        setAttachments([]);
        setSubtasks([]);
        setDetailMode(false);
        onClose();
    };

    const dialogContent = (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '1.25rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ fontSize: '1.25rem' }}>{TASK_TYPE_CONFIG[taskType].icon}</Box>
                {t('addTask') as string}
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>
                {/* Template Selector */}
                {templates.length > 0 && (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                📄 {t('templates') as string || 'Templates'}
                            </Typography>
                            <IconButton size="small" onClick={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }}
                                sx={{ p: 0.3 }}>
                                <SettingsIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                            </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {templates.map(tpl => {
                                const isActive = activeTemplateId === tpl.id;
                                return (
                                    <Chip key={tpl.id}
                                        label={`${tpl.icon} ${tpl.name}`}
                                        size="small"
                                        onClick={() => handleApplyTemplate(tpl)}
                                        onContextMenu={(e: React.MouseEvent<HTMLElement>) => handleTplContextMenu(e, tpl)}
                                        onDelete={isActive ? () => {
                                            setActiveTemplateId(null);
                                        } : undefined}
                                        sx={{
                                            fontWeight: isActive ? 700 : 500,
                                            bgcolor: isActive ? 'primary.main' + '15' : 'transparent',
                                            color: isActive ? 'primary.main' : 'text.secondary',
                                            border: '1px solid',
                                            borderColor: isActive ? 'primary.main' : 'divider',
                                            '&:hover': { bgcolor: 'primary.main' + '08' },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                )}

                {/* Create template hint if none */}
                {templates.length === 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="small" color="inherit"
                            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                            onClick={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }}
                            sx={{ fontSize: '0.7rem', color: 'text.disabled', textTransform: 'none' }}>
                            {t('createTemplate') as string || 'Create Template'}
                        </Button>
                    </Box>
                )}
                {/* Title — always visible */}
                <TextField autoFocus fullWidth placeholder={t('taskTitle') as string} value={text}
                    onChange={e => setText(e.target.value)} variant="outlined"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing && !detailMode && text.trim()) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontWeight: 600, fontSize: '1rem' } }} />

                {/* Priority — always visible (quick mode essential) */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FlagIcon sx={{ fontSize: 14 }} /> {t('priority') as string}
                    </Typography>
                    <ToggleButtonGroup value={priority} exclusive onChange={(_, val) => val !== null && setPriority(val)} size="small" sx={{ mt: 0.5 }}>
                        {(['P0', 'P1', 'P2', 'P3'] as PriorityLevel[]).map(p => {
                            const cfg = PRIORITY_CONFIG[p];
                            return (
                                <ToggleButton key={p} value={p} sx={{
                                    px: 2, color: cfg.color, fontWeight: 700, fontSize: '0.8rem',
                                    '&.Mui-selected': { bgcolor: cfg.bgColor, color: cfg.color, borderColor: cfg.color }
                                }}>
                                    {p}
                                </ToggleButton>
                            );
                        })}
                    </ToggleButtonGroup>
                </Box>

                {/* Quick mode hint */}
                {!detailMode && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            onClick={() => setDetailMode(true)}
                            size="small" color="inherit"
                            endIcon={<ExpandMoreIcon />}
                            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', fontSize: '0.8rem' }}
                        >
                            {t('moreDetails') as string || 'More details'}
                        </Button>
                        <Chip label="Enter ↵" size="small" variant="outlined"
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, borderRadius: 1.5 }} />
                    </Box>
                )}

                {/* Detail Mode — all remaining fields */}
                <Collapse in={detailMode}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Description (Block Editor) */}
                        <BlockEditor
                            key={detailMode ? 'add-task-editor' : 'add-task-hidden'}
                            initialContent={description}
                            onChange={(md) => { descriptionRef.current = md; }}
                            minHeight={70}
                        />

                        {/* Task Type */}
                        <Box>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                                {t('type') as string}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                {TASK_TYPES.map(tt => {
                                    const cfg = TASK_TYPE_CONFIG[tt];
                                    const isSelected = taskType === tt;
                                    return (
                                        <Chip key={tt} label={`${cfg.icon} ${cfg.label}`} size="small"
                                            onClick={() => setTaskType(tt)}
                                            sx={{
                                                fontWeight: isSelected ? 700 : 400,
                                                bgcolor: isSelected ? cfg.color + '20' : 'transparent',
                                                color: isSelected ? cfg.color : 'text.secondary',
                                                border: '1px solid',
                                                borderColor: isSelected ? cfg.color : 'divider',
                                                '&:hover': { bgcolor: cfg.color + '10' },
                                            }} />
                                    );
                                })}
                            </Box>
                        </Box>

                        {/* Sprint selector */}
                        {sprints.length > 0 && (
                            <Box>
                                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <RocketLaunchIcon sx={{ fontSize: 14 }} /> {t('sprint') as string}
                                </Typography>
                                <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
                                    <Select value={sprintId} onChange={e => setSprintId(e.target.value)}
                                        displayEmpty sx={{ borderRadius: 2 }}>
                                        <MenuItem value="">{t('backlog') as string}</MenuItem>
                                        {sprints.map(sp => (
                                            <MenuItem key={sp.id} value={sp.id}>
                                                {sp.type === 'sprint' ? '🏃' : sp.type === 'phase' ? '📋' : '🎯'} {sp.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        )}

                        {/* Estimate (Story Points) */}
                        <Box>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                🎯 {t('estimate') as string || 'Estimate'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
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
                            {estimate !== null && (
                                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: 'block', fontSize: '0.65rem' }}>
                                    {ESTIMATE_CONFIG[estimate].label} — {estimate} {estimate === 1 ? 'point' : 'points'}
                                </Typography>
                            )}
                        </Box>
                        {/* Multi-Owner */}
                        {currentMembers.length > 1 && (
                            <Box>
                                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <PersonAddIcon sx={{ fontSize: 14 }} /> {t('owners') as string} {selectedOwners.length > 0 && `(${selectedOwners.length})`}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                    {currentMembers.map(member => {
                                        const isSelected = selectedOwners.some(o => o.uid === member.uid);
                                        return (
                                            <Tooltip key={member.uid} title={member.displayName}>
                                                <Box onClick={() => handleToggleOwner(member.uid, member.displayName, member.photoURL)}
                                                    sx={{
                                                        display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.5, borderRadius: 2,
                                                        cursor: 'pointer', border: '2px solid',
                                                        borderColor: isSelected ? 'primary.main' : 'divider',
                                                        bgcolor: isSelected ? 'primary.main' + '12' : 'transparent',
                                                        '&:hover': { borderColor: 'primary.light' }
                                                    }}>
                                                    <Avatar src={member.photoURL} sx={{ width: 24, height: 24, fontSize: 11 }}>{member.displayName.charAt(0)}</Avatar>
                                                    <Typography variant="caption" fontWeight={isSelected ? 700 : 400}>{member.displayName}</Typography>
                                                </Box>
                                            </Tooltip>
                                        );
                                    })}
                                </Box>
                                {selectedOwners.length > 0 && (
                                    <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 20, height: 20, fontSize: 10, border: '1px solid white' } }}>
                                            {selectedOwners.map(o => <Avatar key={o.uid} src={o.photo} sx={{ width: 20, height: 20 }}>{o.name.charAt(0)}</Avatar>)}
                                        </AvatarGroup>
                                        <Typography variant="caption" color="text.secondary">{selectedOwners.map(o => o.name).join(', ')}</Typography>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* Due Date */}
                        <Box>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarTodayIcon sx={{ fontSize: 14 }} /> {t('dueDateLabel') as string}
                            </Typography>
                            <TextField type="date" size="small" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                slotProps={{ inputLabel: { shrink: true } }} />
                        </Box>

                        {/* Category */}
                        <Box>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{t('categoryLabel') as string}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField size="small" placeholder={t('categoryPlaceholder') as string} value={category}
                                    onChange={e => setCategory(e.target.value)} sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {CATEGORY_COLORS.slice(0, 5).map(c => (
                                        <Box key={c} onClick={() => setCategoryColor(c)}
                                            sx={{
                                                width: 24, height: 24, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                                                border: categoryColor === c ? '3px solid' : '2px solid transparent',
                                                borderColor: categoryColor === c ? 'text.primary' : 'transparent'
                                            }} />
                                    ))}
                                </Box>
                            </Box>
                        </Box>

                        {/* Tags */}
                        <Box>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocalOfferIcon sx={{ fontSize: 14 }} /> {t('tags') as string}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <InputBase placeholder={t('tagPlaceholder') as string} value={tagText} onChange={e => setTagText(e.target.value)} onKeyDown={handleTagKeyDown}
                                    sx={{ flex: 1, px: 1.5, py: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, fontSize: '0.875rem' }} />
                                <IconButton size="small" onClick={handleAddTag} disabled={!tagText.trim()}><AddIcon fontSize="small" /></IconButton>
                            </Box>
                            {tags.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                    {tags.map(tag => <Chip key={tag} label={`#${tag}`} size="small" onDelete={() => setTags(tags.filter(tg => tg !== tag))} sx={{ fontWeight: 600 }} />)}
                                </Box>
                            )}
                        </Box>

                        {/* Advanced Section Toggle */}
                        <Divider />
                        <Button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            size="small" color="inherit"
                            endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ alignSelf: 'flex-start', fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}
                        >
                            {t('advancedFields') as string}
                        </Button>

                        <Collapse in={showAdvanced}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Blocker */}
                                <Box>
                                    <FormControlLabel
                                        control={<Switch checked={isBlocked} onChange={e => setIsBlocked(e.target.checked)} color="error" size="small" />}
                                        label={
                                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <BlockIcon sx={{ fontSize: 14, color: isBlocked ? '#ef4444' : 'inherit' }} /> {t('blocker') as string}
                                            </Typography>
                                        }
                                    />
                                    <Collapse in={isBlocked}>
                                        <TextField fullWidth size="small" placeholder={t('blockerPlaceholder') as string} value={blockerDetail}
                                            onChange={e => setBlockerDetail(e.target.value)}
                                            sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                    </Collapse>
                                </Box>

                                {/* Next Action */}
                                <Box>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <NextPlanIcon sx={{ fontSize: 14 }} /> {t('nextAction') as string}
                                    </Typography>
                                    <TextField fullWidth size="small" placeholder={t('nextActionPlaceholder') as string} value={nextAction}
                                        onChange={e => setNextAction(e.target.value)}
                                        sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Box>

                                {/* Links */}
                                <Box>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <LinkIcon sx={{ fontSize: 14 }} /> {t('linksLabel') as string}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <InputBase placeholder="https://..." value={linkText} onChange={e => setLinkText(e.target.value)} onKeyDown={handleLinkKeyDown}
                                            sx={{ flex: 1, px: 1.5, py: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, fontSize: '0.875rem' }} />
                                        <IconButton size="small" onClick={handleAddLink} disabled={!linkText.trim()}><AddIcon fontSize="small" /></IconButton>
                                    </Box>
                                    {links.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                            {links.map((link, i) => (
                                                <Chip key={i} icon={<LinkIcon />} label={link.length > 40 ? link.substring(0, 40) + '...' : link}
                                                    size="small" onDelete={() => setLinks(links.filter((_, j) => j !== i))}
                                                    sx={{ fontWeight: 500 }} />
                                            ))}
                                        </Box>
                                    )}
                                </Box>

                                {/* Recurring tasks setup */}
                                <Box>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <RepeatIcon sx={{ fontSize: 14 }} /> {lang === 'ko' ? '반복 설정' : 'Recurring'}
                                    </Typography>
                                    <Select size="small" value={recurring} onChange={e => setRecurring(e.target.value)}
                                        sx={{ borderRadius: 2, minWidth: 150, fontSize: '0.875rem' }}>
                                        <MenuItem value="none">{lang === 'ko' ? '반복 안함' : 'None'}</MenuItem>
                                        <MenuItem value="daily">{lang === 'ko' ? '매일' : 'Daily'}</MenuItem>
                                        <MenuItem value="weekly">{lang === 'ko' ? '매주' : 'Weekly'}</MenuItem>
                                        <MenuItem value="monthly">{lang === 'ko' ? '매월' : 'Monthly'}</MenuItem>
                                    </Select>
                                </Box>

                                {/* Attachments setup */}
                                <Box>
                                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                        <AttachFileIcon sx={{ fontSize: 14 }} /> {lang === 'ko' ? '첨부 파일' : 'Attachments'}
                                    </Typography>

                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            borderStyle: 'dashed', borderColor: 'divider', p: 2, mb: 1,
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                            bgcolor: 'action.hover', cursor: 'pointer', borderRadius: 2
                                        }}
                                        onClick={() => {
                                            // Make Mock File in AddDialog
                                            const fileName = `Mock_File_${attachments.length + 1}.pdf`;
                                            setAttachments([...attachments, { name: fileName, url: '#' }]);
                                            toast.success(`${fileName} attached!`);
                                        }}
                                    >
                                        <CloudUploadOutlinedIcon color="primary" />
                                        <Typography variant="caption" color="text.secondary">
                                            {lang === 'ko' ? '클릭하여 파일 업로드 (Mock)' : 'Click to upload (Mock)'}
                                        </Typography>
                                    </Paper>

                                    {attachments.length > 0 && (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {attachments.map((file, i) => (
                                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                                                    <AttachFileIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                    <Typography variant="caption" sx={{ flex: 1, textDecoration: 'underline', cursor: 'pointer' }}>
                                                        {file.name}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </Box>

                            </Box>
                        </Collapse>
                    </Box>
                </Collapse>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2, fontWeight: 600 }}>{t('cancel') as string}</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!text.trim()} sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}>{t('addTask') as string}</Button>
            </DialogActions>
        </Dialog>
    );

    return (
        <>
            {dialogContent}

            {/* Template Context Menu */}
            <Menu anchorEl={tplMenuAnchor} open={Boolean(tplMenuAnchor)}
                onClose={() => { setTplMenuAnchor(null); setTplMenuTarget(null); }}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 140, py: 0.5 } }}>
                <MenuItem onClick={() => {
                    if (tplMenuTarget) { setEditingTemplate(tplMenuTarget); setTemplateDialogOpen(true); }
                    setTplMenuAnchor(null); setTplMenuTarget(null);
                }} sx={{ fontSize: '0.8rem', py: 0.7 }}>
                    <EditIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    {t('editTemplate') as string || 'Edit Template'}
                </MenuItem>
                <MenuItem onClick={() => {
                    if (tplMenuTarget) handleDeleteTemplate(tplMenuTarget.id);
                    setTplMenuAnchor(null); setTplMenuTarget(null);
                }} sx={{ fontSize: '0.8rem', py: 0.7, color: 'error.main' }}>
                    <DeleteOutlineIcon sx={{ fontSize: 16, mr: 1 }} />
                    {t('delete') as string || 'Delete'}
                </MenuItem>
            </Menu>
            <IssueTemplateDialog
                open={templateDialogOpen}
                onClose={() => { setTemplateDialogOpen(false); setEditingTemplate(null); }}
                onSave={handleCreateOrUpdateTemplate}
                editTemplate={editingTemplate}
            />
        </>
    );
};

export default AddTaskDialog;
