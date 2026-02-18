import { useState, useMemo } from 'react';
import { Box, Typography, Paper, Grid, Button, IconButton, Chip, CircularProgress, Tabs, Tab } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PieChartIcon from '@mui/icons-material/PieChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';

import { useLanguage } from '../contexts/LanguageContext';
import { useTasks } from '../hooks/useTasks';
import CycleAnalytics from '../components/CycleAnalytics';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WeeklyReports = () => {
  const { t } = useLanguage();
  const { tasks: allTasks, loading } = useTasks();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeTab, setActiveTab] = useState(0);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  // 이번 주 & 지난 주 Task 필터링
  const thisWeekTasks = useMemo(() =>
    allTasks.filter(t => {
      const d = new Date(t.createdAt);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }),
    [allTasks, weekStart, weekEnd]
  );

  const lastWeekStart = subWeeks(weekStart, 1);
  const lastWeekEnd = subWeeks(weekEnd, 1);
  const lastWeekTasks = useMemo(() =>
    allTasks.filter(t => {
      const d = new Date(t.createdAt);
      return isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd });
    }),
    [allTasks, lastWeekStart, lastWeekEnd]
  );

  // 통계 계산
  const totalTasks = thisWeekTasks.length;
  const completedTasks = thisWeekTasks.filter(t => t.completed).length;
  const pendingTasks = thisWeekTasks.filter(t => !t.completed);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 지난 주 비교
  const lastWeekCompleted = lastWeekTasks.filter(t => t.completed).length;
  const lastWeekTotal = lastWeekTasks.length;
  const lastWeekRate = lastWeekTotal > 0 ? Math.round((lastWeekCompleted / lastWeekTotal) * 100) : 0;

  const completedDiff = lastWeekCompleted > 0
    ? Math.round(((completedTasks - lastWeekCompleted) / lastWeekCompleted) * 100)
    : (completedTasks > 0 ? 100 : 0);
  const rateDiff = completionRate - lastWeekRate;

  // 차트 데이터 (요일별 Task total vs completed)
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const chartData = daysOfWeek.map((day, i) => {
    const dayTasks = thisWeekTasks.filter(t => isSameDay(new Date(t.createdAt), day));
    return {
      day: DAY_LABELS[i],
      total: dayTasks.length,
      completed: dayTasks.filter(t => t.completed).length,
    };
  });
  const maxChartValue = Math.max(...chartData.map(d => Math.max(d.total, d.completed)), 1);

  // 최근 완료된 Task (Achievements)
  const achievements = thisWeekTasks
    .filter(t => t.completed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // 주 이동
  const goToPrevWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const goToThisWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, height: '100%', overflowY: 'auto' }}>

      {/* 1. Header Section */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 4, gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="800" gutterBottom>
            {t('weeklyReport') as string}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <IconButton onClick={goToPrevWeek} size="small"><ChevronLeftIcon /></IconButton>
              <Button onClick={goToThisWeek} sx={{ color: 'text.primary', fontWeight: 600, minWidth: 'auto', fontSize: '0.8rem' }}>
                {t('thisWeek') as string}
              </Button>
              <IconButton onClick={goToNextWeek} size="small"><ChevronRightIcon /></IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayIcon fontSize="small" color="primary" />
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </Typography>
          </Box>
        </Box>
        {/* <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} sx={{ bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider' }}>
                {t('export') as string}
            </Button>
        </Box> */}
      </Box>

      {/* Report Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          },
        }}
      >
        <Tab label={t('weeklyReport') as string} />
        <Tab label={t('analytics') as string} />
      </Tabs>

      {activeTab === 1 ? (
        <CycleAnalytics />
      ) : (
      <>

      {/* 2. Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Card 1: Total Tasks Completed */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="500">{t('tasksCompleted') as string}</Typography>
                <Typography variant="h3" fontWeight="800" sx={{ mt: 1 }}>{completedTasks}</Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: 2, color: 'primary.main' }}>
                <TaskAltIcon />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Chip
                icon={completedDiff >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                label={`${Math.abs(completedDiff)}%`}
                size="small"
                sx={{
                  bgcolor: completedDiff >= 0 ? '#f0fdf4' : '#fef2f2',
                  color: completedDiff >= 0 ? '#16a34a' : '#dc2626',
                  fontWeight: 'bold',
                  '& .MuiChip-icon': { color: completedDiff >= 0 ? '#16a34a' : '#dc2626' }
                }}
              />
              <Typography variant="caption" color="text.secondary">{t('vsLastWeek') as string} ({lastWeekCompleted})</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 2: Completion Rate */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="500">{t('completionRate') as string}</Typography>
                <Typography variant="h3" fontWeight="800" sx={{ mt: 1 }}>{completionRate}%</Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: '#faf5ff', borderRadius: 2 }}>
                <PieChartIcon color="action" />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Chip
                icon={rateDiff >= 0 ? <ArrowUpwardIcon /> : <TrendingDownIcon />}
                label={`${Math.abs(rateDiff)}%p`}
                size="small"
                sx={{
                  bgcolor: rateDiff >= 0 ? '#f0fdf4' : '#fef2f2',
                  color: rateDiff >= 0 ? '#16a34a' : '#dc2626',
                  fontWeight: 'bold',
                  '& .MuiChip-icon': { color: rateDiff >= 0 ? '#16a34a' : '#dc2626' }
                }}
              />
              <Typography variant="caption" color="text.secondary">{t('vsLastWeek') as string} ({lastWeekRate}%)</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 3: Total Tasks */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="500">{t('totalTasks') as string}</Typography>
                <Typography variant="h3" fontWeight="800" sx={{ mt: 1 }}>
                  {totalTasks}
                </Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: '#fffbeb', borderRadius: 2, color: 'warning.main' }}>
                <CalendarTodayIcon />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {pendingTasks.length} {t('pending') as string} · {completedTasks} {t('done') as string}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Productivity Trends Chart */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h6" fontWeight="bold">{t('dailyOverview') as string}</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
              <Typography variant="caption" fontWeight="bold" color="text.secondary">{t('actual') as string}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'grey.300' }} />
              <Typography variant="caption" fontWeight="bold" color="text.secondary">{t('planned') as string}</Typography>
            </Box>
          </Box>
        </Box>

        {/* Chart Area */}
        <Box sx={{ height: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', px: { xs: 0, sm: 4 } }}>
          {chartData.map((data) => (
            <Box key={data.day} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', flex: 1 }}>
              {/* Count Labels */}
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 0.5 }}>
                {data.total > 0 ? `${data.completed}/${data.total}` : ''}
              </Typography>
              {/* Bars Container */}
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: '80%', width: '100%', justifyContent: 'center' }}>
                {/* Total Bar (Grey) */}
                <Box sx={{
                  width: { xs: 8, sm: 14 },
                  height: `${maxChartValue > 0 ? (data.total / maxChartValue) * 100 : 0}%`,
                  minHeight: data.total > 0 ? 4 : 0,
                  bgcolor: 'grey.300',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.5s'
                }} />
                {/* Completed Bar (Blue) */}
                <Box sx={{
                  width: { xs: 8, sm: 14 },
                  height: `${maxChartValue > 0 ? (data.completed / maxChartValue) * 100 : 0}%`,
                  minHeight: data.completed > 0 ? 4 : 0,
                  bgcolor: 'primary.main',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.5s',
                  boxShadow: data.completed > 0 ? '0 4px 6px rgba(59, 130, 246, 0.3)' : 'none'
                }} />
              </Box>
              {/* Label */}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>
                {data.day}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* 4. Bottom Lists (Achievements & Pending) */}
      <Grid container spacing={3} sx={{ pb: 4 }}>
        {/* Key Achievements List */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderBottomColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 0.8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex' }}>
                  <EmojiEventsIcon color="success" fontSize="small" />
                </Box>
                <Typography variant="subtitle1" fontWeight="bold">{t('completedTasks') as string}</Typography>
              </Box>
              <Chip label={`${achievements.length}`} size="small" sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 'bold', borderRadius: 1, height: 24 }} />
            </Box>

            <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
              {achievements.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">{t('noCompletedThisWeek') as string}</Typography>
                </Box>
              ) : (
                achievements.map((task) => (
                  <Box key={task.id} sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2, '&:hover': { bgcolor: 'background.default' } }}>
                    <Box sx={{ mt: 0.5, bgcolor: 'success.main', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                      <CheckIcon sx={{ fontSize: 14 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="600" noWrap>{task.text}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.category ? `${task.category} • ` : ''}{format(new Date(task.createdAt), 'yyyy.M.d')}
                      </Typography>
                    </Box>
                    {task.category && (
                      <Chip label={task.category} size="small" sx={{
                        bgcolor: '#eff6ff',
                        color: task.categoryColor || '#3b82f6',
                        fontWeight: 'bold',
                        borderRadius: 1,
                        height: 20,
                        fontSize: '0.65rem'
                      }} />
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Pending Items List */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderBottomColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'action.hover' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 0.8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex' }}>
                  <PendingActionsIcon color="warning" fontSize="small" />
                </Box>
                <Typography variant="subtitle1" fontWeight="bold">{t('pendingTasks') as string}</Typography>
              </Box>
              <Chip label={`${pendingTasks.length}`} size="small" sx={{ bgcolor: 'background.default', color: 'text.secondary', fontWeight: 'bold', borderRadius: 1, height: 24, border: '1px solid', borderColor: 'divider' }} />
            </Box>

            <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
              {pendingTasks.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">{t('noPendingTasks') as string}</Typography>
                </Box>
              ) : (
                pendingTasks.slice(0, 5).map((task) => (
                  <Box key={task.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: 'background.default' } }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArrowForwardIcon color="action" fontSize="small" />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="600" noWrap>{task.text}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.category ? `${task.category} · ` : ''}{t('created') as string}: {format(new Date(task.createdAt), 'yyyy.M.d')}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      </>
      )}
    </Box>
  );
};

export default WeeklyReports;