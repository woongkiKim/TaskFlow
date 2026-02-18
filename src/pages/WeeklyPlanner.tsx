// src/pages/WeeklyPlanner.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Box, Typography, IconButton, Paper, Chip, CircularProgress, InputBase, Checkbox, Menu, MenuItem, Divider, ToggleButtonGroup, ToggleButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TuneIcon from '@mui/icons-material/Tune';

import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, getWeek } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext'; // Added
import { fetchTasks, addTaskToDB, toggleTaskStatusInDB, updateTaskTextInDB, deleteTaskFromDB, updateTaskDateInDB, rolloverTasksToDate, updateTaskOrdersInDB } from '../services/taskService';
import { fetchWorkspaceProjects } from '../services/projectService'; // Updated to HEAD service
import type { Task, Project } from '../types';
import { getDaysInWeek, formatWeekHeader, getNextWeek, getPrevWeek, isSameDate } from '../utils/dateUtils';
import { PomodoroStartButton } from '../components/PomodoroTimer';
import { parseTagsFromText, getTagColor } from '../components/TagInput';
import CategoryFilter from '../components/CategoryFilter';
import RolloverBanner from '../components/RolloverBanner';
import { getWeeklyPlannerPreferences, setWeeklyPlannerPreferences, DEFAULT_WEEKLY_PLANNER_PREFERENCES, type WeeklyPlannerPreferences } from '../utils/plannerPreferences';

// --- Sortable Task Card ---
const DraggableTaskCard = ({ task, isEditing, editText, editInputRef, onEditStart, onEditChange, onEditKeyDown, onEditConfirm, onEditCancel, onToggle, onDelete, dropHintPosition }: {
  task: Task;
  isEditing: boolean;
  editText: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onEditStart: (task: Task) => void;
  onEditChange: (text: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  dropHintPosition?: 'before' | 'after' | null;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Paper
      ref={setNodeRef}
      {...(isEditing ? {} : { ...listeners, ...attributes })}
      style={style}
      sx={{
        position: 'relative',
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isEditing ? 'primary.main' : '#e5e7eb',
        transition: isDragging ? 'none' : 'all 0.15s',
        opacity: isDragging ? 0.4 : 1,
        cursor: isEditing ? 'default' : 'grab',
        '&:hover': {
          boxShadow: 2,
          '& .task-actions': { opacity: 1 },
        },
        touchAction: 'none',
        '&::before': dropHintPosition === 'before' ? {
          content: '""',
          position: 'absolute',
          left: 6,
          right: 6,
          top: -6,
          height: 3,
          borderRadius: 3,
          bgcolor: 'primary.main',
        } : {},
        '&::after': dropHintPosition === 'after' ? {
          content: '""',
          position: 'absolute',
          left: 6,
          right: 6,
          bottom: -6,
          height: 3,
          borderRadius: 3,
          bgcolor: 'primary.main',
        } : {},
      }}
    >
      {isEditing ? (
        <Box>
          <InputBase
            inputRef={editInputRef}
            fullWidth
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={onEditKeyDown}
            sx={{ fontSize: '0.875rem', fontWeight: 500 }}
            autoFocus
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
            <IconButton size="small" onClick={onEditConfirm} sx={{ color: 'success.main', p: 0.5 }}>
              <CheckIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" onClick={onEditCancel} sx={{ color: 'text.secondary', p: 0.5 }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>
      ) : (
        <Box>
          {/* Tags / Category Chips */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: (task.category || (task.tags && task.tags.length > 0)) ? 0.5 : 0 }}>
            {task.category && (
              <Chip
                label={task.category}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', bgcolor: (task.categoryColor || '#3b82f6') + '20', color: task.categoryColor || '#3b82f6', fontWeight: 'bold' }}
              />
            )}
            {task.tags?.map(tag => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                sx={{ boxSizing: 'border-box', height: 20, fontSize: '0.6rem', fontWeight: 'bold', bgcolor: getTagColor(tag) + '18', color: getTagColor(tag) }}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Checkbox
              checked={task.completed}
              onChange={() => onToggle(task.id)}
              size="small"
              sx={{ p: 0, mt: 0.2, color: 'text.secondary', '&.Mui-checked': { color: 'primary.main' } }}
            />
            <Typography
              variant="body2"
              fontWeight="500"
              sx={{
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? 'text.secondary' : 'text.primary',
                flexGrow: 1,
                wordBreak: 'break-word',
              }}
              onDoubleClick={() => onEditStart(task)}
            >
              {task.text}
            </Typography>
            <Box className="task-actions" sx={{ opacity: 0, transition: 'opacity 0.15s', display: 'flex', flexShrink: 0 }}>
              <PomodoroStartButton taskId={task.id} taskText={task.text} />
              <IconButton size="small" onClick={() => onEditStart(task)} sx={{ p: 0.5, color: 'text.secondary' }}>
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ p: 0.5, color: 'error.main' }}>
                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

// --- Droppable Column (HEAD) ---
const DroppableColumn = ({
  dayISO,
  children,
  showDropHint = false,
}: {
  dayISO: string;
  children: React.ReactNode;
  showDropHint?: boolean;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: dayISO });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        p: 1.5,
        flexGrow: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        bgcolor: isOver ? 'primary.50' : 'transparent',
        transition: 'background-color 0.2s',
        borderRadius: 1,
        minHeight: 80,
        border: showDropHint ? '2px dashed' : '2px dashed transparent',
        borderColor: showDropHint ? 'primary.main' : 'transparent',
      }}
    >
      {children}
    </Box>
  );
};

