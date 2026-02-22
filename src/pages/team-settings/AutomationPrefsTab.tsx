import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Box, Typography, Paper, Chip, IconButton, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions,
    ToggleButtonGroup, ToggleButton, Select, MenuItem, FormControl,
    InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AutomationIcon from '@mui/icons-material/SmartToy';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAutomationRules, createAutomationRule, deleteAutomationRule, toggleAutomationRule } from '../../services/automationService';
import { fetchIssueTemplates, createIssueTemplate, updateIssueTemplate, deleteIssueTemplate } from '../../services/issueTemplateService';
import type { AutomationRule, AutomationAction, IssueTemplate } from '../../types';
import { STATUS_CONFIG } from '../../types';
import ConfirmDialog from '../../components/ConfirmDialog';
import IssueTemplateDialog from '../../components/IssueTemplateDialog';
import {
    getWeeklyPlannerPreferences,
    setWeeklyPlannerPreferences,
    type WeeklyPlannerPreferences,
} from '../../utils/plannerPreferences';

const AutomationPrefsTab = () => {
    const { t, lang } = useLanguage();
    const textByLang = useCallback((enText: string, koText: string) => (lang === 'ko' ? koText : enText), [lang]);
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspace();

    // Automation state
    const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
    const [createRuleOpen, setCreateRuleOpen] = useState(false);
    const [newRuleName, setNewRuleName] = useState('');
    const [newRuleTriggerTo, setNewRuleTriggerTo] = useState('done');
    const [newRuleActionType, setNewRuleActionType] = useState<'assign_user' | 'add_label' | 'set_priority'>('assign_user');
    const [newRuleActionValue, setNewRuleActionValue] = useState('');

    // Issue Templates State
    const [templates, setTemplates] = useState<IssueTemplate[]>([]);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<IssueTemplate | null>(null);
    const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

    // Weekly Planner Preferences
    const [plannerPrefs, setPlannerPrefs] = useState<WeeklyPlannerPreferences>(
        getWeeklyPlannerPreferences(user?.uid)
    );

    useEffect(() => {
        if (!currentWorkspace?.id) return;
        fetchAutomationRules(currentWorkspace.id).then(setAutomationRules).catch(console.error);
    }, [currentWorkspace?.id]);

    useEffect(() => {
        if (!currentWorkspace?.id) return;
        fetchIssueTemplates(currentWorkspace.id).then(setTemplates).catch(console.error);
    }, [currentWorkspace?.id]);

    useEffect(() => {
        setPlannerPrefs(getWeeklyPlannerPreferences(user?.uid));
    }, [user?.uid]);

    const savePlannerPrefs = (next: WeeklyPlannerPreferences) => {
        setWeeklyPlannerPreferences(next, user?.uid);
        setPlannerPrefs(next);
    };
    const weekDayOrder = plannerPrefs.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
    const dayNames = [
        textByLang('Sun', '일'), textByLang('Mon', '월'), textByLang('Tue', '화'),
        textByLang('Wed', '수'), textByLang('Thu', '목'), textByLang('Fri', '금'), textByLang('Sat', '토'),
    ];

    const handleCreateAutomation = async () => {
        if (!currentWorkspace || !newRuleName.trim() || !user) return;
        let action: AutomationAction;
        switch (newRuleActionType) {
            case 'assign_user':
                action = { type: 'assign_user', userId: newRuleActionValue, userName: '' };
                break;
            case 'add_label':
                action = { type: 'add_label', label: newRuleActionValue };
                break;
            case 'set_priority':
                action = { type: 'set_priority', priority: newRuleActionValue as 'P0' | 'P1' | 'P2' | 'P3' };
                break;
        }
        const rule = await createAutomationRule({
            workspaceId: currentWorkspace.id,
            name: newRuleName,
            trigger: { type: 'status_change', to: newRuleTriggerTo },
            actions: [action],
            isEnabled: true,
            createdBy: user.uid,
            createdAt: new Date().toISOString(),
        });
        setAutomationRules(prev => [...prev, rule]);
        setCreateRuleOpen(false);
        setNewRuleName('');
        toast.success(textByLang('Automation created', '자동화 규칙이 생성되었습니다'));
    };

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

    if (!currentWorkspace) return null;

    return (
        <>
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
                        {weekDayOrder.map(d => {
                            const isVisible = !plannerPrefs.hiddenWeekdays.includes(d);
                            return (
                            <Chip key={d} label={dayNames[d]} size="small"
                                color={isVisible ? 'primary' : 'default'}
                                onClick={() => {
                                    const nextHidden = isVisible
                                        ? [...plannerPrefs.hiddenWeekdays, d].sort((a, b) => a - b)
                                        : plannerPrefs.hiddenWeekdays.filter(x => x !== d);
                                    if (nextHidden.length < 7) savePlannerPrefs({ ...plannerPrefs, hiddenWeekdays: nextHidden });
                                }}
                                sx={{ cursor: 'pointer', fontWeight: 600, minWidth: 44 }} />
                            );
                        })}
                    </Box>
                </Box>
            </Paper>

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
        </>
    );
};

export default AutomationPrefsTab;
