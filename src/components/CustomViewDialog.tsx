// src/components/CustomViewDialog.tsx
import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, TextField,
    Button, Chip, ToggleButtonGroup, ToggleButton, Switch, FormControlLabel,
    Select, MenuItem, FormControl,
} from '@mui/material';
import type { CustomView, ViewFilter, PriorityLevel, TaskType } from '../types';
import {
    PRIORITY_LEVELS, PRIORITY_CONFIG, TASK_TYPES, TASK_TYPE_CONFIG,
    STATUS_PRESETS, STATUS_CONFIG, VIEW_ICONS, VIEW_COLORS,
} from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface CustomViewDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: { name: string; icon: string; color: string; filters: ViewFilter; viewMode?: 'list' | 'board' | 'calendar' | 'table' }) => void;
    editView?: CustomView | null;
    allTags?: string[];
}

const CustomViewDialog = ({ open, onClose, onSave, editView, allTags = [] }: CustomViewDialogProps) => {
    const { t } = useLanguage();

    const [name, setName] = useState('');
    const [nameError, setNameError] = useState(false);
    const [icon, setIcon] = useState('📋');
    const [color, setColor] = useState('#6366f1');

    // Filter state
    const [statuses, setStatuses] = useState<string[]>([]);
    const [priorities, setPriorities] = useState<PriorityLevel[]>([]);
    const [types, setTypes] = useState<TaskType[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [hasBlocker, setHasBlocker] = useState(false);
    const [hasDueDate, setHasDueDate] = useState<string>('');
    const [viewMode, setViewMode] = useState<string>('');

    // Populate from editView
    useEffect(() => {
        if (editView) {
            setName(editView.name);
            setIcon(editView.icon);
            setColor(editView.color);
            setStatuses(editView.filters.statuses || []);
            setPriorities(editView.filters.priorities || []);
            setTypes(editView.filters.types || []);
            setTags(editView.filters.tags || []);
            setHideCompleted(editView.filters.hideCompleted || false);
            setHasBlocker(editView.filters.hasBlocker || false);
            setHasDueDate(editView.filters.hasDueDate || '');
            setViewMode(editView.viewMode || '');
        } else {
            setName(''); setIcon('📋'); setColor('#6366f1');
            setStatuses([]); setPriorities([]); setTypes([]);
            setTags([]); setHideCompleted(false); setHasBlocker(false);
            setHasDueDate(''); setViewMode('');
        }
    }, [editView, open]);



    const handleSave = () => {
        if (!name.trim()) {
            setNameError(true);
            return;
        }
        setNameError(false);
        const filters: ViewFilter = {};
        if (statuses.length > 0) filters.statuses = statuses;
        if (priorities.length > 0) filters.priorities = priorities;
        if (types.length > 0) filters.types = types;
        if (tags.length > 0) filters.tags = tags;
        if (hideCompleted) filters.hideCompleted = true;
        if (hasBlocker) filters.hasBlocker = true;
        if (hasDueDate) filters.hasDueDate = hasDueDate as ViewFilter['hasDueDate'];

        onSave({
            name: name.trim(),
            icon,
            color,
            filters,
            viewMode: (viewMode || undefined) as 'list' | 'board' | 'calendar' | 'table' | undefined,
        });
        onClose();
    };

    const toggleStatus = (s: string) =>
        setStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    const togglePriority = (p: PriorityLevel) =>
        setPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    const toggleType = (tt: TaskType) =>
        setTypes(prev => prev.includes(tt) ? prev.filter(x => x !== tt) : [...prev, tt]);
    const toggleTag = (tag: string) =>
        setTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]);

    const filterCount = statuses.length + priorities.length + types.length
        + tags.length + (hideCompleted ? 1 : 0) + (hasBlocker ? 1 : 0) + (hasDueDate ? 1 : 0);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3, maxHeight: '85vh' } }}>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '1.4rem' }}>{icon}</Typography>
                {editView ? (t('editView') as string || 'Edit View') : (t('createView') as string || 'Create View')}
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>
                {/* Name */}
                <TextField autoFocus fullWidth label={t('viewName') as string || 'View Name'}
                    required
                    error={nameError}
                    helperText={nameError ? 'View name is required' : ''}
                    value={name} onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

                {/* Icon & Color */}
                <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            {t('icon') as string || 'Icon'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {VIEW_ICONS.map(ic => (
                                <Box key={ic} role="button" tabIndex={0} onClick={() => setIcon(ic)}
                                    sx={{
                                        width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', cursor: 'pointer', fontSize: '1rem',
                                        border: '2px solid', borderColor: icon === ic ? color : 'transparent',
                                        bgcolor: icon === ic ? color + '15' : 'action.hover',
                                        '&:hover': { bgcolor: color + '10' },
                                    }}>{ic}</Box>
                            ))}
                        </Box>
                    </Box>
                    <Box>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            {t('color') as string || 'Color'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {VIEW_COLORS.map(c => (
                                <Box key={c} role="button" tabIndex={0} onClick={() => setColor(c)}
                                    sx={{
                                        width: 24, height: 24, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                                        border: color === c ? '3px solid' : '2px solid transparent',
                                        borderColor: color === c ? 'text.primary' : 'transparent',
                                    }} />
                            ))}
                        </Box>
                    </Box>
                </Box>

                {/* Default View Mode */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        {t('defaultViewMode') as string || 'Default View Mode'}
                    </Typography>
                    <ToggleButtonGroup value={viewMode} exclusive
                        onChange={(_, v) => setViewMode(v || '')} size="small">
                        <ToggleButton value="">Auto</ToggleButton>
                        <ToggleButton value="list">List</ToggleButton>
                        <ToggleButton value="board">Board</ToggleButton>
                        <ToggleButton value="calendar">Calendar</ToggleButton>
                        <ToggleButton value="table">Table</ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* ─── FILTERS ─── */}
                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        🔍 {t('filters') as string || 'Filters'}
                        {filterCount > 0 && (
                            <Chip label={filterCount} size="small"
                                sx={{ height: 18, minWidth: 18, fontWeight: 700, fontSize: '0.6rem', bgcolor: color, color: 'white' }} />
                        )}
                    </Typography>
                    {filterCount === 0 && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', mb: 1, display: 'block' }}>
                            💡 Add at least one filter to make this view useful
                        </Typography>
                    )}

                    {/* Status */}
                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.3, display: 'block', fontSize: '0.7rem' }}>
                            Status
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                            {STATUS_PRESETS.map(s => {
                                const cfg = STATUS_CONFIG[s];
                                const active = statuses.includes(s);
                                return (
                                    <Chip key={s} label={cfg.label} size="small" onClick={() => toggleStatus(s)}
                                        sx={{
                                            height: 24, fontSize: '0.68rem', fontWeight: active ? 700 : 400,
                                            bgcolor: active ? cfg.color + '20' : 'transparent',
                                            color: active ? cfg.color : 'text.secondary',
                                            border: '1px solid', borderColor: active ? cfg.color : 'divider',
                                        }} />
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Priority */}
                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.3, display: 'block', fontSize: '0.7rem' }}>
                            Priority
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                            {PRIORITY_LEVELS.map(p => {
                                const cfg = PRIORITY_CONFIG[p];
                                const active = priorities.includes(p);
                                return (
                                    <Chip key={p} label={p} size="small" onClick={() => togglePriority(p)}
                                        sx={{
                                            height: 24, fontSize: '0.68rem', fontWeight: active ? 700 : 400,
                                            bgcolor: active ? cfg.bgColor : 'transparent',
                                            color: active ? cfg.color : 'text.secondary',
                                            border: '1px solid', borderColor: active ? cfg.color : 'divider',
                                        }} />
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Type */}
                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.3, display: 'block', fontSize: '0.7rem' }}>
                            Type
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                            {TASK_TYPES.map(tt => {
                                const cfg = TASK_TYPE_CONFIG[tt];
                                const active = types.includes(tt);
                                return (
                                    <Chip key={tt} label={`${cfg.icon} ${cfg.label}`} size="small" onClick={() => toggleType(tt)}
                                        sx={{
                                            height: 24, fontSize: '0.68rem', fontWeight: active ? 700 : 400,
                                            bgcolor: active ? cfg.color + '15' : 'transparent',
                                            color: active ? cfg.color : 'text.secondary',
                                            border: '1px solid', borderColor: active ? cfg.color : 'divider',
                                        }} />
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Tags */}
                    {allTags.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.3, display: 'block', fontSize: '0.7rem' }}>
                                Tags / Category
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                                {allTags.map(tag => {
                                    const active = tags.includes(tag);
                                    return (
                                        <Chip key={tag} label={`#${tag}`} size="small" onClick={() => toggleTag(tag)}
                                            sx={{
                                                height: 24, fontSize: '0.68rem', fontWeight: active ? 700 : 400,
                                                bgcolor: active ? color + '15' : 'transparent',
                                                color: active ? color : 'text.secondary',
                                                border: '1px solid', borderColor: active ? color : 'divider',
                                            }} />
                                    );
                                })}
                            </Box>
                        </Box>
                    )}

                    {/* Due Date filter */}
                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.3, display: 'block', fontSize: '0.7rem' }}>
                            Due Date
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <Select value={hasDueDate} onChange={e => setHasDueDate(e.target.value)}
                                displayEmpty sx={{ borderRadius: 2, fontSize: '0.78rem' }}>
                                <MenuItem value=""><em>Any</em></MenuItem>
                                <MenuItem value="overdue">⏰ Overdue</MenuItem>
                                <MenuItem value="today">📅 Due Today</MenuItem>
                                <MenuItem value="thisWeek">📆 This Week</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Toggles */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControlLabel
                            control={<Switch checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} size="small" />}
                            label={<Typography variant="caption" fontWeight={500}>{t('hideCompleted') as string || 'Hide completed'}</Typography>}
                        />
                        <FormControlLabel
                            control={<Switch checked={hasBlocker} onChange={e => setHasBlocker(e.target.checked)} size="small" color="error" />}
                            label={<Typography variant="caption" fontWeight={500}>Blocked only</Typography>}
                        />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>{t('cancel') as string}</Button>
                <Button variant="contained" onClick={handleSave} disabled={!name.trim()}
                    sx={{ borderRadius: 2, fontWeight: 600, bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}>
                    {editView ? (t('save') as string) : (t('createView') as string || 'Create View')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CustomViewDialog;
