import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Box, Typography, Paper, Chip, Button,
    LinearProgress, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, Select, FormControl,
    InputLabel, Avatar, Tabs, Tab, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FolderIcon from '@mui/icons-material/Folder';
import ListAltIcon from '@mui/icons-material/ListAlt';
import EditIcon from '@mui/icons-material/Edit';

import ProjectTimeline from '../components/ProjectTimeline';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { fetchProjectStats } from '../services/taskService';
import { updateProject } from '../services/projectService';
import { updateInitiative } from '../services/initiativeService';
import { fetchProjectUpdates } from '../services/projectUpdateService';
import ProjectUpdateSection from '../components/ProjectUpdateSection';
import useApiData from '../hooks/useApiData';
import type { Project, ProjectUpdate } from '../types';

const InitiativePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { lang } = useLanguage();
    const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);
    const {
        initiatives, projects, setCurrentProject, currentMembers, currentWorkspace,
        refreshProjects, refreshInitiatives, setActiveViewFilter
    } = useWorkspace();
    const { user } = useAuth();

    const myRole = currentMembers.find(m => m.uid === user?.uid)?.role || 'member';
    const canEdit = myRole === 'owner' || myRole === 'admin';

    const initiative = initiatives.find(i => i.id === id);
    const linkedProjects = projects.filter(p => p.initiativeId === id);
    const availableProjects = projects.filter(p => p.initiativeId !== id).sort((a, b) => a.name.localeCompare(b.name));

    // Dialog States
    const [addProjectOpen, setAddProjectOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

    // Project Edit State
    const [editProjectOpen, setEditProjectOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectForm, setProjectForm] = useState({
        name: '', description: '', status: '', startDate: '', targetDate: ''
    });

    // Edit Form State
    const [editForm, setEditForm] = useState({ name: '', description: '', status: '', targetDate: '' });

    useEffect(() => {
        if (!initiative) return;
        setEditForm({
            name: initiative.name,
            description: initiative.description || '',
            status: initiative.status,
            targetDate: initiative.targetDate || ''
        });
    }, [initiative]);

    // SWR-based project stats loading
    const linkedProjectIds = linkedProjects.map(p => p.id).sort().join(',');
    const { data: stats = {}, loading: loadingStats } = useApiData<Record<string, { total: number; completed: number }>>(
        linkedProjectIds ? `initiative-stats:${linkedProjectIds}` : null,
        async () => {
            const newStats: Record<string, { total: number; completed: number }> = {};
            await Promise.all(linkedProjects.map(async (p) => {
                const s = await fetchProjectStats(p.id);
                newStats[p.id] = s;
            }));
            return newStats;
        },
        { ttlMs: 3 * 60_000, persist: true },
    );

    // SWR-based project updates loading
    const { data: updates = [], mutate: mutateUpdates } = useApiData<ProjectUpdate[]>(
        id ? `project-updates:${id}` : null,
        () => fetchProjectUpdates(id!),
        { ttlMs: 3 * 60_000, persist: true },
    );



    if (!initiative) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h6">{textByLang('Initiative Not Found', '\uC774\uB2C8\uC154\uD2F0\uBE0C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4')}</Typography>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mt: 2 }}>
                    {textByLang('Return Home', '\uD648\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30')}
                </Button>
            </Box>
        );
    }

    // Calculations
    const totalInitTasks = Object.values(stats).reduce((acc, s) => acc + s.total, 0);
    const completedInitTasks = Object.values(stats).reduce((acc, s) => acc + s.completed, 0);
    const initProgress = totalInitTasks > 0 ? Math.round((completedInitTasks / totalInitTasks) * 100) : 0;

    // Handlers
    const handleAddProject = async () => {
        if (!selectedProjectId) return;
        await updateProject(selectedProjectId, { initiativeId: id });
        await refreshProjects();
        setAddProjectOpen(false);
        setSelectedProjectId('');
    };

    const handleUpdateInitiative = async () => {
        if (!id) return;
        await updateInitiative(id, {
            name: editForm.name,
            description: editForm.description,
            status: editForm.status as 'planned' | 'active' | 'completed',
            targetDate: editForm.targetDate
        });
        await refreshInitiatives();
        setEditOpen(false);
    };

    const handleUpdateProject = async () => {
        if (!editingProject) return;
        await updateProject(editingProject.id, {
            name: projectForm.name,
            description: projectForm.description,
            status: projectForm.status as 'active' | 'completed' | 'paused' | 'planned',
            startDate: projectForm.startDate,
            targetDate: projectForm.targetDate
        });
        await refreshProjects();
        setEditProjectOpen(false);
        setEditingProject(null);
    };

    const handleViewAllIssues = () => {
        setCurrentProject(null);
        setActiveViewFilter({ initiativeId: id });
        navigate('/');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return '#3b82f6';
            case 'completed': return '#10b981';
            case 'planned': return '#94a3b8';
            default: return '#94a3b8';
        }
    };
    const getStatusLabel = (status: string) => {
        if (status === 'planned') return textByLang('Planned', '\uACC4\uD68D');
        if (status === 'active') return textByLang('Active', '\uC9C4\uD589 \uC911');
        if (status === 'completed') return textByLang('Completed', '\uC644\uB8CC');
        if (status === 'paused') return textByLang('Paused', '\uBCF4\uB958');
        return status;
    };

    return (
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, flex: 1, overflow: 'auto', bgcolor: 'background.default', minHeight: '100%' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 3, md: 5 }, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/')}
                        sx={{ mb: 2, color: 'text.secondary', '&:hover': { color: 'text.primary', bgcolor: 'transparent' } }}
                    >
                        {textByLang('Back to Board', '\uBCF4\uB4DC\uB85C \uB3CC\uC544\uAC00\uAE30')}
                    </Button>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Chip
                            label={getStatusLabel(initiative.status)}
                            size="small"
                            sx={{
                                height: 24, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                bgcolor: `${getStatusColor(initiative.status)}20`,
                                color: getStatusColor(initiative.status),
                                border: `1px solid ${getStatusColor(initiative.status)}40`
                            }}
                        />
                        {initiative.targetDate && (
                            <Chip
                                icon={<CalendarTodayIcon sx={{ fontSize: '1rem !important' }} />}
                                label={new Date(initiative.targetDate).toLocaleDateString()}
                                size="small"
                                variant="outlined"
                                sx={{ height: 24, fontSize: '0.75rem', borderRadius: 1 }}
                            />
                        )}
                    </Box>
                    <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: -1, mb: 1, fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' } }}>
                        {initiative.name}
                    </Typography>
                    {initiative.description && (
                        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, lineHeight: 1.6 }}>
                            {initiative.description}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        startIcon={<ListAltIcon />}
                        onClick={handleViewAllIssues}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                        {textByLang('View All Issues', '\uBAA8\uB4E0 \uC774\uC288 \uBCF4\uAE30')}
                    </Button>
                    {canEdit && (
                        <Button
                            variant="outlined"
                            startIcon={<SettingsIcon />}
                            onClick={() => setEditOpen(true)}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                            {textByLang('Edit Initiative', '\uC774\uB2C8\uC154\uD2F0\uBE0C \uC218\uC815')}
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Overall Progress */}
            <Paper elevation={0} sx={{ p: 3, mb: 5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>{textByLang('Overview', '\uAC1C\uC694')}</Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">{initProgress}%</Typography>
                </Box>
                {loadingStats && <LinearProgress color="secondary" sx={{ mb: 1, borderRadius: 1 }} />}
                <LinearProgress
                    variant="determinate"
                    value={initProgress}
                    sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 5 } }}
                />
                <Box sx={{ display: 'flex', gap: { xs: 2, md: 4 }, mt: 3, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">{textByLang('Projects', '\uD504\uB85C\uC81D\uD2B8')}</Typography>
                        <Typography variant="subtitle1" fontWeight={700}>{linkedProjects.length}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">{textByLang('Total Tasks', '\uCD1D \uC791\uC5C5')}</Typography>
                        <Typography variant="subtitle1" fontWeight={700}>{totalInitTasks}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">{textByLang('Completed', '\uC644\uB8CC')}</Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="success.main">{completedInitTasks}</Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Project Updates Section */}
            {/* Project Updates Section */}
            <Box sx={{ mb: 5, height: 500 }}>
                <ProjectUpdateSection
                    parentId={id!}
                    workspaceId={currentWorkspace?.id || ''}
                    updates={updates}
                    onUpdateChange={mutateUpdates}
                    canEdit={canEdit}
                    contextData={{
                        totalTasks: Object.values(stats).reduce((acc, s) => acc + s.total, 0),
                        completedTasks: Object.values(stats).reduce((acc, s) => acc + s.completed, 0),
                        progress: Object.values(stats).reduce((acc, s) => acc + s.total, 0) > 0
                            ? Math.round((Object.values(stats).reduce((acc, s) => acc + s.completed, 0) / Object.values(stats).reduce((acc, s) => acc + s.total, 0)) * 100)
                            : 0
                    }}
                />
            </Box>



            {/* Content Layout */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                {/* Main Content: Projects List */}
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6" fontWeight={700}>{textByLang('Projects', '\uD504\uB85C\uC81D\uD2B8')}</Typography>
                            <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} sx={{ minHeight: 0, '& .MuiTab-root': { minHeight: 32, py: 0 } }}>
                                <Tab label={textByLang('List', '\uBAA9\uB85D')} value="list" />
                                <Tab label={textByLang('Timeline', '\uD0C0\uC784\uB77C\uC778')} value="timeline" />
                            </Tabs>
                        </Box>
                        {canEdit && (
                            <Button
                                startIcon={<AddIcon />}
                                size="small"
                                onClick={() => setAddProjectOpen(true)}
                                sx={{ fontWeight: 600 }}
                            >
                                {textByLang('Add Project', '\uD504\uB85C\uC81D\uD2B8 \uCD94\uAC00')}
                            </Button>
                        )}
                    </Box>

                    {linkedProjects.length === 0 ? (
                        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                            <Typography variant="body1" color="text.secondary" fontWeight={500}>{textByLang('No projects linked to this initiative.', '\uC5F0\uACB0\uB41C \uD504\uB85C\uC81D\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.')}</Typography>
                            {canEdit && (
                                <Button variant="contained" onClick={() => setAddProjectOpen(true)} sx={{ mt: 2 }}>
                                    {textByLang('Add Existing Project', '\uAE30\uC874 \uD504\uB85C\uC81D\uD2B8 \uCD94\uAC00')}
                                </Button>
                            )}
                        </Paper>
                    ) : (
                        viewMode === 'list' ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(280px, 1fr))' }, gap: 2 }}>
                                {linkedProjects.map(proj => {
                                    const pStats = stats[proj.id] || { total: 0, completed: 0 };
                                    const pProgress = pStats.total > 0 ? Math.round((pStats.completed / pStats.total) * 100) : 0;

                                    return (
                                        <Paper
                                            key={proj.id}
                                            elevation={0}
                                            onClick={() => {
                                                setCurrentProject(proj);
                                                navigate('/');
                                            }}
                                            sx={{
                                                p: 2.5,
                                                border: '1px solid', borderColor: 'divider',
                                                borderRadius: 3,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                                '&:hover': {
                                                    borderColor: 'primary.main',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
                                                }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Avatar
                                                        variant="rounded"
                                                        sx={{ bgcolor: proj.color, width: 40, height: 40 }}
                                                    >
                                                        <FolderIcon sx={{ color: 'white' }} />
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>{proj.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {`${textByLang('Updated', '\uC5C5\uB370\uC774\uD2B8')} ${new Date(proj.createdAt).toLocaleDateString()}`}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingProject(proj);
                                                        setProjectForm({
                                                            name: proj.name,
                                                            description: proj.description || '',
                                                            status: proj.status || 'active',
                                                            startDate: proj.startDate || '',
                                                            targetDate: proj.targetDate || ''
                                                        });
                                                        setEditProjectOpen(true);
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Box>

                                            <Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" fontWeight={600} color="text.secondary">Progress</Typography>
                                                    <Typography variant="caption" fontWeight={700}>{pProgress}%</Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={pProgress}
                                                    sx={{
                                                        height: 6, borderRadius: 3,
                                                        bgcolor: 'action.hover',
                                                        '& .MuiLinearProgress-bar': { bgcolor: proj.color }
                                                    }}
                                                />
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {`${pStats.completed} / ${pStats.total} ${textByLang('tasks', '\uC791\uC5C5')}`}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Paper>
                                    );
                                })}
                            </Box>
                        ) : (
                            <ProjectTimeline
                                projects={linkedProjects}
                                onProjectClick={(p) => { setCurrentProject(p); navigate('/'); }}
                            />
                        )
                    )}
                </Box>
            </Box>

            {/* Add Project Dialog */}
            <Dialog open={addProjectOpen} onClose={() => setAddProjectOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{textByLang('Add Project to Initiative', '\uC774\uB2C8\uC154\uD2F0\uBE0C\uC5D0 \uD504\uB85C\uC81D\uD2B8 \uCD94\uAC00')}</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                        <InputLabel>{textByLang('Select Project', '\uD504\uB85C\uC81D\uD2B8 \uC120\uD0DD')}</InputLabel>
                        <Select
                            value={selectedProjectId}
                            label={textByLang('Select Project', '\uD504\uB85C\uC81D\uD2B8 \uC120\uD0DD')}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                        >
                            {availableProjects.length === 0 ? (
                                <MenuItem disabled value="">{textByLang('No available projects', '\uC120\uD0DD \uAC00\uB2A5\uD55C \uD504\uB85C\uC81D\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4')}</MenuItem>
                            ) : availableProjects.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddProjectOpen(false)}>{textByLang('Cancel', '\uCDE8\uC18C')}</Button>
                    <Button variant="contained" onClick={handleAddProject} disabled={!selectedProjectId}>{textByLang('Add', '\uCD94\uAC00')}</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Initiative Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{textByLang('Edit Initiative', '\uC774\uB2C8\uC154\uD2F0\uBE0C \uC218\uC815')}</DialogTitle>
                <DialogContent>
                    <TextField
                        label={textByLang('Name', '\uC774\uB984')} fullWidth margin="normal"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    />
                    <TextField
                        label={textByLang('Description', '\uC124\uBA85')} fullWidth margin="normal" multiline rows={3}
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>{textByLang('Status', '\uC0C1\uD0DC')}</InputLabel>
                            <Select
                                value={editForm.status}
                                label={textByLang('Status', '\uC0C1\uD0DC')}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            >
                                <MenuItem value="planned">{textByLang('Planned', '\uACC4\uD68D')}</MenuItem>
                                <MenuItem value="active">{textByLang('Active', '\uC9C4\uD589 \uC911')}</MenuItem>
                                <MenuItem value="completed">{textByLang('Completed', '\uC644\uB8CC')}</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label={textByLang('Target Date', '\uBAA9\uD45C \uB0A0\uC9DC')} type="date" fullWidth margin="normal"
                            value={editForm.targetDate}
                            onChange={e => setEditForm({ ...editForm, targetDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>{textByLang('Cancel', '\uCDE8\uC18C')}</Button>
                    <Button variant="contained" onClick={handleUpdateInitiative}>{textByLang('Save Changes', '\uBCC0\uACBD\uC0AC\uD56D \uC800\uC7A5')}</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Project Dialog (for dates) */}
            <Dialog open={editProjectOpen} onClose={() => setEditProjectOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{textByLang('Edit Project Settings', '\uD504\uB85C\uC81D\uD2B8 \uC124\uC815 \uC218\uC815')}</DialogTitle>
                <DialogContent>
                    <TextField
                        label={textByLang('Project Name', '\uD504\uB85C\uC81D\uD2B8 \uC774\uB984')} fullWidth margin="normal"
                        value={projectForm.name}
                        onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                    />
                    <TextField
                        label={textByLang('Description', '\uC124\uBA85')} fullWidth margin="normal" multiline rows={2}
                        value={projectForm.description}
                        onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <TextField
                            label={textByLang('Start Date', '\uC2DC\uC791 \uB0A0\uC9DC')} type="date" fullWidth margin="normal"
                            value={projectForm.startDate}
                            onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label={textByLang('Target Date', '\uBAA9\uD45C \uB0A0\uC9DC')} type="date" fullWidth margin="normal"
                            value={projectForm.targetDate}
                            onChange={e => setProjectForm({ ...projectForm, targetDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>{textByLang('Status', '\uC0C1\uD0DC')}</InputLabel>
                        <Select
                            value={projectForm.status}
                            label={textByLang('Status', '\uC0C1\uD0DC')}
                            onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}
                        >
                            <MenuItem value="active">{textByLang('Active', '\uC9C4\uD589 \uC911')}</MenuItem>
                            <MenuItem value="completed">{textByLang('Completed', '\uC644\uB8CC')}</MenuItem>
                            <MenuItem value="paused">{textByLang('Paused', '\uBCF4\uB958')}</MenuItem>
                            <MenuItem value="planned">{textByLang('Planned', '\uACC4\uD68D')}</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditProjectOpen(false)}>{textByLang('Cancel', '\uCDE8\uC18C')}</Button>
                    <Button variant="contained" onClick={handleUpdateProject}>{textByLang('Save Project', '\uD504\uB85C\uC81D\uD2B8 \uC800\uC7A5')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default InitiativePage;
