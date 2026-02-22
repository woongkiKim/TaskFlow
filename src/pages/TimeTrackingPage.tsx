// src/pages/TimeTrackingPage.tsx
import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, LinearProgress,
  alpha, useTheme, Fade, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, Chip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import AddIcon from '@mui/icons-material/Add';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AssessmentIcon from '@mui/icons-material/Assessment';

import { format, subDays } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

type TimeEntry = {
  id: string;
  taskName: string;
  projectName: string;
  date: Date;
  durationMinutes: number;
  user: { name: string; avatar?: string };
  billable: boolean;
};

export default function TimeTrackingPage() {
  const theme = useTheme();
  const { lang } = useLanguage();

  const today = useMemo(() => new Date(), []);

  // Mock Active Timer State
  const [isTracking, setIsTracking] = useState(false);
  const [activeTask] = useState('UI/UX Design for Dashboard');
  const [elapsedMinutes] = useState(48);

  // Mock Timesheet Data
  const entries: TimeEntry[] = useMemo(() => [
    { id: '1', taskName: 'Weekly team meeting', projectName: 'Internal Ops', date: today, durationMinutes: 60, user: { name: '김태리' }, billable: false },
    { id: '2', taskName: 'Database schema migration', projectName: 'TaskFlow v2.0', date: today, durationMinutes: 145, user: { name: '이코드' }, billable: true },
    { id: '3', taskName: 'Client feedback review', projectName: 'Landing Page', date: subDays(today, 1), durationMinutes: 45, user: { name: '김영수' }, billable: true },
    { id: '4', taskName: 'Bugfix #203 (Auth Error)', projectName: 'Mobile App MVP', date: subDays(today, 1), durationMinutes: 120, user: { name: '박태민' }, billable: true },
  ], [today]);

  const toggleTimer = () => setIsTracking(!isTracking);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const totalToday = entries.filter(e => e.date.toDateString() === today.toDateString()).reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalBillable = entries.filter(e => e.billable).reduce((acc, curr) => acc + curr.durationMinutes, 0);

  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <TimerOutlinedIcon sx={{ color: '#8b5cf6', fontSize: 36 }} />
              <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
                {t(lang, 'Time Tracking', '시간 추적 및 타임시트')}
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              {t(lang, 'Log hours, monitor active timers, and review team timesheets.', '업무 시간을 기록하고 작동 중인 타이머를 주시하며 팀 전체의 타임시트를 리뷰하세요.')}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}
            sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, textTransform: 'none' }}>
            {t(lang, 'Log Time', '시간 수동 기록')}
          </Button>
        </Box>

        {/* Current Active Timer Widget */}
        <Paper elevation={0} sx={{
          p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: isTracking ? alpha('#8b5cf6', 0.4) : 'divider',
          bgcolor: isTracking ? alpha('#8b5cf6', 0.03) : 'background.paper',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3,
          boxShadow: isTracking ? `0 4px 20px ${alpha('#8b5cf6', 0.1)}` : 'none', transition: '0.3s'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 250 }}>
            <Box sx={{
              width: 12, height: 12, borderRadius: '50%',
              bgcolor: isTracking ? '#22c55e' : 'text.disabled',
              boxShadow: isTracking ? `0 0 0 4px ${alpha('#22c55e', 0.2)}` : 'none'
            }} />
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {t(lang, 'Active Timer', '진행 중인 타이머')}
              </Typography>
              <Typography variant="h6" fontWeight={800} noWrap>
                {activeTask}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="h4" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums', color: isTracking ? '#8b5cf6' : 'text.primary' }}>
              {Math.floor(elapsedMinutes / 60).toString().padStart(2, '0')}:{(elapsedMinutes % 60).toString().padStart(2, '0')}<Box component="span" sx={{ fontSize: '1rem', color: 'text.secondary', ml: 0.5 }}>00</Box>
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={toggleTimer} sx={{ bgcolor: isTracking ? alpha('#ef4444', 0.1) : alpha('#22c55e', 0.1), color: isTracking ? '#ef4444' : '#22c55e', '&:hover': { bgcolor: isTracking ? alpha('#ef4444', 0.2) : alpha('#22c55e', 0.2) }, width: 48, height: 48 }}>
                {isTracking ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05), '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) }, width: 48, height: 48 }}>
                <StopIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid xs={12} sm={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#10b981', 0.1), color: '#10b981' }}><DateRangeIcon /></Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>{t(lang, "Today's Total", '오늘 총 시간')}</Typography>
                <Typography variant="h5" fontWeight={800}>{formatDuration(totalToday)}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}><AssessmentIcon /></Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>{t(lang, 'Billable Hours', '청구 가능 시간')}</Typography>
                <Typography variant="h5" fontWeight={800}>{formatDuration(totalBillable)}</Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}><TimerOutlinedIcon /></Box>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>{t(lang, 'Weekly Goal', '주간 목표')}</Typography>
                  <Typography variant="body2" fontWeight={800}>75%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={75} sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#3b82f6', 0.1), '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6', borderRadius: 4 } }} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Timesheet List */}
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>{t(lang, 'Recent Timesheet', '최근 타임시트')}</Typography>
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'Date', '날짜')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'Team Member', '팀원')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'Task & Project', '담당 업무 및 프로젝트')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'Billing', '청구')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{t(lang, 'Duration', '소요 시간')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((row) => (
                <TableRow key={row.id} sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{format(row.date, 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: theme.palette.primary.main }}>{row.user.name.slice(0, 1)}</Avatar>
                      <Typography variant="body2" fontWeight={600}>{row.user.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{row.taskName}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.projectName}</Typography>
                  </TableCell>
                  <TableCell>
                    {row.billable ? (
                      <Chip label={t(lang, 'Billable', '청구')} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha('#f59e0b', 0.1), color: '#d97706' }} />
                    ) : (
                      <Chip label={t(lang, 'Non-billable', '비청구')} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'action.hover', color: 'text.secondary' }} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(row.durationMinutes)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

      </Box>
    </Fade>
  );
}
