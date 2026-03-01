import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box,
    Typography, Chip, IconButton, InputBase, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useLanguage } from '../contexts/LanguageContext';
import type { IssueTemplate, TaskType, PriorityLevel } from '../types';
import { TEMPLATE_ICONS, TASK_TYPES, TASK_TYPE_CONFIG, PRIORITY_LEVELS, PRIORITY_CONFIG } from '../types';

interface IssueTemplateDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: {
        name: string; icon: string; description?: string;
        titlePattern?: string; defaultDescription?: string;
        defaultType?: TaskType; defaultPriority?: PriorityLevel;
        defaultTags?: string[]; defaultCategory?: string; defaultCategoryColor?: string;
        defaultBlockerStatus?: 'none' | 'blocked';
        defaultSubtasks?: string[];
    }) => void;
    editTemplate?: IssueTemplate | null;
}

const IssueTemplateDialog = ({ open, onClose, onSave, editTemplate }: IssueTemplateDialogProps) => {
    const { t, lang } = useLanguage();

    const [name, setName] = useState('');
    const [nameError, setNameError] = useState(false);
    const [icon, setIcon] = useState('📋');
    const [description, setDescription] = useState('');

    // Pre-fill fields
    const [titlePattern, setTitlePattern] = useState('');
    const [defaultDescription, setDefaultDescription] = useState('');
    const [defaultType, setDefaultType] = useState<TaskType | ''>('');
    const [defaultPriority, setDefaultPriority] = useState<PriorityLevel | ''>('');
    const [defaultTags, setDefaultTags] = useState<string[]>([]);
    const [tagText, setTagText] = useState('');
    const [defaultCategory, setDefaultCategory] = useState('');
    const [defaultSubtasksText, setDefaultSubtasksText] = useState('');

    // Populate from editTemplate
    useEffect(() => {
        if (editTemplate) {
            setName(editTemplate.name);
            setIcon(editTemplate.icon);
            setDescription(editTemplate.description || '');
            setTitlePattern(editTemplate.titlePattern || '');
            setDefaultDescription(editTemplate.defaultDescription || '');
            setDefaultType(editTemplate.defaultType || '');
            setDefaultPriority(editTemplate.defaultPriority || '');
            setDefaultTags(editTemplate.defaultTags || []);
            setDefaultCategory(editTemplate.defaultCategory || '');
            setDefaultSubtasksText((editTemplate.defaultSubtasks || []).join('\n'));
        } else {
            setName(''); setIcon('📋'); setDescription('');
            setTitlePattern(''); setDefaultDescription('');
            setDefaultType(''); setDefaultPriority('');
            setDefaultTags([]); setTagText('');
            setDefaultCategory(''); setDefaultSubtasksText('');
        }
        setNameError(false);
    }, [editTemplate, open]);

    const handleSave = () => {
        if (!name.trim()) { setNameError(true); return; }
        setNameError(false);

        onSave({
            name: name.trim(),
            icon,
            description: description.trim() || undefined,
            titlePattern: titlePattern.trim() || undefined,
            defaultDescription: defaultDescription.trim() || undefined,
            defaultType: (defaultType || undefined) as TaskType | undefined,
            defaultPriority: (defaultPriority || undefined) as PriorityLevel | undefined,
            defaultTags: defaultTags.length > 0 ? defaultTags : undefined,
            defaultCategory: defaultCategory.trim() || undefined,
            defaultSubtasks: defaultSubtasksText.split('\n').map(s => s.trim()).filter(s => s.length > 0),
        });
        onClose();
    };

    const handleAddTag = () => {
        const trimmed = tagText.trim().replace(/^#/, '');
        if (trimmed && !defaultTags.includes(trimmed)) {
            setDefaultTags([...defaultTags, trimmed]);
            setTagText('');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 3, maxHeight: '85vh' } }}>
            <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: '1.4rem' }}>{icon}</Typography>
                {editTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>
                {/* Template Name */}
                <TextField autoFocus fullWidth label={t('templateName') as string || 'Template Name'}
                    required error={nameError}
                    helperText={nameError ? 'Template name is required' : ''}
                    value={name} onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameError(false); }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

                {/* Template Description */}
                <TextField fullWidth label="Template Description" placeholder="Describe when to use this template"
                    value={description} onChange={e => setDescription(e.target.value)} multiline rows={2}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

                {/* Icon Picker */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Icon
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {TEMPLATE_ICONS.map(ic => (
                            <Box key={ic} onClick={() => setIcon(ic)}
                                sx={{
                                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 2, cursor: 'pointer', fontSize: '1.2rem',
                                    border: '2px solid', borderColor: icon === ic ? 'primary.main' : 'divider',
                                    bgcolor: icon === ic ? 'primary.main' + '12' : 'transparent',
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}>
                                {ic}
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Divider />

                {/* Pre-fill Settings Section */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    ⚡ Pre-fill Settings
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mt: -2 }}>
                    These values will auto-fill when this template is used to create a new task.
                </Typography>

                {/* Title Pattern */}
                <TextField fullWidth size="small" label="Title Prefix" placeholder="e.g. [Bug] , [Feature] "
                    value={titlePattern} onChange={e => setTitlePattern(e.target.value)}
                    helperText="Automatically prepended to the task title"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

                {/* Default Description Template */}
                <TextField fullWidth size="small" label="Description Template" multiline rows={4}
                    placeholder={"## Steps to Reproduce\n1. \n2. \n\n## Expected Behavior\n\n## Actual Behavior"}
                    value={defaultDescription} onChange={e => setDefaultDescription(e.target.value)}
                    helperText="Template body for the description field"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }} />

                {/* Default Type */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Default Type
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {TASK_TYPES.map(tt => {
                            const cfg = TASK_TYPE_CONFIG[tt];
                            const isSelected = defaultType === tt;
                            return (
                                <Chip key={tt} label={`${cfg.icon} ${cfg.label}`} size="small"
                                    onClick={() => setDefaultType(isSelected ? '' : tt)}
                                    sx={{
                                        fontWeight: isSelected ? 700 : 400,
                                        bgcolor: isSelected ? cfg.color + '20' : 'transparent',
                                        color: isSelected ? cfg.color : 'text.secondary',
                                        border: '1px solid', borderColor: isSelected ? cfg.color : 'divider',
                                    }} />
                            );
                        })}
                    </Box>
                </Box>

                {/* Default Priority */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Default Priority
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {PRIORITY_LEVELS.map(p => {
                            const cfg = PRIORITY_CONFIG[p];
                            const isSelected = defaultPriority === p;
                            return (
                                <Chip key={p} label={p} size="small"
                                    onClick={() => setDefaultPriority(isSelected ? '' : p)}
                                    sx={{
                                        fontWeight: 700, fontSize: '0.75rem',
                                        bgcolor: isSelected ? cfg.bgColor : 'transparent',
                                        color: cfg.color,
                                        border: '1px solid', borderColor: isSelected ? cfg.color : 'divider',
                                    }} />
                            );
                        })}
                    </Box>
                </Box>

                {/* Default Tags */}
                <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Default Tags
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <InputBase placeholder="Add tag..." value={tagText}
                            onChange={e => setTagText(e.target.value)}
                            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && tagText.trim()) { e.preventDefault(); handleAddTag(); } }}
                            sx={{ flex: 1, px: 1.5, py: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, fontSize: '0.85rem' }} />
                        <IconButton size="small" onClick={handleAddTag} disabled={!tagText.trim()}>
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    {defaultTags.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                            {defaultTags.map(tag => (
                                <Chip key={tag} label={`#${tag}`} size="small"
                                    onDelete={() => setDefaultTags(defaultTags.filter(t => t !== tag))}
                                    sx={{ fontWeight: 600 }} />
                            ))}
                        </Box>
                    )}
                </Box>

                {/* Default Category */}
                <TextField fullWidth size="small" label="Default Category" placeholder="e.g. Frontend, Backend"
                    value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

                {/* Default Subtasks */}
                <TextField fullWidth size="small" label="Default Subtasks (One per line)" multiline rows={3}
                    placeholder="e.g. &#10;Design reviewing&#10;Write unit tests"
                    value={defaultSubtasksText} onChange={e => setDefaultSubtasksText(e.target.value)}
                    helperText={lang === 'ko' ? '각 줄은 개별 하위 작업으로 생성됩니다.' : 'Each line will be created as a separate subtask.'}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />

            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2, fontWeight: 600 }}>
                    {t('cancel') as string}
                </Button>
                <Button onClick={handleSave} variant="contained" disabled={!name.trim()}
                    sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}>
                    {editTemplate ? 'Update' : 'Create'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default IssueTemplateDialog;
