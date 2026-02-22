// src/pages/GanttPage.tsx
import { useMemo } from 'react';
import {
  Box, Typography, Paper, Button,
  alpha, useTheme, Fade, Avatar, Tooltip, IconButton
} from '@mui/material';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import FilterListIcon from '@mui/icons-material/FilterList';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ko as koLocale, enUS } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

type GanttTask = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  assignee: { name: string; avatar?: string };
  color: string;
  dependencies?: string[]; // IDs of tasks this depends on
};

export default function GanttPage() {
  const theme = useTheme();
  const { lang } = useLanguage();
  const dateFnsLocale = lang === 'ko' ? koLocale : enUS;

  const today = new Date();

  // Mock Data
  const tasks: GanttTask[] = useMemo(() => [
    { id: 't1', name: '요구사항 분석 (Requirements)', startDate: addDays(today, -5), endDate: addDays(today, -1), progress: 100, assignee: { name: '김영수' }, color: '#3b82f6' },
    { id: 't2', name: 'UI/UX 디자인 (Design)', startDate: addDays(today, -1), endDate: addDays(today, 3), progress: 60, assignee: { name: '이민지' }, color: '#8b5cf6', dependencies: ['t1'] },
    { id: 't3', name: '프론트엔드 개발 (FE)', startDate: addDays(today, 2), endDate: addDays(today, 8), progress: 10, assignee: { name: '박테크' }, color: '#10b981', dependencies: ['t2'] },
    { id: 't4', name: '백엔드 API 개발 (BE)', startDate: addDays(today, 1), endDate: addDays(today, 6), progress: 40, assignee: { name: '최서버' }, color: '#f59e0b', dependencies: ['t1'] },
    { id: 't5', name: 'QA 및 사용자 테스트', startDate: addDays(today, 8), endDate: addDays(today, 12), progress: 0, assignee: { name: '정품질' }, color: '#ef4444', dependencies: ['t3', 't4'] },
  ], [today]);

  // Time scale calculation (displaying 4 weeks)
  const startDate = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
  const endDate = endOfWeek(addDays(today, 21), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const DAY_WIDTH = 40; // pixels per day
  const ROW_HEIGHT = 56;
  const HEADER_HEIGHT = 60;
  const SIDEBAR_WIDTH = 280;

  // Calculate coordinates for a task
  const getTaskStyle = (task: GanttTask) => {
    // Difference in days between chart start and task start
    const startDiff = (task.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;

    return {
      left: Math.max(0, startDiff * DAY_WIDTH),
      width: duration * DAY_WIDTH,
      top: 10, // padding
    };
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
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t(lang, 'Plan timelines, visualize dependencies, and manage team resources.', '일정을 계획하고 화살표로 의존성을 파악하며 팀 리소스를 조율하세요.')}
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
            <Button variant="contained" sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#ec4899', '&:hover': { bgcolor: '#db2777' }, fontWeight: 700 }}>
              {t(lang, 'Add Task', '일정 추가')}
            </Button>
          </Box>
        </Box>

        {/* Gantt Container */}
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
            <Box sx={{ flex: 1, overflowY: 'hidden' }}>
              {tasks.map(task => (
                <Box key={task.id} sx={{ height: ROW_HEIGHT, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', px: 2, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: task.color, mr: 1.5 }} />
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>{task.name}</Typography>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', bgcolor: alpha(task.color, 0.2), color: task.color, fontWeight: 800 }}>
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
                const isToday = isSameDay(day, today);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <Box key={i} sx={{
                    width: DAY_WIDTH, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    bgcolor: isToday ? alpha('#ec4899', 0.1) : (isWeekend ? alpha(theme.palette.text.primary, 0.03) : 'transparent')
                  }}>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: isToday ? '#ec4899' : 'text.disabled', fontWeight: isToday ? 800 : 500 }}>
                      {format(day, 'E', { locale: dateFnsLocale })}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: isToday ? 800 : 600, color: isToday ? '#ec4899' : 'text.primary' }}>
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
                  const isToday = isSameDay(day, today);
                  return (
                    <Box key={i} sx={{
                      width: DAY_WIDTH, flexShrink: 0, borderRight: '1px dashed', borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      bgcolor: isToday ? alpha('#ec4899', 0.03) : (isWeekend ? alpha(theme.palette.text.primary, 0.01) : 'transparent')
                    }}>
                      {/* Today marker line */}
                      {isToday && <Box sx={{ width: 2, height: '100%', bgcolor: alpha('#ec4899', 0.5), mx: 'auto' }} />}
                    </Box>
                  );
                })}
              </Box>

              {/* Task Bars container */}
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                {tasks.map((task, i) => {
                  const style = getTaskStyle(task);
                  return (
                    <Box key={task.id} sx={{
                      position: 'absolute', height: ROW_HEIGHT, top: i * ROW_HEIGHT, left: 0, width: '100%',
                      borderBottom: '1px solid transparent', // alignment
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                    }}>
                      <Tooltip title={`${task.name} (${task.progress}%)`} placement="top" arrow>
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
      </Box>
    </Fade>
  );
}
