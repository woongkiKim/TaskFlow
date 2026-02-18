import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Box, Typography, IconButton, Paper, Grid, InputBase, Button, CircularProgress, Divider, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import { format, isSameDay, parseISO } from 'date-fns';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { fetchTasks, addTaskToDB, toggleTaskStatusInDB, updateTaskTextInDB, deleteTaskFromDB } from '../services/taskService';
import TaskItem from './TaskItem';
import IterationTimeline from './IterationTimeline';
import type { Task } from '../types';
import { getDaysInMonthGrid, getNextMonth, getPrevMonth, isSameMonthDate } from '../utils/dateUtils';
import { getWeeklyPlannerPreferences } from '../utils/plannerPreferences';

interface MonthlyViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const MonthlyView = ({ currentDate, setCurrentDate }: MonthlyViewProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { sprints } = useWorkspace();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(() => getWeeklyPlannerPreferences(user?.uid).weekStartsOn);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  const days = useMemo(() => getDaysInMonthGrid(currentDate, weekStartsOn), [currentDate, weekStartsOn]);
  const dayNames = useMemo(() => {
    const raw = t('dayNames');
    const mondayFirst = Array.isArray(raw) && raw.length === 7
      ? raw.map(String)
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return weekStartsOn === 1 ? mondayFirst : [mondayFirst[6], ...mondayFirst.slice(0, 6)];
  }, [t, weekStartsOn]);
  const weekendIndexes = weekStartsOn === 1 ? new Set([5, 6]) : new Set([0, 6]);

  // 데이터 로드
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchTasks(user.uid)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, currentDate]);

  useEffect(() => {
    setWeekStartsOn(getWeeklyPlannerPreferences(user?.uid).weekStartsOn);
  }, [user?.uid]);

  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  // 선택된 날짜의 할 일 필터링 (createdAt은 string이므로 new Date()로 변환)
  const selectedDayTasks = tasks.filter(task => isSameDay(new Date(task.createdAt), selectedDate));

  // 완료 통계 계산
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 빠른 할 일 추가 (사이드바)
  const handleAddTask = async () => {
    if (!newTaskText.trim() || !user) return;
    const targetTime = new Date(selectedDate);
    targetTime.setHours(9, 0, 0, 0);

    try {
      const newTask = await addTaskToDB(newTaskText.trim(), user.uid, targetTime);
      setTasks(prev => [newTask, ...prev]);
      setNewTaskText('');
    } catch (e) {
      toast.error(t('addFailed') as string);
    }
  };

  // 할 일 토글 (TaskItem의 onToggle(id) 시그니처에 맞춤)
  const handleToggle = async (id: string) => {
    if (!user) return;
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;

    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

    try {
      await toggleTaskStatusInDB(id, taskToToggle.completed);
    } catch (error) {
      setTasks(previousTasks);
      toast.error(t('toggleFailed') as string);
    }
  };

  // 수정 핸들러 (Dashboard와 동일)
  const handleEdit = async (id: string, newText: string) => {
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === id ? { ...t, text: newText } : t));

    try {
      await updateTaskTextInDB(id, newText);
    } catch (error) {
      setTasks(previousTasks);
      toast.error(t('editFailed') as string);
    }
  };

  // 삭제 핸들러 (Dashboard와 동일)
  const handleDelete = async (id: string) => {
    const previousTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));

    try {
      await deleteTaskFromDB(id);
    } catch (error) {
      setTasks(previousTasks);
      toast.error(t('deleteFailed') as string);
    }
  };

  // Enter 키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleAddTask();
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 3 }}>

      {/* [Left] Calendar Grid Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Navigation & Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <IconButton onClick={() => setCurrentDate(getPrevMonth(currentDate))} size="small"><ChevronLeftIcon /></IconButton>
              <Button
                onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
                sx={{ color: 'text.primary', fontWeight: 600, minWidth: 'auto' }}
              >
                {t('today') as string}
              </Button>
              <IconButton onClick={() => setCurrentDate(getNextMonth(currentDate))} size="small"><ChevronRightIcon /></IconButton>
            </Box>
            <Typography variant="h5" fontWeight="800">
              {format(currentDate, 'MMMM yyyy')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ bgcolor: 'action.hover', px: 1, py: 0.3, borderRadius: 1, fontSize: '0.7rem' }}>
              {t('basedOnCreatedDate') as string}
            </Typography>
          </Box>

          {/* Completion Widget */}
          <Paper sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold">{t('completion') as string}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight="800">{completionRate}%</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  {completedTasks}/{totalTasks}
                </Typography>
              </Box>
            </Box>
            <CircularProgress variant="determinate" value={completionRate} size={40} thickness={5} />
          </Paper>
        </Box>

        {/* ── Iteration Timeline ── */}
        {sprints.length > 0 && (
          <IterationTimeline
            sprints={sprints}
            currentDate={currentDate}
            expanded={timelineExpanded}
            onToggle={() => setTimelineExpanded(!timelineExpanded)}
          />
        )}

        <Grid container columns={7} sx={{ mb: 1, textAlign: 'center' }}>
          {dayNames.map((day, index) => (
            <Grid key={`${day}-${index}`} size={1}>
              <Typography
                variant="caption"
                fontWeight="bold"
                color={weekendIndexes.has(index) ? 'primary.main' : 'text.secondary'}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar Grid */}
        <Box sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.default', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Grid container columns={7}>
            {days.map((day) => {
              const dayTasks = tasks.filter(t => isSameDay(new Date(t.createdAt), day));
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonthDate(day, currentDate);
              const completedCount = dayTasks.filter(t => t.completed).length;

              return (
                <Grid
                  size={1}
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    if (!isSameMonthDate(day, currentDate)) {
                      setCurrentDate(day);
                    }
                  }}
                  sx={{
                    minHeight: 100,
                    borderRight: '1px solid #f0f0f0',
                    borderBottom: '1px solid #f0f0f0',
                    bgcolor: isSelected ? 'primary.50' : (isCurrentMonth ? 'background.paper' : 'rgba(249, 250, 251, 0.5)'),
                    cursor: 'pointer',
                    p: 1,
                    transition: 'all 0.2s',
                    position: 'relative',
                    '&:hover': { bgcolor: 'primary.50' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={isCurrentMonth ? 'text.primary' : 'text.disabled'}
                    >
                      {format(day, 'd')}
                    </Typography>
                    {isSelected && <AddIcon fontSize="small" color="primary" sx={{ opacity: 0.5 }} />}
                  </Box>

                  {/* Milestone markers on date cells */}
                  {sprints.filter(s => s.type === 'milestone' && s.endDate).map(ms => {
                    const msDate = parseISO(ms.endDate!);
                    if (!isSameDay(msDate, day)) return null;
                    return (
                      <Tooltip key={ms.id} title={`🎯 ${ms.name}`} arrow>
                        <Box sx={{
                          position: 'absolute', top: 4, right: 4,
                          width: 10, height: 10,
                          transform: 'rotate(45deg)',
                          bgcolor: ms.status === 'completed' ? 'success.main' : 'error.main',
                          borderRadius: 0.5,
                          opacity: 0.85,
                        }} />
                      </Tooltip>
                    );
                  })}

                  {/* Task Indicators */}
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {dayTasks.length > 0 && (
                      <>
                        {/* Progress Bar */}
                        <Box sx={{ width: '100%', height: 4, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                          <Box sx={{ width: `${(completedCount / dayTasks.length) * 100}%`, height: '100%', bgcolor: completedCount === dayTasks.length ? 'success.main' : 'primary.main' }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          {completedCount}/{dayTasks.length} {t('done') as string}
                        </Typography>

                        {/* Tag Preview */}
                        {dayTasks[0].category && (
                          <Box sx={{ bgcolor: '#f3e8ff', color: '#7c3aed', borderRadius: 1, px: 0.5, py: 0.2, fontSize: '0.6rem', width: 'fit-content', mt: 0.5 }}>
                            {dayTasks[0].category}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>

                  {/* Selected Border Overlay */}
                  {isSelected && (
                    <Box sx={{ position: 'absolute', inset: 0, border: '2px solid', borderColor: 'primary.main', pointerEvents: 'none' }} />
                  )}
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>

      {/* [Right] Sidebar: Selected Day Details */}
      <Paper
        elevation={4}
        sx={{
          width: 320,
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid', borderColor: 'divider'
        }}
      >
        {/* Sidebar Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f0f0f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="primary" fontWeight="bold" sx={{ bgcolor: 'primary.50', px: 1, py: 0.5, borderRadius: 1 }}>
              {t('selectedDay') as string}
            </Typography>
          </Box>
          <Typography variant="h5" fontWeight="800" gutterBottom>
            {format(selectedDate, 'MMM d')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {format(selectedDate, 'EEEE')} · {selectedDayTasks.length} {t('activeTasks') as string}
          </Typography>

          {/* Add Task Input */}
          <Box sx={{ mt: 3, position: 'relative' }}>
            <InputBase
              fullWidth
              placeholder={t('addNewTask') as string}
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{
                bgcolor: 'background.default',
                borderRadius: 2,
                pl: 2, pr: 5, py: 1,
                border: '1px solid', borderColor: 'divider',
                fontSize: '0.9rem'
              }}
            />
            <IconButton
              size="small"
              onClick={handleAddTask}
              sx={{ position: 'absolute', right: 4, top: 4, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
            >
              <ChevronRightIcon fontSize="small" color="primary" />
            </IconButton>
          </Box>
        </Box>

        {/* Task List — Dashboard와 동일한 TaskItem 사용 */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          {selectedDayTasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.5 }}>
              <Typography variant="body2">{t('noTasksForDay') as string}</Typography>
            </Box>
          ) : (
            <>
              {/* 미완료 */}
              {selectedDayTasks.filter(t => !t.completed).map(task => (
                <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
              ))}

              {/* 완료 구분선 */}
              {selectedDayTasks.some(t => t.completed) && (
                <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                  <Divider sx={{ flexGrow: 1 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    {t('completed') as string}
                  </Typography>
                  <Divider sx={{ flexGrow: 1 }} />
                </Box>
              )}

              {/* 완료됨 */}
              <Box sx={{ opacity: 0.8 }}>
                {selectedDayTasks.filter(t => t.completed).map(task => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
              </Box>
            </>
          )}
        </Box>

        {/* Upgrade Banner */}
        <Box sx={{ p: 2, bgcolor: 'primary.50', borderTop: '1px solid', borderColor: 'primary.100' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: 'primary.100', p: 1, borderRadius: 2, color: 'primary.main' }}>✨</Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" fontWeight="bold" display="block">{t('upgradeToPro') as string}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{t('unlockAI') as string}</Typography>
            </Box>
            <Button size="small" variant="contained" sx={{ minWidth: 'auto', px: 2, py: 0.5, fontSize: '0.7rem' }}>{t('view') as string}</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default MonthlyView;
