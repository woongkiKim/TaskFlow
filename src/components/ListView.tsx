import { useMemo, useState, useCallback } from 'react';
import { Box, Typography, Paper, Divider, Chip } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import TagInput from './TagInput';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Task } from '../types';

interface ListViewProps {
  tasks: Task[];
  selectedTag: string | null;
  sprintGroups?: Record<string, string>;
  onAddInline: (text: string, tags: string[]) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onTaskClick: (task: Task) => void;
  onMoveTask?: (taskId: string, direction: 'up' | 'down', orderedIds: string[]) => void;
  onReorderTodayTasks?: (orderedIds: string[]) => void;
}

const sortByOrder = (arr: Task[]) => [...arr].sort((a, b) => {
  const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
  const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return b.createdAt.localeCompare(a.createdAt);
});

const SortableTodayTaskRow = ({
  taskId,
  dropHintPosition,
  children,
}: {
  taskId: string;
  dropHintPosition?: 'before' | 'after' | null;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: taskId });

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      sx={{
        position: 'relative',
        borderRadius: 2,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
        '&::before': dropHintPosition === 'before' ? {
          content: '""',
          position: 'absolute',
          left: 8,
          right: 8,
          top: -6,
          height: 3,
          borderRadius: 3,
          bgcolor: 'primary.main',
          zIndex: 2,
        } : {},
        '&::after': dropHintPosition === 'after' ? {
          content: '""',
          position: 'absolute',
          left: 8,
          right: 8,
          bottom: -6,
          height: 3,
          borderRadius: 3,
          bgcolor: 'primary.main',
          zIndex: 2,
        } : {},
      }}
    >
      {children}
    </Box>
  );
};

