import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Box, Typography, Paper, List, ListItem, ListItemAvatar, ListItemText,
    Avatar, Chip, IconButton, Tooltip, Button, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider,
    ToggleButtonGroup, ToggleButton, Select, MenuItem, FormControl,
    InputLabel, Checkbox, FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FlagIcon from '@mui/icons-material/Flag';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GitHubIcon from '@mui/icons-material/GitHub';
import SyncIcon from '@mui/icons-material/Sync';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { deleteProject } from '../../services/projectService';
import { deleteSprint, updateSprint } from '../../services/sprintService';
import type { Sprint } from '../../types';
import { PROJECT_COLORS } from '../../constants/colors';
import ConfirmDialog from '../../components/ConfirmDialog';
import HelpTooltip from '../../components/HelpTooltip';

interface ProjectsSprintsTabProps {
    onOpenGhSync: (projectId: string) => void;
}

const ProjectsSprintsTab = ({ onOpenGhSync }: ProjectsSprintsTabProps) => {
    const { t, lang } = useLanguage();
    const textByLang = useCallback((enText: string, koText: string) => (lang === 'ko' ? koText : enText), [lang]);
    const {
        currentWorkspace, projects, sprints,
        addProject, addSprint, refreshProjects, refreshSprints,
    } = useWorkspace();

    const [createProjectOpen, setCreateProjectOpen] = useState(false);
    const [createSprintOpen, setCreateSprintOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
    const [newSprintName, setNewSprintName] = useState('');
    const [newSprintType, setNewSprintType] = useState<'sprint' | 'phase' | 'milestone'>('sprint');
    const [newSprintStartDate, setNewSprintStartDate] = useState('');
    const [newSprintEndDate, setNewSprintEndDate] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'sprint'; id: string } | null>(null);

    // Edit sprint state
    const [editSprint, setEditSprint] = useState<Sprint | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState<'sprint' | 'phase' | 'milestone'>('sprint');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');
    const [editParentId, setEditParentId] = useState('');
    const [editLinkedIds, setEditLinkedIds] = useState<string[]>([]);

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

    if (!currentWorkspace) return null;

    return (
        <>
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
                            <ListItem sx={{ px: 0, gap: 1 }}>
                                <ListItemAvatar sx={{ minWidth: 40 }}>
                                    <Avatar sx={{ bgcolor: proj.color + '25', color: proj.color, width: 36, height: 36 }}>
                                        <FolderIcon sx={{ fontSize: 20 }} />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={<Typography fontWeight={600} fontSize="0.9rem">{proj.name}</Typography>}
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: proj.color }} />
                                            <Typography variant="caption" color="text.secondary">{proj.color}</Typography>
                                            {proj.githubRepo && (
                                                <Chip
                                                    icon={<GitHubIcon sx={{ fontSize: '14px !important' }} />}
                                                    label={`${proj.githubRepo.owner}/${proj.githubRepo.name}`}
                                                    size="small"
                                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#f1f1f1' }}
                                                />
                                            )}
                                        </Box>
                                    }
                                />
                                {projects.length > 1 && (
                                    <Tooltip title={t('deleteProject') as string}><IconButton size="small" onClick={() => handleDeleteProject(proj.id)}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                )}
                                {proj.githubRepo && (
                                    <Tooltip title={textByLang('Sync GitHub Issues/PRs', 'GitHub 이슈/PR 동기화')}>
                                        <IconButton size="small" color="primary" onClick={() => onOpenGhSync(proj.id)}>
                                            <SyncIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
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
                            const typeLabel = sp.type === 'milestone' ? '🎯 Milestone' : sp.type === 'phase' ? '📋 Phase' : '🚀 Sprint';

                            const parentPhase = sp.parentId ? sprints.find(s => s.id === sp.parentId) : null;
                            const parentInfo = parentPhase ? ` • ← ${parentPhase.name}` : '';

                            return (
                                <ListItem key={sp.id} sx={{ pl: indent ? 4 : 0, py: 0.8, gap: 1 }}>
                                    <ListItemAvatar sx={{ minWidth: 36 }}>
                                        <Avatar sx={{ bgcolor: avatarColor, width: 32, height: 32, color: 'white' }}>
                                            {icon}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Typography fontWeight={600} fontSize="0.85rem">{sp.name}</Typography>
                                                <Chip label={typeLabel} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                                            </Box>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                {dateStr}{parentInfo}
                                            </Typography>
                                        }
                                    />
                                    <Chip
                                        label={sp.status}
                                        size="small"
                                        color={sp.status === 'active' ? 'primary' : sp.status === 'completed' ? 'success' : 'default'}
                                        onClick={() => handleToggleSprintStatus(sp.id, sp.status)}
                                        sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }}
                                    />
                                    <Tooltip title={t('edit') as string || 'Edit'}>
                                        <IconButton size="small" onClick={() => openEditSprint(sp)}>
                                            <EditIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('delete') as string || 'Delete'}>
                                        <IconButton size="small" onClick={() => handleDeleteSprint(sp.id)}>
                                            <DeleteIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                </ListItem>
                            );
                        };

                        return (
                            <>
                                {phases.map(phase => (
                                    <Box key={phase.id}>
                                        {renderSprintItem(phase)}
                                        {childSprintsByPhase(phase.id).map(child => renderSprintItem(child, true))}
                                    </Box>
                                ))}
                                {topLevelSprints.map(sp => renderSprintItem(sp))}
                                {milestones.map(ms => renderSprintItem(ms))}
                            </>
                        );
                    })()}
                </List>
            </Paper>

            {/* Create Project Dialog */}
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

            {/* Create Sprint Dialog */}
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
        </>
    );
};

export default ProjectsSprintsTab;
