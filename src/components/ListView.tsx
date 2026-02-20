import { useMemo, useState, useCallback } from 'react';
import { Box, Typography, Paper, Divider, Chip, CircularProgress } from '@mui/material';
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
import type { TranslationKeys } from '../locales/en';

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
  allTasks?: Task[];  // for sub-issue count calculation
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
  sprintGroups,
  allTasks,
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

  // Sub-issue count map
  const subIssueCountMap = useMemo(() => {
    const sourceList = allTasks || tasks;
    const map: Record<string, number> = {};
    sourceList.forEach(t => {
      if (t.parentTaskId) {
        map[t.parentTaskId] = (map[t.parentTaskId] || 0) + 1;
      }
    });
    return map;
  }, [allTasks, tasks]);

  // Exclude sub-issues from top-level lists — they are visible inside their parent's detail dialog
  const topLevelTasks = useMemo(
    () => filteredTasks.filter(task => !task.parentTaskId),
    [filteredTasks]
  );

  const todayIncompleteTasks = useMemo(
    () => sortByOrder(topLevelTasks.filter(task => !task.completed && task.createdAt.startsWith(todayKey))),
    [topLevelTasks, todayKey]
  );

  const pastIncompleteTasks = useMemo(
    () => sortByOrder(topLevelTasks.filter(task => !task.completed && !task.createdAt.startsWith(todayKey))),
    [topLevelTasks, todayKey]
  );

  const completedTasks = useMemo(
    () => sortByOrder(topLevelTasks.filter(task => task.completed)),
    [topLevelTasks]
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

  // Sprint-grouped tasks for Phase/Milestone views
  const sprintGroupedTasks = useMemo(() => {
    if (!sprintGroups) return null;
    const groups: { sprintId: string; sprintName: string; tasks: Task[] }[] = [];
    const ungrouped: Task[] = [];
    const groupIds = Object.keys(sprintGroups);

    // Build groups in order of sprintGroups keys
    groupIds.forEach(sid => {
      groups.push({
        sprintId: sid,
        sprintName: sprintGroups[sid],
        tasks: filteredTasks.filter(tk => tk.sprintId === sid),
      });
    });
    // Tasks without a matching sprintId
    filteredTasks.forEach(tk => {
      if (!tk.sprintId || !groupIds.includes(tk.sprintId)) {
        ungrouped.push(tk);
      }
    });
    if (ungrouped.length > 0) {
      groups.push({ sprintId: '__ungrouped', sprintName: 'Other', tasks: ungrouped });
    }
    return groups.filter(g => g.tasks.length > 0);
  }, [sprintGroups, filteredTasks]);

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

  // Time-aware greeting
  const getGreetingKey = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'goodMorning';
    if (hour < 18) return 'goodAfternoon';
    return 'goodEvening';
  };

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', pb: 4 }}>
      <Box sx={{
        mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        flexWrap: 'wrap', gap: 2,
      }}>
        <Box>
          <Typography variant="h4" fontWeight="800" gutterBottom sx={{
            background: 'linear-gradient(135deg, #2563eb, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {t(getGreetingKey() as TranslationKeys) as string}{user?.displayName ? `, ${user.displayName}` : ''} 👋
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon fontSize="small" color="primary" />
            {t('todayComma') as string} {todayDate}
          </Typography>
        </Box>
        <Paper sx={{
          p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2,
          border: '1px solid', borderColor: 'divider',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.05))'
            : 'linear-gradient(135deg, rgba(37, 99, 235, 0.04), rgba(99, 102, 241, 0.02))',
        }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate" value={progress} size={44}
              sx={{ color: progress === 100 ? 'success.main' : 'primary.main' }}
            />
            <Box sx={{
              top: 0, left: 0, bottom: 0, right: 0, position: 'absolute',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography variant="caption" fontWeight="bold" color="text.primary" sx={{ fontSize: '0.65rem' }}>
                {progress}%
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2" fontWeight="bold">{completedCount}/{tasks.length} {t('completed') as string}</Typography>
            <Typography variant="caption" color="text.secondary">
              {progress === 100 ? (t('allDone') as string) : (t('keepItUp') as string)}
            </Typography>
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TagInput onSubmit={onAddInline} />
      </Box>

      <Box sx={{ mb: 4 }}>
        {todayIncompleteTasks.length === 0 && pastIncompleteTasks.length === 0 && !sprintGroupedTasks && (
          <Box sx={{
            py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
            opacity: 0.7,
          }}>
            <Typography fontSize="2.5rem">🎯</Typography>
            <Typography color="text.secondary" align="center" fontWeight={500}>
              {t('noTasks') as string}
            </Typography>
          </Box>
        )}

        {/* Sprint-grouped view for Phase/Milestone */}
        {sprintGroupedTasks && sprintGroupedTasks.length > 0 && (
          <Box sx={{ mb: 4 }}>
            {sprintGroupedTasks.map(group => {
              const groupDone = group.tasks.filter(tk => tk.completed).length;
              const groupTotal = group.tasks.length;
              const groupPct = groupTotal > 0 ? Math.round((groupDone / groupTotal) * 100) : 0;
              return (
                <Box key={group.sprintId} sx={{ mb: 3 }}>
                  {/* Sprint group header */}
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1, mb: 1,
                    px: 1, py: 0.5,
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                  }}>
                    <Box sx={{
                      width: 3, height: 20, borderRadius: 2,
                      bgcolor: group.sprintId === '__ungrouped' ? 'text.disabled' : '#6366f1',
                    }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1, fontSize: '0.8rem' }}>
                      🚀 {group.sprintName}
                    </Typography>
                    <Chip
                      label={`${groupDone}/${groupTotal}`}
                      size="small"
                      sx={{
                        fontWeight: 600, fontSize: '0.65rem', height: 20,
                        bgcolor: groupPct === 100 ? 'success.main' : 'primary.main',
                        color: '#fff',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {groupPct}%
                    </Typography>
                  </Box>
                  {/* Tasks in this sprint */}
                  {sortByOrder(group.tasks.filter(tk => !tk.completed)).map(task => (
                    <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onClick={onTaskClick} subIssueCount={subIssueCountMap[task.id] || 0} />
                  ))}
                  {group.tasks.some(tk => tk.completed) && (
                    <Box sx={{ opacity: 0.6, mt: 0.5 }}>
                      {sortByOrder(group.tasks.filter(tk => tk.completed)).map(task => (
                        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onClick={onTaskClick} subIssueCount={subIssueCountMap[task.id] || 0} />
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Normal date-grouped view (hidden when sprint-grouped) */}
        {!sprintGroupedTasks && todayIncompleteTasks.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
              <Chip label={t('todayTasks') as string} size="small" color="primary" sx={{ fontWeight: 600 }} />
              <Chip label={todayIncompleteTasks.length} size="small" variant="outlined" sx={{ height: 22, minWidth: 24, fontWeight: 700, fontSize: '0.75rem', borderColor: 'primary.main', color: 'primary.main' }} />
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
                        subIssueCount={subIssueCountMap[task.id] || 0}
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
                  subIssueCount={subIssueCountMap[task.id] || 0}
                />
              ))
            )}
          </Box>
        )}

        {!sprintGroupedTasks && Object.keys(pastGrouped).length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1 }}>
              <Chip label={t('pastTasks') as string} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
              <Chip label={pastIncompleteTasks.length} size="small" variant="outlined" sx={{ height: 22, minWidth: 24, fontWeight: 700, fontSize: '0.75rem', color: 'text.primary', borderColor: 'divider' }} />
            </Box>
            {Object.entries(pastGrouped).map(([dateKey, dateTasks]) => (
              <Box key={dateKey} sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.5, display: 'block', fontWeight: 600 }}>
                  {format(new Date(dateKey), lang === 'ko' ? 'MM-dd (EEEE)' : 'MMM d (EEE)', { locale: dateLocale })}
                </Typography>
                {sortByOrder(dateTasks).map(task => (
                  <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onClick={onTaskClick} subIssueCount={subIssueCountMap[task.id] || 0} />
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
          <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onClick={onTaskClick} subIssueCount={subIssueCountMap[task.id] || 0} />
        ))}
      </Box>
    </Box>
  );
};

export default ListView;
