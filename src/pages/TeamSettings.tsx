import { useState } from 'react';
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
import { regenerateInviteCode, createTeamGroup, assignMemberToTeam, removeMemberFromTeam } from '../services/workspaceService';
import { deleteProject } from '../services/projectService';
import { deleteSprint, updateSprint } from '../services/sprintService';
import type { Sprint } from '../types';
import InviteDialog from '../components/InviteDialog';

const PROJECT_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const TG_COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

const TeamSettings = () => {
    const { t } = useLanguage();
    const {
        currentWorkspace, currentMembers, projects, sprints,
        addProject, addSprint, refreshProjects, refreshSprints,
        teamGroups, refreshTeamGroups,
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
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{t('inviteCode') as string}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('inviteCodeDesc') as string}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'grey.100', p: 2, borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 6, fontFamily: 'monospace', flex: 1 }}>{inviteCode}</Typography>
                    <Tooltip title={t('copyCode') as string}><IconButton onClick={copyCode}><ContentCopyIcon /></IconButton></Tooltip>
                    <Tooltip title={t('regenerateCode') as string}><IconButton onClick={handleRegenerateCode}><RefreshIcon /></IconButton></Tooltip>
                </Box>
            </Paper>

            {/* Members */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{t('members') as string}</Typography>
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
                                <Chip label={m.role === 'owner' ? t('owner') as string : m.role === 'admin' ? t('admin') as string : t('member') as string}
                                    size="small" color={m.role === 'owner' ? 'primary' : 'default'} sx={{ fontWeight: 600 }} />
                            </ListItem>
                            {i < currentMembers.length - 1 && <Divider />}
                        </Box>
                    ))}
                </List>
            </Paper>

            {/* Team Groups */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{t('teamGroups') as string}</Typography>
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
                    <Typography variant="subtitle1" fontWeight={700}>{t('projects') as string}</Typography>
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
                    <Typography variant="subtitle1" fontWeight={700}>{t('sprints') as string}</Typography>
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
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
                <DialogTitle>
                    {deleteTarget?.type === 'project' ? t('confirmDeleteProject') as string : t('confirmDeleteSprint') as string}
                </DialogTitle>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>{t('cancel') as string}</Button>
                    <Button variant="contained" color="error" onClick={confirmDelete}>{t('delete') as string}</Button>
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
