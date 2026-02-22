// src/pages/Dashboard.tsx
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, Divider, Skeleton, Chip, Fab, Fade, InputBase, Menu, MenuItem, IconButton, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import ScheduleIcon from '@mui/icons-material/Schedule';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';

import TaskItem from '../components/TaskItem';
import AddTaskDialog from '../components/AddTaskDialog';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { useDashboard } from '../hooks/useDashboard';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { fetchWorkspaceProjects } from '../services/projectService';
import { updateTaskCategoryInDB } from '../services/taskService';
import type { Task, Project } from '../types';
import ActivityFeed from '../components/ActivityFeed';

const sortByOrder = (arr: Task[]) => [...arr].sort((a, b) => {
  const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
  const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return b.createdAt.localeCompare(a.createdAt);
});

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentWorkspace: workspace } = useWorkspace(); // Fixed: Alias currentWorkspace to workspace
  const {
    user, t, loading,
    todayDate, stats, filteredTasks,
    addTask, toggleTask, updateTask, updateTaskDetail, reorderTasks, deleteTask, handleTaskUpdate,
  } = useDashboard();

  // Project support from Feature/Kim
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectAnchorEl, setProjectAnchorEl] = useState<null | HTMLElement>(null);
  const [newTaskText, setNewTaskText] = useState(''); // Local state for Kim's input style

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  // Load Projects
  useEffect(() => {
    const loadProjects = async () => {
      if (workspace?.id) {
        try {
          const projectData = await fetchWorkspaceProjects(workspace.id);
          setProjects(projectData);
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadProjects();
  }, [workspace?.id]);

  // Handlers
  const selectProject = (project: Project | null) => {
    setSelectedProject(project);
    if (project) {
      localStorage.setItem('lastProject', JSON.stringify({ name: project.name, color: project.color }));
    } else {
      localStorage.removeItem('lastProject');
    }
  };

  const handleAddTaskInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskText.trim()) {
      await submitNewTask();
    }
  };

  const submitNewTask = async () => {
    if (!newTaskText.trim()) return;
    await addTask({
      text: newTaskText,
      category: selectedProject?.name,
      categoryColor: selectedProject?.color,
      projectId: selectedProject?.id,
      workspaceId: workspace?.id,
    });
    setNewTaskText('');
  };

  const handleCategoryChange = async (id: string, category: string | null, categoryColor: string | null) => {
    // Optimistic update using updateTaskDetail
    if (updateTaskDetail) {
      await updateTaskDetail(id, { category: category || undefined, categoryColor: categoryColor || undefined });
    } else {
      // Fallback if updateTaskDetail not available (should be now)
      await updateTaskCategoryInDB(id, category, categoryColor);
      // Refresh? useDashboard doesn't expose refresh easily except via effect.
      // But updateTaskCategoryInDB is void.
      // We really should use updateTaskDetail from hook.
    }
  };

  const handleTaskClick = (task: Task) => {
    setDetailTask(task);
  };

  const openTasks = useMemo(() => sortByOrder(filteredTasks.filter(t => !t.completed)), [filteredTasks]);
  const completedTasks = useMemo(() => sortByOrder(filteredTasks.filter(t => t.completed)), [filteredTasks]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index && source.droppableId === destination.droppableId) return;
    if (source.droppableId !== 'tasks-list' || destination.droppableId !== 'tasks-list') return;

    const reordered = [...openTasks];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    void reorderTasks(reordered.map(task => task.id));
  };

  // Blocked & Overdue computed
  const blockedTasks = useMemo(() => filteredTasks.filter(t => t.blockerStatus === 'blocked' && !t.completed), [filteredTasks]);
  const overdueTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredTasks.filter(t => t.dueDate && !t.completed && t.dueDate < today);
  }, [filteredTasks]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: '800px', mx: 'auto', pb: 4, pt: 2 }}>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 4, borderRadius: 3 }} />
        <Skeleton variant="rectangular" height={56} sx={{ mb: 3, borderRadius: 2 }} />
        {[1, 2, 3].map((i) => (<Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 3 }} />))}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', pb: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Fade in={true} timeout={800}>
            <Typography variant="h4" fontWeight="800" gutterBottom sx={{ background: 'linear-gradient(45deg, #2563EB 30%, #60A5FA 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('goodMorning') as string}{user?.displayName ? `, ${user.displayName}` : ''}
            </Typography>
          </Fade>
          <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon fontSize="small" color="primary" />
            {t('todayComma') as string} {todayDate}
          </Typography>
        </Box>

        <Paper sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Typography variant="h6" color="primary" fontWeight="bold">{stats.progress}%</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {stats.completedCount}/{stats.totalCount} {t('completed') as string}
            </Typography>
            <Typography variant="caption" color="text.secondary">{t('keepItUp') as string}</Typography>
          </Box>
        </Paper>
      </Box>

      {/* Alert Widgets */}
      {(blockedTasks.length > 0 || overdueTasks.length > 0) && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {/* ... (Keep HEAD alert implementation) ... */}
          {blockedTasks.length > 0 && (
            <Paper sx={{ flex: 1, minWidth: 200, p: 2, borderRadius: 3, border: '1px solid #fecaca', bgcolor: '#fef2f2', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <BlockIcon sx={{ color: '#dc2626', fontSize: 28 }} />
              <Box><Typography variant="subtitle2" fontWeight={700} color="#dc2626">{blockedTasks.length} Blocked</Typography></Box>
            </Paper>
          )}
          {overdueTasks.length > 0 && (
            <Paper sx={{ flex: 1, minWidth: 200, p: 2, borderRadius: 3, border: '1px solid #fed7aa', bgcolor: '#fff7ed', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ScheduleIcon sx={{ color: '#ea580c', fontSize: 28 }} />
              <Box><Typography variant="subtitle2" fontWeight={700} color="#ea580c">{overdueTasks.length} Overdue</Typography></Box>
            </Paper>
          )}
        </Box>
      )}

      {/* Input Section (Kim Style) */}
      <Paper elevation={0} sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <Box sx={{ p: 2, color: 'primary.main' }}><AddIcon /></Box>
        <InputBase
          sx={{ ml: 1, flex: 1, fontSize: '1.1rem' }}
          placeholder={t('addNewTask') as string}
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleAddTaskInput}
        />
        {newTaskText.trim() && (
          <Tooltip title="할 일 추가 (Enter)">
            <IconButton
              size="small"
              color="primary"
              onClick={submitNewTask}
              sx={{ mr: 0.5, transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.15)' } }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {/* Project Selector */}
        <Box onClick={(e) => setProjectAnchorEl(e.currentTarget)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, cursor: 'pointer', borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}>
          {selectedProject ? (
            <Chip label={selectedProject.name} size="small" onDelete={() => selectProject(null)} sx={{ bgcolor: selectedProject.color + '20', color: selectedProject.color, fontWeight: 600, height: 24, fontSize: '0.7rem', '& .MuiChip-deleteIcon': { color: selectedProject.color, fontSize: 14 } }} />
          ) : (
            <FolderIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
          )}
        </Box>
        <Menu anchorEl={projectAnchorEl} open={Boolean(projectAnchorEl)} onClose={() => setProjectAnchorEl(null)} slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160, mt: 1 } } }}>
          <MenuItem onClick={() => { selectProject(null); setProjectAnchorEl(null); }}>{t('noProject') || 'None'}</MenuItem>
          {projects.map((p) => (
            <MenuItem key={p.id} onClick={() => { selectProject(p); setProjectAnchorEl(null); }} selected={selectedProject?.id === p.id}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color, mr: 1 }} />{p.name}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem onClick={() => { setProjectAnchorEl(null); navigate('/settings'); }} sx={{ color: 'text.secondary' }}><SettingsIcon sx={{ fontSize: 16, mr: 1 }} />{t('goToSettings') || 'Manage Projects'}</MenuItem>
        </Menu>
      </Paper>

      {/* Lists (Kim Style DnD Wrapper around HEAD's items) */}
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* We use Droppable for the list. */}
        <Droppable droppableId="tasks-list">
          {(provided) => (
            <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ mb: 4 }}>
              {openTasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided) => (
                    <Box ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} sx={{ mb: 0 }}>
                      <TaskItem
                        task={task}
                        projects={projects}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={updateTask}
                        onCategoryChange={handleCategoryChange}
                        onClick={handleTaskClick} // Use correct handler
                      />
                    </Box>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      {/* Completed */}
      {filteredTasks.some((t) => t.completed) && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, mt: 4 }}>
          <Divider sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, fontWeight: 600, textTransform: 'uppercase' }}>{t('completed') as string}</Typography>
          <Divider sx={{ flexGrow: 1 }} />
        </Box>
      )}
      <Box sx={{ opacity: 0.8 }}>
        {completedTasks.map((task) => (
          <TaskItem key={task.id} task={task} projects={projects} onToggle={toggleTask} onDelete={deleteTask} onEdit={updateTask} onCategoryChange={handleCategoryChange} onClick={handleTaskClick} />
        ))}
      </Box>

      {/* Recent Activity */}
      <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mt: 4, mb: 3 }}>
        <ActivityFeed limit={10} />
      </Paper>

      <Fab color="primary" onClick={() => setAddDialogOpen(true)} sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 100 }}>
        <AddIcon />
      </Fab>

      <AddTaskDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onSubmit={addTask} />
      <TaskDetailDialog open={!!detailTask} task={detailTask} onClose={() => setDetailTask(null)} onUpdate={handleTaskUpdate} />
    </Box>
  );
};

export default Dashboard;
