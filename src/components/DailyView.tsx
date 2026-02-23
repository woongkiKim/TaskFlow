import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Box, Typography, InputBase, Paper, Divider, Chip, CircularProgress, IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ko as dateFnsKo } from 'date-fns/locale';
import TaskItem from './TaskItem';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

import { fetchTasks, addTaskToDB, toggleTaskStatusInDB, updateTaskTextInDB, deleteTaskFromDB } from '../services/taskService';
import type { Task } from '../types';

interface DailyViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  calendarView?: 'month' | 'week' | 'day';
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

const DailyView = ({ currentDate, setCurrentDate, calendarView, onViewChange }: DailyViewProps) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const dateLocale = lang === 'ko' ? dateFnsKo : undefined;
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);

  // 선택한 날짜의 Task만 필터링
  const tasks = allTasks.filter(t => isSameDay(new Date(t.createdAt), currentDate));

  const isToday = isSameDay(currentDate, new Date());
  const dateLabel = isToday
    ? `${t('todayComma') as string} ${format(currentDate, 'EEEE, MMMM d', { locale: dateLocale })}`
    : format(currentDate, 'EEEE, MMMM d', { locale: dateLocale });

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // 1. 데이터 로드
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const data = await fetchTasks(user.uid);
        setAllTasks(data);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [user]);

  // 2. 추가 핸들러
  const handleAddTask = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && newTaskText.trim() && user) {
      e.preventDefault();
      try {
        const targetTime = new Date(currentDate);
        targetTime.setHours(9, 0, 0, 0);
        const savedTask = await addTaskToDB(newTaskText.trim(), user.uid, targetTime);
        setAllTasks(prev => [savedTask, ...prev]);
        setNewTaskText('');
      } catch {
        toast.error(t('addFailed') as string);
      }
    }
  };

  // 3. 토글 핸들러
  const handleToggle = async (id: string) => {
    const taskToToggle = allTasks.find(t => t.id === id);
    if (!taskToToggle) return;

    const previousTasks = [...allTasks];
    setAllTasks(allTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

    try {
      await toggleTaskStatusInDB(id, taskToToggle.completed);
    } catch {
      setAllTasks(previousTasks);
      toast.error(t('toggleFailed') as string);
    }
  };

  // 4. 수정 핸들러
  const handleEdit = async (id: string, newText: string) => {
    const previousTasks = [...allTasks];
    setAllTasks(allTasks.map((t) => (t.id === id ? { ...t, text: newText } : t)));

    try {
      await updateTaskTextInDB(id, newText);
    } catch {
      setAllTasks(previousTasks);
      toast.error(t('editFailed') as string);
    }
  };

  // 5. 삭제 핸들러
  const handleDelete = async (id: string) => {
    const previousTasks = [...allTasks];
    setAllTasks(allTasks.filter((t) => t.id !== id));

    try {
      await deleteTaskFromDB(id);
    } catch {
      setAllTasks(previousTasks);
      toast.error(t('deleteFailed') as string);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', pb: 4 }}>
      {/* 헤더 섹션 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid' }}>
              <IconButton onClick={() => setCurrentDate(subDays(currentDate, 1))} size="small"><ChevronLeftIcon /></IconButton>
              <IconButton
                onClick={() => setCurrentDate(new Date())}
                size="small"
                sx={{ fontSize: '0.8rem', fontWeight: 600, px: 1 }}
              >
                {t('today') as string}
              </IconButton>
              <IconButton onClick={() => setCurrentDate(addDays(currentDate, 1))} size="small"><ChevronRightIcon /></IconButton>
            </Box>
            {onViewChange && (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.3 }}>
                <ToggleButtonGroup
                  value={calendarView || 'day'}
                  exclusive
                  onChange={(_, v) => v && onViewChange(v)}
                  size="small"
                  sx={{ height: 30 }}
                >
                  <ToggleButton value="month" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>{t('month') as string}</ToggleButton>
                  <ToggleButton value="week" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>{t('week') as string}</ToggleButton>
                  <ToggleButton value="day" sx={{ px: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>{t('day') as string}</ToggleButton>
                </ToggleButtonGroup>
              </Paper>
            )}
          </Box>
          <Typography variant="h4" fontWeight="800" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
            {format(currentDate, 'PPP', { locale: dateLocale })}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarTodayIcon fontSize="small" color="primary" />
            {dateLabel}
          </Typography>
        </Box>

        {/* 진행률 카드 */}
        <Paper sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {progress}%
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {completedCount}/{tasks.length} {t('completed') as string}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tasks.length === 0 ? t('noTasksYet') as string : completedCount === tasks.length ? t('allDone') as string : t('keepItUp') as string}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* 입력 섹션 */}
      <Paper
        elevation={0}
        sx={{
          p: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          mb: 4,
          borderRadius: 3,
          border: '1px solid',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <Box sx={{ p: 2, color: 'primary.main' }}>
          <AddIcon />
        </Box>
        <InputBase
          sx={{ ml: 1, flex: 1, fontSize: '1.1rem' }}
          placeholder={t('addNewTask') as string}
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleAddTask}
        />
        <Box sx={{ p: 1, mr: 1 }}>
          <Chip label="Enter" size="small" variant="outlined" sx={{ borderRadius: 1, height: 24, fontSize: '0.7rem' }} />
        </Box>
      </Paper>

      {/* 할 일 목록 (미완료) */}
      <Box sx={{ mb: 4 }}>
        {tasks.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            {t('noTasks') as string}
          </Typography>
        )}
        {tasks
          .filter((t) => !t.completed)
          .map((task) => (
            <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
      </Box>

      {/* 완료됨 구분선 */}
      {tasks.some((t) => t.completed) && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Divider sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, fontWeight: 600, textTransform: 'uppercase' }}>
            {t('completed') as string}
          </Typography>
          <Divider sx={{ flexGrow: 1 }} />
        </Box>
      )}

      {/* 완료된 목록 */}
      <Box sx={{ opacity: 0.8 }}>
        {tasks
          .filter((t) => t.completed)
          .map((task) => (
            <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
      </Box>
    </Box>
  );
};

export default DailyView;
