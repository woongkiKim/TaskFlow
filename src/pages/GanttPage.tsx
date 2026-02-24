// src/pages/GanttPage.tsx
// Gantt chart — uses real task data from useTasks hook
import { useMemo } from 'react';
import {
  Box, Typography, Paper, Button,
  alpha, useTheme, Fade, Avatar, Tooltip, IconButton, Chip,
} from '@mui/material';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import FilterListIcon from '@mui/icons-material/FilterList';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInDays, parseISO } from 'date-fns';
import { ko as koLocale, enUS } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';
import { useTasks } from '../hooks/useTasks';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { TASK_TYPE_CONFIG, STATUS_CONFIG } from '../types';
import type { Task } from '../types';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

type GanttTask = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  assignee: { name: string; avatar?: string };
  color: string;
  status: string;
  dependencies?: string[];
};

/** Convert a real Task to GanttTask, skipping tasks without date info */
function taskToGantt(task: Task, today: Date): GanttTask | null {
  // Need at least one date
  if (!task.startDate && !task.dueDate) return null;

  const start = task.startDate ? parseISO(task.startDate) : (task.dueDate ? addDays(parseISO(task.dueDate), -3) : today);
  const end = task.dueDate ? parseISO(task.dueDate) : addDays(start, 5);

  // Calculate progress based on status
  let progress = 0;
  const status = task.status || 'todo';
  if (status === 'done') progress = 100;
  else if (status === 'inprogress') progress = 50;
  else if (status === 'in-review') progress = 75;
  else if (status === 'analysis-required') progress = 25;
  else if (status === 'handed-off') progress = 90;

  // Color from task type or status
  const typeConfig = TASK_TYPE_CONFIG[task.type || 'task'];
  const color = typeConfig?.color || '#3b82f6';

  return {
    id: task.id,
    name: task.text,
    startDate: start,
    endDate: end,
    progress,
    assignee: { name: task.assigneeName || 'Unassigned', avatar: task.assigneePhoto },
    color,
    status,
  };
}

