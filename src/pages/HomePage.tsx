// src/pages/HomePage.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Avatar, Chip, LinearProgress,
  Button, Skeleton, alpha, useTheme, Fade,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlagIcon from '@mui/icons-material/Flag';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import SpeedIcon from '@mui/icons-material/Speed';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isBefore, addDays, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { fetchTasks, fetchMyWorkTasks } from '../services/taskService';
import { fetchObjectives } from '../services/okrService';
import type { Task, Objective } from '../types';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

// ─── Greeting helper ───
const getGreeting = (lang: 'ko' | 'en') => {
  const h = new Date().getHours();
  if (h < 6) return lang === 'ko' ? '좋은 새벽이에요' : 'Good night';
  if (h < 12) return lang === 'ko' ? '좋은 아침이에요' : 'Good morning';
  if (h < 18) return lang === 'ko' ? '좋은 오후에요' : 'Good afternoon';
  return lang === 'ko' ? '좋은 저녁이에요' : 'Good evening';
};

// ─── Motivational message ───
const getMotivation = (completed: number, total: number, lang: 'ko' | 'en') => {
  const pct = total > 0 ? completed / total : 0;
  if (total === 0) return lang === 'ko' ? '오늘의 할 일을 추가해 보세요! 🚀' : 'Add your first task for today! 🚀';
  if (pct >= 1) return lang === 'ko' ? '모든 할 일을 완료했어요! 🎉' : 'All tasks completed! Great job! 🎉';
  if (pct >= 0.7) return lang === 'ko' ? '거의 다 했어요! 조금만 더 힘내세요 💪' : 'Almost there! Keep going! 💪';
  if (pct >= 0.3) return lang === 'ko' ? '좋은 진행률이에요. 계속 화이팅! 🔥' : 'Good progress. Keep it up! 🔥';
  return lang === 'ko' ? '오늘도 하나씩 해결해 봅시다 ✨' : 'Let\'s tackle them one by one ✨';
};