interface WeeklyPlannerProps {
  initialDate?: Date;
}

// --- Main Component ---
const WeeklyPlanner = ({ initialDate }: WeeklyPlannerProps) => {
  const { user } = useAuth();
  const { currentWorkspace: workspace } = useWorkspace(); // Use workspace context
  const { t, lang } = useLanguage();
  const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectAnchorEl, setProjectAnchorEl] = useState<null | HTMLElement>(null);

  // Inline forms
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [plannerMenuAnchor, setPlannerMenuAnchor] = useState<null | HTMLElement>(null);

  // Edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // DnD state
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dropHint, setDropHint] = useState<{
    dayKey: string;
    taskId?: string;
    position: 'before' | 'after' | 'inside';
  } | null>(null);

  // Filters
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [lastWeekPending, setLastWeekPending] = useState<Task[]>([]);
  const [plannerPrefs, setPlannerPrefs] = useState<WeeklyPlannerPreferences>(() =>
    getWeeklyPlannerPreferences(user?.uid)
  );

  useEffect(() => {
    setPlannerPrefs(getWeeklyPlannerPreferences(user?.uid));
  }, [user?.uid]);

  const updatePlannerPrefs = useCallback((next: WeeklyPlannerPreferences) => {
    setPlannerPrefs(next);
    setWeeklyPlannerPreferences(next, user?.uid);
  }, [user?.uid]);

  const weekDayOrder = useMemo(
    () => plannerPrefs.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6],
    [plannerPrefs.weekStartsOn]
  );
  const translatedDayNames = useMemo(() => {
    const raw = t('dayNames');
    if (Array.isArray(raw) && raw.length === 7) {
      return raw.map(String);
    }
    return lang === 'ko'
      ? ['월', '화', '수', '목', '금', '토', '일']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [lang, t]);
  const dayLabelsByWeekday = useMemo(
    () => [translatedDayNames[6], ...translatedDayNames.slice(0, 6)],
    [translatedDayNames]
  );

  const dayLocale = lang === 'ko' ? ko : enUS;
  const dayLabel = useCallback((d: Date) => format(d, 'EEE', { locale: dayLocale }), [dayLocale]);

  const allWeekDays = useMemo(
    () => getDaysInWeek(currentDate, plannerPrefs.weekStartsOn),
    [currentDate, plannerPrefs.weekStartsOn]
  );
  const days = useMemo(
    () => allWeekDays.filter(d => !plannerPrefs.hiddenWeekdays.includes(d.getDay())),
    [allWeekDays, plannerPrefs.hiddenWeekdays]
  );
  const { monthYear, weekRange } = useMemo(
    () => formatWeekHeader(currentDate, plannerPrefs.weekStartsOn),
    [currentDate, plannerPrefs.weekStartsOn]
  );
  const weekNumber = useMemo(
    () => getWeek(currentDate, { weekStartsOn: plannerPrefs.weekStartsOn, firstWeekContainsDate: 1 }),
    [currentDate, plannerPrefs.weekStartsOn]
  );

  const toDayKey = (date: Date) => format(date, 'yyyy-MM-dd');
  const getTaskDayKey = (task: Task) => format(new Date(task.createdAt), 'yyyy-MM-dd');
  const sortTasksByOrder = useCallback((arr: Task[]) => [...arr].sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (initialDate) setCurrentDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch tasks
        const data = await fetchTasks(user.uid);
        setTasks(data);

        // Fetch projects if workspace is available
        if (workspace?.id) {
          const projectData = await fetchWorkspaceProjects(workspace.id);
          setProjects(projectData);
        }

        // Rollover logic
        const lastWeekStart = startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: plannerPrefs.weekStartsOn });
        const lastWeekEnd = endOfWeek(subWeeks(currentDate, 1), { weekStartsOn: plannerPrefs.weekStartsOn });
        const pending = data.filter(t => {
          const d = new Date(t.createdAt);
          return !t.completed && isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd });
        });
        setLastWeekPending(pending);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, currentDate, workspace, plannerPrefs.weekStartsOn]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(t => {
      t.tags?.forEach(tag => tagSet.add(tag));
      if (t.category) tagSet.add(t.category);
    });
    return Array.from(tagSet);
  }, [tasks]);

  const handlePrevWeek = () => setCurrentDate(getPrevWeek(currentDate));
  const handleNextWeek = () => setCurrentDate(getNextWeek(currentDate));
  const visibleDayCount = weekDayOrder.filter(d => !plannerPrefs.hiddenWeekdays.includes(d)).length;

  const handleChangeWeekStart = (value: 0 | 1) => {
    updatePlannerPrefs({ ...plannerPrefs, weekStartsOn: value });
  };

  const handleToggleWeekdayVisibility = (weekday: number) => {
    const hidden = plannerPrefs.hiddenWeekdays.includes(weekday);
    if (!hidden && visibleDayCount <= 1) return;
    const nextHidden = hidden
      ? plannerPrefs.hiddenWeekdays.filter(d => d !== weekday)
      : [...plannerPrefs.hiddenWeekdays, weekday].sort((a, b) => a - b);
    updatePlannerPrefs({ ...plannerPrefs, hiddenWeekdays: nextHidden });
  };

  const handleResetPlannerPrefs = () => {
    updatePlannerPrefs(DEFAULT_WEEKLY_PLANNER_PREFERENCES);
  };

  const handleOpenAdd = (day: Date) => {
    setAddingDay(toDayKey(day));
    setNewTaskText('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const handleCancelAdd = () => {
    setAddingDay(null);
    setNewTaskText('');
    setSelectedProject(null);
  };

  const handleSubmitAdd = async (date: Date) => {
    if (!newTaskText.trim() || !user) return;
    setSaving(true);
    try {
      const { cleanText, tags } = parseTagsFromText(newTaskText.trim());
      const finalText = cleanText || newTaskText.trim().replace(/#[\w\uAC00-\uD7A3]+/g, '').trim();

      const newTask = await addTaskToDB(
        finalText,
        user.uid,
        date,
        tags.length > 0 ? tags : undefined,
        // Support options for category
        {
          category: selectedProject?.name,
          categoryColor: selectedProject?.color,
          // We could also pass workspaceId if we had it easily accessible in scope here, 
          // but taskService handles it often or optional.
          workspaceId: workspace?.id
        }
      );

      const dayKey = toDayKey(date);
      const dayTasksAfterAdd = sortTasksByOrder(
        [...tasks.filter(t => getTaskDayKey(t) === dayKey), newTask]
      );
      const nextOrder = dayTasksAfterAdd.length - 1;
      const taskWithOrder = { ...newTask, order: nextOrder };
      setTasks(prev => [taskWithOrder, ...prev]);
      await updateTaskOrdersInDB([{ id: newTask.id, order: nextOrder }]);
      setNewTaskText('');
      setAddingDay(null);
      setSelectedProject(null);
    } catch {
      toast.error(textByLang('Add failed', '추가에 실패했습니다'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent, date: Date) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmitAdd(date);
    } else if (e.key === 'Escape') {
      handleCancelAdd();
    }
  };

  // Toggle/Edit/Delete - Keep HEAD largely
  const handleToggle = async (id: string) => {
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    try {
      await toggleTaskStatusInDB(id, taskToToggle.completed);
    } catch {
      setTasks(previousTasks);
      toast.error(textByLang('Toggle failed', '상태 변경에 실패했습니다'));
    }
  };

  const handleEditStart = (task: Task) => {
    setEditingTaskId(task.id);
    setEditText(task.text);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };
  const handleEditConfirm = async () => {
    if (!editingTaskId) return;
    const trimmed = editText.trim();
    const originalTask = tasks.find(t => t.id === editingTaskId);
    if (trimmed && originalTask && trimmed !== originalTask.text) {
      const previousTasks = [...tasks];
      setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, text: trimmed } : t));
      try {
        await updateTaskTextInDB(editingTaskId, trimmed);
      } catch {
        setTasks(previousTasks);
        toast.error(textByLang('Edit failed', '수정에 실패했습니다'));
      }
    }
    setEditingTaskId(null);
    setEditText('');
  };
  const handleEditCancel = () => {
    setEditingTaskId(null);
    setEditText('');
  };
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleEditConfirm();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleDelete = async (id: string) => {
    const previousTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await deleteTaskFromDB(id);
    } catch {
      setTasks(previousTasks);
      toast.error(textByLang('Delete failed', '삭제에 실패했습니다'));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task || null);
    setDropHint(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setDropHint(null);
      return;
    }

    const taskId = String(active.id);
    const overId = String(over.id);
    const movingTask = tasks.find(t => t.id === taskId);
    if (!movingTask) {
      setDropHint(null);
      return;
    }

    const overTask = tasks.find(t => t.id === overId);
    const targetDayKey = overTask ? getTaskDayKey(overTask) : overId;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDayKey)) {
      setDropHint(null);
      return;
    }

    if (!overTask) {
      setDropHint({ dayKey: targetDayKey, position: 'inside' });
      return;
    }

    const activeRect = active.rect.current.translated ?? active.rect.current.initial;
    const activeCenterY = activeRect
      ? activeRect.top + activeRect.height / 2
      : over.rect.top + over.rect.height / 2;
    const overCenterY = over.rect.top + over.rect.height / 2;
    const position: 'before' | 'after' = activeCenterY > overCenterY ? 'after' : 'before';

    setDropHint({ dayKey: targetDayKey, taskId: overTask.id, position });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const currentHint = dropHint;
    setDropHint(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);
    const movingTask = tasks.find(t => t.id === taskId);
    if (!movingTask) return;

    const overTask = tasks.find(t => t.id === overId);
    const sourceDayKey = getTaskDayKey(movingTask);
    const targetDayKey = overTask ? getTaskDayKey(overTask) : overId;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDayKey)) return;

    // Same-day reorder
    if (sourceDayKey === targetDayKey) {
      if (!overTask || overTask.id === movingTask.id) return;
      const sameDayTasks = sortTasksByOrder(tasks.filter(t => getTaskDayKey(t) === sourceDayKey));
      const oldIndex = sameDayTasks.findIndex(t => t.id === movingTask.id);
      const newIndex = sameDayTasks.findIndex(t => t.id === overTask.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      let insertIndex = newIndex;
      if (currentHint?.taskId === overTask.id && currentHint.position === 'after') {
        insertIndex = newIndex + 1;
      }
      if (oldIndex < insertIndex) {
        insertIndex -= 1;
      }
      if (insertIndex === oldIndex) return;

      const reordered = arrayMove(sameDayTasks, oldIndex, insertIndex);
      const updates = reordered.map((t, order) => ({ id: t.id, order }));
      const orderMap = new Map(updates.map(u => [u.id, u.order]));
      const previousTasks = [...tasks];
      setTasks(tasks.map(t => orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id) } : t));
      try {
        await updateTaskOrdersInDB(updates);
      } catch {
        setTasks(previousTasks);
        toast.error(textByLang('Move failed', '이동에 실패했습니다'));
      }
      return;
    }

    // Cross-day move + insert position in target day
    const sourceTasks = sortTasksByOrder(
      tasks.filter(t => t.id !== taskId && getTaskDayKey(t) === sourceDayKey)
    );
    const targetTasks = sortTasksByOrder(
      tasks.filter(t => t.id !== taskId && getTaskDayKey(t) === targetDayKey)
    );

    let insertIndex = targetTasks.length;
    if (overTask && getTaskDayKey(overTask) === targetDayKey) {
      const idx = targetTasks.findIndex(t => t.id === overTask.id);
      if (idx >= 0) {
        insertIndex = idx;
        if (currentHint?.taskId === overTask.id && currentHint.position === 'after') {
          insertIndex = idx + 1;
        }
      }
    }

    const oldDate = new Date(movingTask.createdAt);
    const newDate = new Date(`${targetDayKey}T00:00:00`);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
    const newDateStr = format(newDate, 'yyyy-MM-dd HH:mm:ss');

    const targetReordered = [...targetTasks];
    targetReordered.splice(insertIndex, 0, { ...movingTask, createdAt: newDateStr });

    const sourceUpdates = sourceTasks.map((t, order) => ({ id: t.id, order }));
    const targetUpdates = targetReordered.map((t, order) => ({ id: t.id, order }));
    const orderMap = new Map([...sourceUpdates, ...targetUpdates].map(u => [u.id, u.order]));

    const previousTasks = [...tasks];
    setTasks(tasks.map(t => {
      if (t.id === taskId) return { ...t, createdAt: newDateStr, order: orderMap.get(t.id) };
      if (orderMap.has(t.id)) return { ...t, order: orderMap.get(t.id) };
      return t;
    }));

    try {
      await updateTaskDateInDB(taskId, newDateStr);
      await updateTaskOrdersInDB([...sourceUpdates, ...targetUpdates]);
    } catch {
      setTasks(previousTasks);
      toast.error(textByLang('Move failed', '이동에 실패했습니다'));
    }
  };

  const handleRollover = async (taskIds: string[]) => {
    const thisWeekMonday = startOfWeek(currentDate, { weekStartsOn: plannerPrefs.weekStartsOn });
    const previousTasks = [...tasks];
    const newDateStr = format(thisWeekMonday, 'yyyy-MM-dd HH:mm:ss');
    setTasks(tasks.map(t => taskIds.includes(t.id) ? { ...t, createdAt: newDateStr } : t));
    setLastWeekPending([]);
    try {
      await rolloverTasksToDate(taskIds, thisWeekMonday);
    } catch {
      setTasks(previousTasks);
      toast.error(textByLang('Rollover failed', '이월에 실패했습니다'));
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDropHint(null)}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <IconButton onClick={handlePrevWeek} size="small"><ChevronLeftIcon /></IconButton>
              <IconButton onClick={handleNextWeek} size="small"><ChevronRightIcon /></IconButton>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" fontWeight="700">{monthYear}</Typography>
                <Chip size="small" label={`${format(currentDate, 'yyyy')}-W${weekNumber}`} sx={{ fontWeight: 700 }} />
              </Box>
              <Typography variant="body2" color="text.secondary">{weekRange}</Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => navigate(`/calendar?view=month&date=${format(currentDate, 'yyyy-MM-dd')}`)}
              sx={{ border: '1px solid', borderColor: 'divider' }}
              title={textByLang('Go to calendar', '캘린더로 이동')}
            >
              <CalendarMonthIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryFilter allTags={allTags} selectedTag={selectedTag} onSelectTag={setSelectedTag} />
            <IconButton
              size="small"
              onClick={(e) => setPlannerMenuAnchor(e.currentTarget)}
              sx={{ border: '1px solid', borderColor: 'divider' }}
              title={textByLang('Weekly settings', '주간 설정')}
            >
              <TuneIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Menu
          anchorEl={plannerMenuAnchor}
          open={Boolean(plannerMenuAnchor)}
          onClose={() => setPlannerMenuAnchor(null)}
          slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2, minWidth: 280 } } }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            {textByLang('Week Starts On', '주 시작 요일')}
          </Typography>
          <ToggleButtonGroup
            value={plannerPrefs.weekStartsOn}
            exclusive
            onChange={(_, v) => typeof v === 'number' && handleChangeWeekStart(v as 0 | 1)}
            size="small"
            sx={{ mt: 0.8, mb: 1.2, width: '100%' }}
          >
            <ToggleButton value={1} sx={{ flex: 1 }}>{dayLabelsByWeekday[1]}</ToggleButton>
            <ToggleButton value={0} sx={{ flex: 1 }}>{dayLabelsByWeekday[0]}</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
            {textByLang('Visible Weekdays', '표시할 요일')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 0.8, mb: 1.2 }}>
            {weekDayOrder.map((weekday) => {
              const visible = !plannerPrefs.hiddenWeekdays.includes(weekday);
              return (
                <Chip
                  key={weekday}
                  label={dayLabelsByWeekday[weekday]}
                  onClick={() => handleToggleWeekdayVisibility(weekday)}
                  color={visible ? 'primary' : 'default'}
                  variant={visible ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
              );
            })}
          </Box>
          <Divider sx={{ my: 0.8 }} />
          <MenuItem onClick={handleResetPlannerPrefs}>
            {textByLang('Reset to default', '기본값으로 재설정')}
          </MenuItem>
        </Menu>

        <Box sx={{ px: 1 }}>
          <RolloverBanner pendingTasks={lastWeekPending} onRollover={handleRollover} />
        </Box>

        {days.length > 0 && (
          <Box sx={{ px: 1, pb: 1, display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
            {days.map((day) => {
              const dayKey = toDayKey(day);
              const isToday = isSameDate(new Date(), day);
              return (
                <Chip
                  key={`week-strip-${dayKey}`}
                  label={`${dayLabel(day)} ${format(day, 'd')}`}
                  onClick={() => navigate(`/calendar?view=month&date=${dayKey}`)}
                  color={isToday ? 'primary' : 'default'}
                  variant={isToday ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                />
              );
            })}
          </Box>
        )}

        {days.length === 0 ? (
          <Paper sx={{ p: 3, mx: 1, borderRadius: 2, textAlign: 'center', color: 'text.secondary' }}>
            {textByLang('No visible weekdays. Select weekdays in weekly settings.', '표시할 요일이 없습니다. 주간 설정에서 요일을 선택해 주세요.')}
          </Paper>
        ) : (
          <Box sx={{
            display: { xs: 'flex', md: 'grid' },
            gridTemplateColumns: { md: `repeat(${days.length}, minmax(0, 1fr))` },
            gap: { xs: 2, md: 1 },
            overflowX: { xs: 'auto', md: 'hidden' },
            pb: 2,
            flexGrow: 1,
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: '#cbd5e1', borderRadius: 4 }
          }}>
            {days.map((day) => {
              const dayKey = toDayKey(day);
              let dayTasks = sortTasksByOrder(tasks.filter(task => getTaskDayKey(task) === dayKey));
              if (selectedTag) {
                dayTasks = dayTasks.filter(t => t.tags?.includes(selectedTag) || t.category === selectedTag);
              }
              const isToday = isSameDate(new Date(), day);
              const isAdding = addingDay === dayKey;
              const dayDropHint = dropHint?.dayKey === dayKey ? dropHint : null;

              return (
                <Paper
                  key={dayKey}
                  elevation={0}
                  sx={{
                    minWidth: { xs: 260, md: 0 }, flex: 1, display: 'flex', flexDirection: 'column',
                    bgcolor: isToday ? 'primary.50' : 'background.paper',
                    border: '1px solid', borderColor: isToday ? 'primary.main' : 'divider',
                    borderRadius: 3, height: '100%'
                  }}
                >
                  <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/calendar?view=month&date=${dayKey}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/calendar?view=month&date=${dayKey}`);
                        }
                      }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2, borderRadius: 1 } }}
                    >
                      <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: isToday ? 'primary.main' : 'action.hover', color: isToday ? 'white' : 'text.primary', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {format(day, 'd')}
                      </Box>
                      <Typography variant="caption" color={isToday ? 'primary.main' : 'text.secondary'} fontWeight={700}>
                        {dayLabel(day)}
                      </Typography>
                      {dayTasks.length > 0 && <Chip label={dayTasks.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 'bold' }} />}
                    </Box>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenAdd(day); }}><AddIcon fontSize="small" /></IconButton>
                  </Box>

                  <DroppableColumn dayISO={dayKey} showDropHint={Boolean(dayDropHint && !dayDropHint.taskId)}>
                    {isAdding && (
                      <Paper elevation={2} sx={{ p: 1.5, borderRadius: 2, border: '2px solid', borderColor: 'primary.main', bgcolor: 'background.paper' }}>
                        <InputBase
                          inputRef={inputRef} fullWidth placeholder={textByLang('Add task... (#tags)', '할 일을 입력하세요... (#태그)')}
                          value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => handleAddKeyDown(e, day)}
                          disabled={saving} autoFocus sx={{ fontSize: '0.875rem' }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box onClick={(e) => setProjectAnchorEl(e.currentTarget)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', mr: 1 }}>
                              {selectedProject ? (
                                <Chip label={selectedProject.name} size="small" onDelete={() => setSelectedProject(null)} sx={{ bgcolor: selectedProject.color + '20', color: selectedProject.color, height: 20, fontSize: '0.6rem' }} />
                              ) : <FolderIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                            </Box>
                            <Menu anchorEl={projectAnchorEl} open={Boolean(projectAnchorEl)} onClose={() => setProjectAnchorEl(null)} slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 140, mt: 1 } } }}>
                              <MenuItem onClick={() => { setSelectedProject(null); setProjectAnchorEl(null); }}>{textByLang('None', '없음')}</MenuItem>
                              {projects.map((p) => (
                                <MenuItem key={p.id} onClick={() => { setSelectedProject(p); setProjectAnchorEl(null); }} sx={{ gap: 1 }}>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} />{p.name}
                                </MenuItem>
                              ))}
                              <Divider />
                              <MenuItem onClick={() => { setProjectAnchorEl(null); navigate('/settings'); }} sx={{ color: 'text.secondary' }}><SettingsIcon sx={{ fontSize: 14, mr: 1 }} />{(t('goToSettings') as string) || textByLang('Manage Projects', '프로젝트 관리')}</MenuItem>
                            </Menu>
                          </Box>
                          <IconButton size="small" onClick={handleCancelAdd} sx={{ p: 0.5 }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
                        </Box>
                      </Paper>
                    )}
                    <SortableContext items={dayTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                      {dayTasks.map(task => (
                        <DraggableTaskCard
                          key={task.id} task={task} isEditing={editingTaskId === task.id}
                          editText={editText} editInputRef={editInputRef}
                          onEditStart={handleEditStart} onEditChange={setEditText}
                          onEditKeyDown={handleEditKeyDown} onEditConfirm={handleEditConfirm} onEditCancel={handleEditCancel}
                          onToggle={handleToggle} onDelete={handleDelete}
                          dropHintPosition={dayDropHint?.taskId === task.id ? (dayDropHint.position as 'before' | 'after') : null}
                        />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </Paper>
              );
            })}
          </Box>
        )}

        <DragOverlay>
          {activeTask ? (
            <Paper elevation={8} sx={{ p: 1.5, borderRadius: 2, border: '2px solid', borderColor: 'primary.main', minWidth: 250, opacity: 0.9 }}>
              <Typography variant="body2" fontWeight="500">{activeTask.text}</Typography>
            </Paper>
          ) : null}
        </DragOverlay>
      </Box>
    </DndContext>
  );
};

export default WeeklyPlanner;
