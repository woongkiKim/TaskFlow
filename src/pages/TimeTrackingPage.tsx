// src/pages/TimeTrackingPage.tsx
// Real-data TimeTracking page — connected to timeTrackingService & PomodoroContext
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, LinearProgress,
  alpha, useTheme, Fade, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Skeleton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import AddIcon from '@mui/icons-material/Add';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

import { format, subDays, startOfDay, isToday } from 'date-fns';
import { ko as koLocale, enUS } from 'date-fns/locale';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { usePomodoro } from '../contexts/PomodoroContext';
import { useTasks } from '../hooks/useTasks';
import { fetchUserTimeEntries, addManualTimeEntry, deleteTimeEntry } from '../services/timeTrackingService';
import type { TimeEntry } from '../types';
import { toast } from 'sonner';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

const WEEKLY_GOAL_HOURS = 40;

export default function TimeTrackingPage() {
  const theme = useTheme();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const dateFnsLocale = lang === 'ko' ? koLocale : enUS;
  const pomodoro = usePomodoro();
  const { tasks } = useTasks();

  // Stable "now" reference
  const today = useMemo(() => new Date(), []);

  // ─── Time Entries from API ───
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange] = useState<'7d' | '14d' | '30d'>('7d');

  const rangeStart = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    return format(subDays(today, days), 'yyyy-MM-dd');
  }, [today, dateRange]);
  const rangeEnd = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserTimeEntries(user.uid, rangeStart, rangeEnd);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load time entries:', err);
      // If API fails gracefully, show empty
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user, rangeStart, rangeEnd]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // ─── Task name lookup ───
  const taskNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    tasks.forEach(t => { map[t.id] = t.text; });
    return map;
  }, [tasks]);

  // ─── Manual Entry Dialog ───
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualDurationHours, setManualDurationHours] = useState(0);
  const [manualDurationMins, setManualDurationMins] = useState(30);
  const [manualNote, setManualNote] = useState('');

  const handleAddManualEntry = async () => {
    if (!user || !manualTaskId) return;
    const totalMins = manualDurationHours * 60 + manualDurationMins;
    if (totalMins <= 0) {
      toast.error(t(lang, 'Duration must be greater than 0', '시간은 0보다 커야 합니다'));
      return;
    }
    try {
      await addManualTimeEntry(
        manualTaskId, user.uid, user.displayName || '', totalMins, manualNote || undefined,
      );
      toast.success(t(lang, 'Time entry added!', '시간 기록이 추가되었습니다!'));
      setAddDialogOpen(false);
      setManualTaskId('');
      setManualDurationHours(0);
      setManualDurationMins(30);
      setManualNote('');
      loadEntries();
    } catch {
      toast.error(t(lang, 'Failed to add entry', '기록 추가 실패'));
    }
  };

  const handleDeleteEntry = async (entry: TimeEntry) => {
    try {
      await deleteTimeEntry(entry.id, entry.taskId, entry.durationMinutes);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      toast.success(t(lang, 'Entry deleted', '기록 삭제됨'));
    } catch {
      toast.error(t(lang, 'Failed to delete', '삭제 실패'));
    }
  };

  // ─── Calculations ───
  const todayEntries = entries.filter(e => {
    const entryDate = new Date(e.startTime);
    return isToday(entryDate);
  });
  const totalTodayMins = todayEntries.reduce((acc, e) => acc + e.durationMinutes, 0);
  const totalWeekMins = entries.filter(e => {
    const d = new Date(e.startTime);
    const weekAgo = subDays(startOfDay(today), 7);
    return d >= weekAgo;
  }).reduce((acc, e) => acc + e.durationMinutes, 0);
  const weeklyProgress = Math.min(100, Math.round((totalWeekMins / 60 / WEEKLY_GOAL_HOURS) * 100));
  const pomodoroEntries = entries.filter(e => e.type === 'pomodoro');
  const totalPomodoroMins = pomodoroEntries.reduce((acc, e) => acc + e.durationMinutes, 0);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Pomodoro live display
  const pomodoroMinutes = Math.floor(pomodoro.timeLeft / 60);
  const pomodoroSeconds = pomodoro.timeLeft % 60;

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
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <IconButton onClick={loadEntries} sx={{ bgcolor: 'action.hover' }}>
              <RefreshIcon />
            </IconButton>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 700, bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, textTransform: 'none' }}>
              {t(lang, 'Log Time', '시간 수동 기록')}
            </Button>
          </Box>
        </Box>

        {/* Current Active Timer Widget — linked to Pomodoro */}
        <Paper elevation={0} sx={{
          p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: pomodoro.isRunning ? alpha('#8b5cf6', 0.4) : 'divider',
          bgcolor: pomodoro.isRunning ? alpha('#8b5cf6', 0.03) : 'background.paper',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3,
          boxShadow: pomodoro.isRunning ? `0 4px 20px ${alpha('#8b5cf6', 0.1)}` : 'none', transition: '0.3s'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 250 }}>
            <Box sx={{
              width: 12, height: 12, borderRadius: '50%',
              bgcolor: pomodoro.isRunning ? '#22c55e' : 'text.disabled',
              boxShadow: pomodoro.isRunning ? `0 0 0 4px ${alpha('#22c55e', 0.2)}` : 'none',
              ...(pomodoro.isRunning ? { animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } } : {}),
            }} />
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                {pomodoro.mode === 'focus' ? t(lang, 'Focus Timer', '집중 타이머') :
                  pomodoro.mode === 'break' ? t(lang, 'Break Time', '휴식 시간') :
                    t(lang, 'No Active Timer', '활성 타이머 없음')}
              </Typography>
              <Typography variant="h6" fontWeight={800} noWrap>
                {pomodoro.activeTaskText || t(lang, 'Start a timer from any task', '작업에서 타이머를 시작하세요')}
              </Typography>
              {pomodoro.completedPomodoros > 0 && (
                <Chip
                  label={`🍅 × ${pomodoro.completedPomodoros}`}
                  size="small" variant="outlined"
                  sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="h4" fontWeight={800} sx={{
              fontVariantNumeric: 'tabular-nums',
              color: pomodoro.isRunning ? '#8b5cf6' : 'text.primary',
            }}>
              {String(pomodoroMinutes).padStart(2, '0')}:{String(pomodoroSeconds).padStart(2, '0')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {pomodoro.mode !== 'idle' && (
                <IconButton
                  onClick={pomodoro.isRunning ? pomodoro.pauseTimer : pomodoro.resumeTimer}
                  sx={{
                    bgcolor: pomodoro.isRunning ? alpha('#ef4444', 0.1) : alpha('#22c55e', 0.1),
                    color: pomodoro.isRunning ? '#ef4444' : '#22c55e',
                    '&:hover': { bgcolor: pomodoro.isRunning ? alpha('#ef4444', 0.2) : alpha('#22c55e', 0.2) },
                    width: 48, height: 48
                  }}
                >
                  {pomodoro.isRunning ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              )}
              {pomodoro.mode !== 'idle' && (
                <IconButton onClick={pomodoro.resetTimer} sx={{
                  bgcolor: alpha(theme.palette.text.primary, 0.05),
                  '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.1) }, width: 48, height: 48
                }}>
                  <StopIcon />
                </IconButton>
              )}
              {pomodoro.mode === 'break' && (
                <Button size="small" variant="outlined" onClick={pomodoro.skipBreak}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t(lang, 'Skip Break', '휴식 건너뛰기')}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#10b981', 0.1), color: '#10b981' }}><DateRangeIcon /></Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>{t(lang, "Today's Total", '오늘 총 시간')}</Typography>
                {loading ? <Skeleton width={80} height={32} /> : (
                  <Typography variant="h5" fontWeight={800}>{formatDuration(totalTodayMins)}</Typography>
                )}
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }}><AssessmentIcon /></Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>{t(lang, 'Pomodoro Sessions', '포모도로 세션')}</Typography>
                {loading ? <Skeleton width={80} height={32} /> : (
                  <Typography variant="h5" fontWeight={800}>{formatDuration(totalPomodoroMins)}</Typography>
                )}
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}><TimerOutlinedIcon /></Box>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>{t(lang, 'Weekly Goal', '주간 목표')}</Typography>
                  <Typography variant="body2" fontWeight={800}>{weeklyProgress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={weeklyProgress} sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#3b82f6', 0.1), '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6', borderRadius: 4 } }} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {formatDuration(totalWeekMins)} / {WEEKLY_GOAL_HOURS}h
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Timesheet List */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={800}>{t(lang, 'Recent Timesheet', '최근 타임시트')}</Typography>
          <Chip
            label={`${entries.length} ${t(lang, 'entries', '건')}`}
            size="small" variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {loading ? (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} height={56} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Paper>
        ) : entries.length === 0 ? (
          <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
            <TimerOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary">
              {t(lang, 'No time entries yet.', '아직 시간 기록이 없습니다.')}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              {t(lang, 'Start a Pomodoro timer or log time manually.', '포모도로 타이머를 시작하거나 수동으로 기록하세요.')}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}
              sx={{ mt: 3, bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, textTransform: 'none', fontWeight: 700 }}>
              {t(lang, 'Log Time', '시간 기록')}
            </Button>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'Date', '날짜')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'User', '사용자')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'Task', '작업')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t(lang, 'Type', '유형')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{t(lang, 'Duration', '소요 시간')}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, width: 60 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((row) => (
                  <TableRow key={row.id} sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {format(new Date(row.startTime), 'MMM dd, yyyy', { locale: dateFnsLocale })}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: theme.palette.primary.main }}>
                          {(row.userName || '?').slice(0, 1)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{row.userName || 'Unknown'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 300 }}>
                        {taskNameMap[row.taskId] || `Task #${row.taskId}`}
                      </Typography>
                      {row.note && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 300 }}>
                          {row.note}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.type === 'pomodoro' ? (
                        <Chip label="🍅 Pomodoro" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha('#ef4444', 0.1), color: '#dc2626' }} />
                      ) : (
                        <Chip label={t(lang, 'Manual', '수동')} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'action.hover', color: 'text.secondary' }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatDuration(row.durationMinutes)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleDeleteEntry(row)}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ─── Manual Time Entry Dialog ─── */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {t(lang, 'Log Time Manually', '수동 시간 기록')}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '8px !important' }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t(lang, 'Select Task', '작업 선택')}</InputLabel>
              <Select
                value={manualTaskId}
                label={t(lang, 'Select Task', '작업 선택')}
                onChange={(e) => setManualTaskId(e.target.value)}
              >
                {tasks.filter(t => t.status !== 'done').map(task => (
                  <MenuItem key={task.id} value={task.id}>
                    <Typography variant="body2" noWrap>{task.text}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label={t(lang, 'Hours', '시간')}
                type="number"
                size="small"
                value={manualDurationHours}
                onChange={(e) => setManualDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                slotProps={{ htmlInput: { min: 0, max: 24 } }}
                sx={{ flex: 1 }}
              />
              <TextField
                label={t(lang, 'Minutes', '분')}
                type="number"
                size="small"
                value={manualDurationMins}
                onChange={(e) => setManualDurationMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                slotProps={{ htmlInput: { min: 0, max: 59 } }}
                sx={{ flex: 1 }}
              />
            </Box>

            <TextField
              label={t(lang, 'Note (optional)', '메모 (선택사항)')}
              fullWidth size="small" multiline rows={2}
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setAddDialogOpen(false)}>{t(lang, 'Cancel', '취소')}</Button>
            <Button
              variant="contained"
              onClick={handleAddManualEntry}
              disabled={!manualTaskId || (manualDurationHours === 0 && manualDurationMins === 0)}
              sx={{ bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, fontWeight: 700 }}
            >
              {t(lang, 'Save', '저장')}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Fade>
  );
}