const ListView = ({
  tasks,
  selectedTag,
  onAddInline,
  onToggle,
  onDelete,
  onEdit,
  onTaskClick,
  onMoveTask,
  onReorderTodayTasks,
}: ListViewProps) => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const dateLocale = lang === 'ko' ? ko : undefined;
  const todayDate = format(new Date(), lang === 'ko' ? 'yyyy-MM-dd EEEE' : 'EEEE, MMMM d', { locale: dateLocale });
  const completedCount = tasks.filter(tk => tk.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const [todayDropHint, setTodayDropHint] = useState<{
    taskId?: string;
    position: 'before' | 'after' | 'inside';
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filteredTasks = useMemo(() => {
    if (!selectedTag) return tasks;
    return tasks.filter(tk => tk.tags?.includes(selectedTag) || tk.category === selectedTag);
  }, [tasks, selectedTag]);

  const todayIncompleteTasks = useMemo(
    () => sortByOrder(filteredTasks.filter(task => !task.completed && task.createdAt.startsWith(todayKey))),
    [filteredTasks, todayKey]
  );

  const pastIncompleteTasks = useMemo(
    () => sortByOrder(filteredTasks.filter(task => !task.completed && !task.createdAt.startsWith(todayKey))),
    [filteredTasks, todayKey]
  );

  const completedTasks = useMemo(
    () => sortByOrder(filteredTasks.filter(task => task.completed)),
    [filteredTasks]
  );

  const pastGrouped = useMemo(() => {
    const grouped = pastIncompleteTasks.reduce<Record<string, Task[]>>((acc, task) => {
      const dateKey = task.createdAt.substring(0, 10);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
      return acc;
    }, {});
    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
    return Object.fromEntries(sortedEntries);
  }, [pastIncompleteTasks]);

  const handleTodayDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setTodayDropHint(null);
      return;
    }

    const overId = String(over.id);
    const overTask = todayIncompleteTasks.find(task => task.id === overId);
    if (!overTask) {
      setTodayDropHint({ position: 'inside' });
      return;
    }

    const activeRect = active.rect.current.translated ?? active.rect.current.initial;
    const activeCenterY = activeRect
      ? activeRect.top + activeRect.height / 2
      : over.rect.top + over.rect.height / 2;
    const overCenterY = over.rect.top + over.rect.height / 2;
    const position: 'before' | 'after' = activeCenterY > overCenterY ? 'after' : 'before';
    setTodayDropHint({ taskId: overTask.id, position });
  }, [todayIncompleteTasks]);

  const handleTodayDragEnd = useCallback((event: DragEndEvent) => {
    const currentHint = todayDropHint;
    setTodayDropHint(null);

    if (!onReorderTodayTasks) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = todayIncompleteTasks.findIndex(task => task.id === activeId);
    if (oldIndex < 0) return;

    const overIndex = todayIncompleteTasks.findIndex(task => task.id === overId);

    if (overIndex < 0) {
      if (oldIndex !== todayIncompleteTasks.length - 1) {
        const reordered = arrayMove(todayIncompleteTasks, oldIndex, todayIncompleteTasks.length - 1);
        onReorderTodayTasks(reordered.map(task => task.id));
      }
      return;
    }

    let insertIndex = overIndex;
    if (currentHint?.taskId === overId && currentHint.position === 'after') {
      insertIndex = overIndex + 1;
    }
    if (oldIndex < insertIndex) {
      insertIndex -= 1;
    }
    if (insertIndex === oldIndex) return;

    const reordered = arrayMove(todayIncompleteTasks, oldIndex, insertIndex);
    onReorderTodayTasks(reordered.map(task => task.id));
  }, [todayDropHint, onReorderTodayTasks, todayIncompleteTasks]);

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', pb: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" gutterBottom>
            {t('goodMorning') as string}{user?.displayName ? `, ${user.displayName}` : ''}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon fontSize="small" color="primary" />
            {t('todayComma') as string} {todayDate}
          </Typography>
        </Box>
        <Paper sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" color="primary" fontWeight="bold">{progress}%</Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2" fontWeight="bold">{completedCount}/{tasks.length} {t('completed') as string}</Typography>
            <Typography variant="caption" color="text.secondary">{t('keepItUp') as string}</Typography>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TagInput onSubmit={onAddInline} />
      </Box>

      <Box sx={{ mb: 4 }}>
        {filteredTasks.filter(tk => !tk.completed).length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            {t('noTasks') as string}
          </Typography>
        )}

        {todayIncompleteTasks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Chip label={t('todayTasks') as string} size="small" color="primary" sx={{ fontWeight: 600 }} />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{todayIncompleteTasks.length}</Typography>
            </Box>

            {onReorderTodayTasks ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragOver={handleTodayDragOver}
                onDragEnd={handleTodayDragEnd}
                onDragCancel={() => setTodayDropHint(null)}
              >
                <SortableContext items={todayIncompleteTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                  {todayIncompleteTasks.map((task, index) => (
                    <SortableTodayTaskRow
                      key={task.id}
                      taskId={task.id}
                      dropHintPosition={todayDropHint?.taskId === task.id ? (todayDropHint.position as 'before' | 'after') : null}
                    >
                      <TaskItem
                        task={task}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onClick={onTaskClick}
                        onMoveUp={onMoveTask ? (id) => onMoveTask(id, 'up', todayIncompleteTasks.map(tk => tk.id)) : undefined}
                        onMoveDown={onMoveTask ? (id) => onMoveTask(id, 'down', todayIncompleteTasks.map(tk => tk.id)) : undefined}
                        disableMoveUp={index === 0}
                        disableMoveDown={index === todayIncompleteTasks.length - 1}
                      />
                    </SortableTodayTaskRow>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              todayIncompleteTasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onClick={onTaskClick}
                  onMoveUp={onMoveTask ? (id) => onMoveTask(id, 'up', todayIncompleteTasks.map(tk => tk.id)) : undefined}
                  onMoveDown={onMoveTask ? (id) => onMoveTask(id, 'down', todayIncompleteTasks.map(tk => tk.id)) : undefined}
                  disableMoveUp={index === 0}
                  disableMoveDown={index === todayIncompleteTasks.length - 1}
                />
              ))
            )}
          </Box>
        )}

        {Object.keys(pastGrouped).length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Chip label={t('pastTasks') as string} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{pastIncompleteTasks.length}</Typography>
            </Box>
            {Object.entries(pastGrouped).map(([dateKey, dateTasks]) => (
              <Box key={dateKey} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.5, display: 'block', fontWeight: 600 }}>
                  {format(new Date(dateKey), lang === 'ko' ? 'MM-dd (EEEE)' : 'MMM d (EEE)', { locale: dateLocale })}
                </Typography>
                {sortByOrder(dateTasks).map(task => (
                  <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onClick={onTaskClick} />
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {completedTasks.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Divider sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, fontWeight: 600, textTransform: 'uppercase' }}>
            {t('completed') as string}
          </Typography>
          <Divider sx={{ flexGrow: 1 }} />
        </Box>
      )}

      <Box sx={{ opacity: 0.8 }}>
        {completedTasks.map(task => (
          <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onClick={onTaskClick} />
        ))}
      </Box>
    </Box>
  );
};

export default ListView;