export default function GanttPage() {
  const theme = useTheme();
  const { lang } = useLanguage();
  const dateFnsLocale = lang === 'ko' ? koLocale : enUS;
  const { currentProject } = useWorkspace();
  const { tasks: allTasks, loading } = useTasks();

  // Stable date reference
  const today = useMemo(() => new Date(), []);

  // Filter tasks with dates — optionally by current project
  const ganttTasks: GanttTask[] = useMemo(() => {
    const filtered = currentProject
      ? allTasks.filter(t => t.projectId === currentProject.id)
      : allTasks;

    return filtered
      .map(t => taskToGantt(t, today))
      .filter((g): g is GanttTask => g !== null)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [allTasks, currentProject, today]);

  // Time scale calculation — auto-fit to data or show 4 weeks
  const { startDate, days } = useMemo(() => {
    if (ganttTasks.length === 0) {
      const s = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
      const e = endOfWeek(addDays(today, 21), { weekStartsOn: 1 });
      return { startDate: s, endDate: e, days: eachDayOfInterval({ start: s, end: e }) };
    }
    const minDate = new Date(Math.min(...ganttTasks.map(t => t.startDate.getTime())));
    const maxDate = new Date(Math.max(...ganttTasks.map(t => t.endDate.getTime())));
    const s = startOfWeek(addDays(minDate, -3), { weekStartsOn: 1 });
    const e = endOfWeek(addDays(maxDate, 7), { weekStartsOn: 1 });
    return { startDate: s, endDate: e, days: eachDayOfInterval({ start: s, end: e }) };
  }, [ganttTasks, today]);

  const DAY_WIDTH = 40;
  const ROW_HEIGHT = 56;
  const HEADER_HEIGHT = 60;
  const SIDEBAR_WIDTH = 300;

  const getTaskStyle = (task: GanttTask) => {
    const startDiff = differenceInDays(task.startDate, startDate);
    const duration = differenceInDays(task.endDate, task.startDate) + 1;
    return {
      left: Math.max(0, startDiff * DAY_WIDTH),
      width: Math.max(duration * DAY_WIDTH, DAY_WIDTH),
      top: 10,
    };
  };

  const getStatusLabel = (status: string) => {
    const cfg = STATUS_CONFIG[status];
    return cfg?.label || status;
  };

  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 }, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>

        {/* Header Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <EditCalendarIcon sx={{ color: '#ec4899', fontSize: 32 }} />
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
                {t(lang, 'Gantt Chart', '간트 및 리소스')}
              </Typography>
              {currentProject && (
                <Chip label={currentProject.name} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t(lang,
                `Showing ${ganttTasks.length} tasks with dates. Select a project to filter.`,
                `날짜가 있는 ${ganttTasks.length}개 작업 표시 중. 프로젝트를 선택하면 필터링됩니다.`
              )}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <IconButton size="small"><ZoomOutIcon /></IconButton>
              <Box sx={{ width: 1, bgcolor: 'divider' }} />
              <IconButton size="small"><ZoomInIcon /></IconButton>
            </Box>
            <Button startIcon={<FilterListIcon />} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', color: 'text.primary', borderColor: 'divider' }}>
              {t(lang, 'Filter', '필터')}
            </Button>
          </Box>
        </Box>

        {/* Gantt Container */}
        {loading ? (
          <Paper elevation={0} sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Typography color="text.secondary" fontWeight={600}>
              {t(lang, 'Loading tasks...', '작업 로딩 중...')}
            </Typography>
          </Paper>
        ) : ganttTasks.length === 0 ? (
          <Paper elevation={0} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
            <EditCalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={700}>
              {t(lang, 'No tasks with dates found', '날짜가 설정된 작업이 없습니다')}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5, maxWidth: 400, textAlign: 'center' }}>
              {t(lang,
                'Tasks need a Start Date or Due Date to appear on the Gantt chart. Set dates on your tasks to visualize them here.',
                '간트 차트에 표시하려면 작업에 시작일 또는 마감일을 설정해야 합니다.'
              )}
            </Typography>
          </Paper>
        ) : (
          <Paper elevation={0} sx={{
            flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 3,
            display: 'flex', overflow: 'hidden', bgcolor: theme.palette.mode === 'dark' ? '#1e1e24' : '#fff'
          }}>

            {/* Layout Left Sidebar (Task List) */}
            <Box sx={{ width: SIDEBAR_WIDTH, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 10, bgcolor: 'inherit' }}>
              {/* Header */}
              <Box sx={{ height: HEADER_HEIGHT, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', px: 2, bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary">{t(lang, 'Task Name', '태스크 명')}</Typography>
              </Box>
              {/* Task Rows */}
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {ganttTasks.map(task => (
                  <Box key={task.id} sx={{ height: ROW_HEIGHT, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', px: 2, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: task.color, mr: 1.5, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, overflow: 'hidden', mr: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{task.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{getStatusLabel(task.status)}</Typography>
                    </Box>
                    <Avatar
                      src={task.assignee.avatar}
                      sx={{ width: 24, height: 24, fontSize: '0.6rem', bgcolor: alpha(task.color, 0.2), color: task.color, fontWeight: 800 }}
                    >
                      {task.assignee.name.slice(0, 1)}
                    </Avatar>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Layout Right Area (Chart Timeline) */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'auto', position: 'relative' }}>

              {/* Timeline Header (Dates) */}
              <Box sx={{ height: HEADER_HEIGHT, minWidth: days.length * DAY_WIDTH, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', bgcolor: alpha(theme.palette.text.primary, 0.02), position: 'sticky', top: 0, zIndex: 5 }}>
                {days.map((day, i) => {
                  const isDayToday = isSameDay(day, today);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <Box key={i} sx={{
                      width: DAY_WIDTH, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      bgcolor: isDayToday ? alpha('#ec4899', 0.1) : (isWeekend ? alpha(theme.palette.text.primary, 0.03) : 'transparent')
                    }}>
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: isDayToday ? '#ec4899' : 'text.disabled', fontWeight: isDayToday ? 800 : 500 }}>
                        {format(day, 'E', { locale: dateFnsLocale })}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: isDayToday ? 800 : 600, color: isDayToday ? '#ec4899' : 'text.primary' }}>
                        {format(day, 'd')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Timeline Body (Grid & Bars) */}
              <Box sx={{ flex: 1, minWidth: days.length * DAY_WIDTH, position: 'relative' }}>

                {/* Background Grid */}
                <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', pointerEvents: 'none' }}>
                  {days.map((day, i) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isDayToday = isSameDay(day, today);
                    return (
                      <Box key={i} sx={{
                        width: DAY_WIDTH, flexShrink: 0, borderRight: '1px dashed', borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        bgcolor: isDayToday ? alpha('#ec4899', 0.03) : (isWeekend ? alpha(theme.palette.text.primary, 0.01) : 'transparent')
                      }}>
                        {isDayToday && <Box sx={{ width: 2, height: '100%', bgcolor: alpha('#ec4899', 0.5), mx: 'auto' }} />}
                      </Box>
                    );
                  })}
                </Box>

                {/* Task Bars container */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                  {ganttTasks.map((task, i) => {
                    const style = getTaskStyle(task);
                    return (
                      <Box key={task.id} sx={{
                        position: 'absolute', height: ROW_HEIGHT, top: i * ROW_HEIGHT, left: 0, width: '100%',
                        borderBottom: '1px solid transparent',
                        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                      }}>
                        <Tooltip title={`${task.name} — ${task.progress}% (${getStatusLabel(task.status)})`} placement="top" arrow>
                          <Box sx={{
                            position: 'absolute',
                            left: style.left, top: style.top, width: style.width - 4, height: ROW_HEIGHT - 20,
                            bgcolor: alpha(task.color, 0.15), border: `1px solid ${task.color}`,
                            borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', px: 1,
                            transition: 'transform 0.1s', '&:hover': { transform: 'scaleY(1.05)', boxShadow: `0 4px 12px ${alpha(task.color, 0.3)}` }
                          }}>
                            {/* Progress fill */}
                            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${task.progress}%`, bgcolor: alpha(task.color, 0.4), zIndex: 0 }} />
                            <Typography variant="caption" sx={{ position: 'relative', zIndex: 1, fontWeight: 700, color: task.color, fontSize: '0.65rem' }} noWrap>
                              {task.name}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

            </Box>
          </Paper>
        )}
      </Box>
    </Fade>
  );
}