export default function HomePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { currentWorkspace: workspace } = useWorkspace();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Load data (no setLoading on re-visits — cached data appears instantly) ───
  const hasLoaded = useRef(false);
  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [personalTasks, workTasks, okrData] = await Promise.all([
        fetchTasks(user.uid).catch(() => [] as Task[]),
        workspace?.id ? fetchMyWorkTasks(user.uid, workspace.id).catch(() => [] as Task[]) : Promise.resolve([] as Task[]),
        workspace?.id ? fetchObjectives(workspace.id).catch(() => [] as Objective[]) : Promise.resolve([] as Objective[]),
      ]);
      // Merge & deduplicate
      const taskMap = new Map<string, Task>();
      personalTasks.forEach(t => taskMap.set(t.id, t));
      workTasks.forEach(t => taskMap.set(t.id, t));
      setTasks(Array.from(taskMap.values()));
      setObjectives(okrData);
    } catch (e) { console.error('HomePage load error:', e); }
    finally {
      if (!hasLoaded.current) { hasLoaded.current = true; setLoading(false); }
    }
  }, [user?.uid, workspace?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Derived Data ───
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [tasks]);
  const weekStart = useMemo(() => startOfWeek(now, { weekStartsOn: 1 }), [now]);
  const weekEnd = useMemo(() => endOfWeek(now, { weekStartsOn: 1 }), [now]);

  const stats = useMemo(() => {
    const todayTasks = tasks.filter(t => {
      if (!t.createdAt) return false;
      try { return isToday(parseISO(t.createdAt.slice(0, 10))); } catch { return false; }
    });
    const todayCompleted = todayTasks.filter(t => t.completed);

    const overdueTasks = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      try { return isBefore(parseISO(t.dueDate), now); } catch { return false; }
    });

    const upcomingTasks = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      try {
        const dd = parseISO(t.dueDate);
        return !isBefore(dd, now) && isBefore(dd, addDays(now, 7));
      } catch { return false; }
    }).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).slice(0, 5);

    const weekTasks = tasks.filter(t => {
      if (!t.createdAt) return false;
      try {
        const d = parseISO(t.createdAt.slice(0, 10));
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch { return false; }
    });
    const weekCompleted = weekTasks.filter(t => t.completed);

    const inProgressTasks = tasks.filter(t => !t.completed && t.status === 'inprogress');
    const blockedTasks = tasks.filter(t => t.blockerStatus === 'blocked' && !t.completed);

    return {
      todayTotal: todayTasks.length,
      todayCompleted: todayCompleted.length,
      todayPct: todayTasks.length > 0 ? Math.round((todayCompleted.length / todayTasks.length) * 100) : 0,
      overdue: overdueTasks.length,
      overdueTasks: overdueTasks.slice(0, 3),
      upcoming: upcomingTasks,
      weekTotal: weekTasks.length,
      weekCompleted: weekCompleted.length,
      weekPct: weekTasks.length > 0 ? Math.round((weekCompleted.length / weekTasks.length) * 100) : 0,
      inProgress: inProgressTasks.length,
      blocked: blockedTasks.length,
      totalActive: tasks.filter(t => !t.completed).length,
    };
  }, [tasks, now, weekStart, weekEnd]);

  const okrStats = useMemo(() => {
    const active = objectives.filter(o => o.status === 'active');
    const avgProgress = active.length > 0
      ? Math.round(active.reduce((sum, o) => {
        if (o.keyResults.length === 0) return sum;
        const objPct = o.keyResults.reduce((s, kr) => s + (kr.targetValue > 0 ? Math.min((kr.currentValue / kr.targetValue) * 100, 100) : 0), 0) / o.keyResults.length;
        return sum + objPct;
      }, 0) / active.length)
      : 0;
    return { active: active.length, total: objectives.length, avgProgress };
  }, [objectives]);

  // ─── Streak (consecutive days with completed tasks) ───
  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 30; i++) {
      const dayStr = format(d, 'yyyy-MM-dd');
      const hasCompleted = tasks.some(t => t.completed && t.createdAt?.startsWith(dayStr));
      if (hasCompleted) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return count;
  }, [tasks]);

  const dateFnsLocale = lang === 'ko' ? ko : enUS;

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Skeleton variant="rounded" height={120} sx={{ mb: 3, borderRadius: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />)}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    );
  }

  const cardSx = {
    p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
    transition: 'all 0.2s ease',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
  };

  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>

        {/* ═══ GREETING HERO ═══ */}
        <Paper sx={{
          p: { xs: 3, md: 4 }, mb: 3, borderRadius: 4, position: 'relative', overflow: 'hidden',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e293b 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #3b82f6 100%)',
          color: 'white',
        }}>
          {/* Decorative circles */}
          <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
          <Box sx={{ position: 'absolute', bottom: -60, left: -30, width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <WavingHandIcon sx={{ fontSize: 28, animation: 'wave 2s ease-in-out infinite', '@keyframes wave': { '0%, 100%': { transform: 'rotate(0deg)' }, '25%': { transform: 'rotate(20deg)' }, '75%': { transform: 'rotate(-10deg)' } } }} />
                <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
                  {getGreeting(lang)}, {user?.displayName?.split(' ')[0] || 'User'}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ opacity: 0.85, fontWeight: 500 }}>
                {getMotivation(stats.todayCompleted, stats.todayTotal, lang)}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.6, mt: 0.5, display: 'block' }}>
                <CalendarTodayIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                {format(now, lang === 'ko' ? 'yyyy년 M월 d일 EEEE' : 'EEEE, MMMM d, yyyy', { locale: dateFnsLocale })}
              </Typography>
            </Box>
            {/* Streak badge */}
            {streak > 0 && (
              <Paper sx={{
                px: 2, py: 1.5, borderRadius: 3,
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', gap: 1.5,
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <WhatshotIcon sx={{ fontSize: 28, color: '#fbbf24' }} />
                <Box>
                  <Typography variant="h5" fontWeight={800}>{streak}</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {t(lang, 'Day Streak', '일 연속')}
                  </Typography>
                </Box>
              </Paper>
            )}
          </Box>
        </Paper>

        {/* ═══ STAT CARDS ═══ */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
          {[
            {
              icon: <AssignmentOutlinedIcon />, label: t(lang, 'Today\'s Tasks', '오늘의 할 일'),
              value: `${stats.todayCompleted}/${stats.todayTotal}`, pct: stats.todayPct,
              color: '#6366f1', bg: alpha('#6366f1', 0.08),
            },
            {
              icon: <TrendingUpIcon />, label: t(lang, 'This Week', '이번 주'),
              value: `${stats.weekCompleted}/${stats.weekTotal}`, pct: stats.weekPct,
              color: '#3b82f6', bg: alpha('#3b82f6', 0.08),
            },
            {
              icon: <SpeedIcon />, label: t(lang, 'In Progress', '진행 중'),
              value: stats.inProgress.toString(),
              color: '#f59e0b', bg: alpha('#f59e0b', 0.08),
            },
            {
              icon: <WarningAmberIcon />, label: t(lang, 'Overdue', '기한 초과'),
              value: stats.overdue.toString(),
              color: stats.overdue > 0 ? '#ef4444' : '#10b981',
              bg: stats.overdue > 0 ? alpha('#ef4444', 0.08) : alpha('#10b981', 0.08),
            },
          ].map((card, i) => (
            <Paper key={i} sx={{ ...cardSx, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: card.bg, display: 'flex' }}>
                  {/* Clone icon with color */}
                  <Box sx={{ color: card.color, display: 'flex' }}>{card.icon}</Box>
                </Box>
                {card.pct !== undefined && (
                  <Typography variant="caption" fontWeight={700} sx={{ color: card.color }}>
                    {card.pct}%
                  </Typography>
                )}
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: card.color, lineHeight: 1 }}>
                {card.value}
              </Typography>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: 0.3 }}>
                {card.label}
              </Typography>
              {card.pct !== undefined && (
                <LinearProgress variant="determinate" value={card.pct}
                  sx={{
                    height: 4, borderRadius: 2, bgcolor: alpha(card.color, 0.12),
                    '& .MuiLinearProgress-bar': { bgcolor: card.color, borderRadius: 2 },
                  }} />
              )}
            </Paper>
          ))}
        </Box>

        {/* ═══ MAIN CONTENT GRID ═══ */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>

          {/* ── Upcoming Deadlines ── */}
          <Paper sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  {t(lang, 'Upcoming Deadlines', '다가오는 마감')}
                </Typography>
              </Box>
              <Chip label={stats.upcoming.length} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', bgcolor: alpha('#f59e0b', 0.1), color: '#f59e0b' }} />
            </Box>
            {stats.upcoming.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <EmojiEventsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.disabled" fontWeight={600}>
                  {t(lang, 'No upcoming deadlines this week!', '이번 주 마감 일정이 없습니다!')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {stats.upcoming.map(task => {
                  const dd = task.dueDate ? parseISO(task.dueDate) : null;
                  const isClose = dd && isBefore(dd, addDays(now, 2));
                  return (
                    <Box key={task.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                      bgcolor: isClose ? alpha('#ef4444', 0.04) : alpha('#6366f1', 0.02),
                      border: '1px solid', borderColor: isClose ? alpha('#ef4444', 0.15) : 'divider',
                      cursor: 'pointer', transition: 'all 0.15s',
                      '&:hover': { borderColor: '#6366f1', transform: 'translateX(4px)' },
                    }} onClick={() => navigate('/')}>
                      <FlagIcon sx={{ fontSize: 16, color: isClose ? '#ef4444' : '#6366f1' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{task.text}</Typography>
                        {task.category && (
                          <Chip label={task.category} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 600, mt: 0.3, bgcolor: alpha(task.categoryColor || '#6366f1', 0.1), color: task.categoryColor || '#6366f1' }} />
                        )}
                      </Box>
                      <Chip label={dd ? format(dd, 'M/d', { locale: dateFnsLocale }) : ''} size="small"
                        sx={{
                          height: 22, fontSize: '0.7rem', fontWeight: 700,
                          bgcolor: isClose ? alpha('#ef4444', 0.1) : alpha('#3b82f6', 0.08),
                          color: isClose ? '#ef4444' : '#3b82f6',
                        }} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>

          {/* ── OKR Progress ── */}
          <Paper sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrackChangesIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  {t(lang, 'OKR Progress', 'OKR 진행률')}
                </Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/okr')}
                sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>
                {t(lang, 'View All', '전체 보기')}
              </Button>
            </Box>
            {objectives.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <TrackChangesIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.disabled" fontWeight={600}>
                  {t(lang, 'No OKR goals yet', '아직 OKR 목표가 없습니다')}
                </Typography>
                <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => navigate('/okr')}
                  sx={{ mt: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                  {t(lang, 'Create Goal', '목표 만들기')}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* Summary bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, bgcolor: alpha('#6366f1', 0.04), mb: 0.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">{t(lang, 'Average Progress', '평균 진행률')}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <LinearProgress variant="determinate" value={okrStats.avgProgress} sx={{
                        flex: 1, height: 8, borderRadius: 4, bgcolor: alpha('#6366f1', 0.12),
                        '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 4 },
                      }} />
                      <Typography variant="body2" fontWeight={800} sx={{ color: '#6366f1' }}>{okrStats.avgProgress}%</Typography>
                    </Box>
                  </Box>
                  <Chip label={`${okrStats.active} ${t(lang, 'active', '진행중')}`} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }} />
                </Box>

                {objectives.filter(o => o.status === 'active').slice(0, 3).map(obj => {
                  const progress = obj.keyResults.length > 0
                    ? Math.round(obj.keyResults.reduce((s, kr) => s + (kr.targetValue > 0 ? Math.min((kr.currentValue / kr.targetValue) * 100, 100) : 0), 0) / obj.keyResults.length)
                    : 0;
                  return (
                    <Box key={obj.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                      border: '1px solid', borderColor: 'divider', cursor: 'pointer',
                      transition: 'all 0.15s', '&:hover': { borderColor: '#6366f1' },
                    }} onClick={() => navigate('/okr')}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: 12, fontWeight: 700 }}>
                        {obj.ownerName?.[0] || 'O'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{obj.title}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <LinearProgress variant="determinate" value={progress} sx={{
                            flex: 1, height: 4, borderRadius: 2,
                            bgcolor: alpha('#6366f1', 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: progress >= 70 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#6366f1', borderRadius: 2 },
                          }} />
                          <Typography variant="caption" fontWeight={700} sx={{ color: progress >= 70 ? '#10b981' : progress >= 40 ? '#f59e0b' : '#6366f1' }}>{progress}%</Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>

        {/* ═══ OVERDUE + QUICK ACTIONS ═══ */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

          {/* ── Overdue Tasks Alert ── */}
          <Paper sx={{ ...cardSx, borderColor: stats.overdue > 0 ? alpha('#ef4444', 0.3) : 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon sx={{ fontSize: 20, color: stats.overdue > 0 ? '#ef4444' : '#10b981' }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  {stats.overdue > 0
                    ? t(lang, `${stats.overdue} Overdue Tasks`, `기한 초과 ${stats.overdue}건`)
                    : t(lang, 'No Overdue Tasks', '기한 초과 없음')
                  }
                </Typography>
              </Box>
              {stats.overdue > 0 && (
                <Button size="small" color="error" onClick={() => navigate('/')} sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'none' }}>
                  {t(lang, 'Resolve', '해결하기')}
                </Button>
              )}
            </Box>
            {stats.overdue === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 40, color: '#10b981', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {t(lang, 'You\'re all caught up! 🎉', '모든 일정이 순조로워요! 🎉')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {stats.overdueTasks.map(task => (
                  <Box key={task.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                    bgcolor: alpha('#ef4444', 0.04), border: '1px solid', borderColor: alpha('#ef4444', 0.12),
                  }}>
                    <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{task.text}</Typography>
                    </Box>
                    <Chip label={task.dueDate?.slice(5) || ''} size="small"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, color: '#ef4444', bgcolor: alpha('#ef4444', 0.1) }} />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* ── Quick Actions ── */}
          <Paper sx={cardSx}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              ⚡ {t(lang, 'Quick Actions', '빠른 작업')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {[
                { icon: <AddIcon />, label: t(lang, 'New Task', '할 일 추가'), color: '#6366f1', path: '/tasks' },
                { icon: <NoteAddOutlinedIcon />, label: t(lang, 'New Document', '새 문서'), color: '#8b5cf6', path: '/wiki' },
                { icon: <TrackChangesIcon />, label: t(lang, 'OKR Goals', 'OKR 목표'), color: '#3b82f6', path: '/okr' },
                { icon: <PlaylistAddCheckIcon />, label: t(lang, 'View Reports', '리포트 보기'), color: '#10b981', path: '/reports' },
              ].map((action, i) => (
                <Box key={i} onClick={() => navigate(action.path)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: 2.5,
                    cursor: 'pointer', border: '1px solid', borderColor: 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: action.color, bgcolor: alpha(action.color, 0.04),
                      transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${alpha(action.color, 0.15)}`,
                    },
                  }}>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(action.color, 0.1), color: action.color, display: 'flex' }}>
                    {action.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={600}>{action.label}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

      </Box>
    </Fade>
  );
}
