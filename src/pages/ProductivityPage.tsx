// src/pages/ProductivityPage.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, LinearProgress,
  alpha, Fade, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import CategoryIcon from '@mui/icons-material/Category';
import SpeedIcon from '@mui/icons-material/Speed';
import BarChartIcon from '@mui/icons-material/BarChart';
import StarIcon from '@mui/icons-material/Star';
import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isWithinInterval, parseISO, eachDayOfInterval,
} from 'date-fns';
import { ko as koLocale, enUS } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { fetchTasks, fetchMyWorkTasks } from '../services/taskService';
import type { Task } from '../types';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

type Period = 'week' | 'month' | '3months';

export default function ProductivityPage() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { currentWorkspace: workspace } = useWorkspace();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');

  const dateFnsLocale = lang === 'ko' ? koLocale : enUS;

  const hasLoaded = useRef(false);
  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [personal, work] = await Promise.all([
        fetchTasks(user.uid).catch(() => [] as Task[]),
        workspace?.id ? fetchMyWorkTasks(user.uid, workspace.id).catch(() => [] as Task[]) : Promise.resolve([] as Task[]),
      ]);
      const map = new Map<string, Task>();
      personal.forEach(t => map.set(t.id, t));
      work.forEach(t => map.set(t.id, t));
      setTasks(Array.from(map.values()));
    } catch (e) { console.error(e); }
    finally {
      if (!hasLoaded.current) { hasLoaded.current = true; setLoading(false); }
    }
  }, [user?.uid, workspace?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const now = useMemo(() => new Date(), [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Period range ───
  const range = useMemo(() => {
    if (period === 'week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    if (period === 'month') return { start: startOfMonth(now), end: endOfMonth(now) };
    return { start: subDays(now, 90), end: now };
  }, [period, now]);

  // ─── Filtered tasks ───
  const periodTasks = useMemo(() => tasks.filter(t => {
    if (!t.createdAt) return false;
    try {
      const d = parseISO(t.createdAt.slice(0, 10));
      return isWithinInterval(d, { start: range.start, end: range.end });
    } catch { return false; }
  }), [tasks, range]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const completed = periodTasks.filter(t => t.completed);
    const total = periodTasks.length;
    const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Daily counts
    const days = eachDayOfInterval({ start: range.start, end: range.end > now ? now : range.end });
    const dailyData = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTasks = periodTasks.filter(t => t.createdAt?.startsWith(dayStr));
      const dayCompleted = dayTasks.filter(t => t.completed);
      return { day, dayStr, label: format(day, period === '3months' ? 'M/d' : 'EEE', { locale: dateFnsLocale }), total: dayTasks.length, completed: dayCompleted.length };
    });

    // Category breakdown
    const catMap = new Map<string, { total: number; completed: number; color: string }>();
    periodTasks.forEach(t => {
      const cat = t.category || (lang === 'ko' ? '미분류' : 'Uncategorized');
      const existing = catMap.get(cat) || { total: 0, completed: 0, color: t.categoryColor || '#94a3b8' };
      existing.total++;
      if (t.completed) existing.completed++;
      catMap.set(cat, existing);
    });

    // Priority breakdown
    const priMap = new Map<string, { total: number; completed: number }>();
    periodTasks.forEach(t => {
      const pri = t.priority || 'P3';
      const existing = priMap.get(pri) || { total: 0, completed: 0 };
      existing.total++;
      if (t.completed) existing.completed++;
      priMap.set(pri, existing);
    });

    // Streak
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 90; i++) {
      const dayStr = format(d, 'yyyy-MM-dd');
      const hasCompleted = tasks.some(t => t.completed && t.createdAt?.startsWith(dayStr));
      if (hasCompleted) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }

    // Best day
    const bestDay = dailyData.reduce((max, d) => d.completed > max.completed ? d : max, dailyData[0]);

    // Average per day
    const activeDays = dailyData.filter(d => d.total > 0);
    const avgPerDay = activeDays.length > 0 ? (completed.length / activeDays.length).toFixed(1) : '0';

    return {
      total, completed: completed.length, rate, streak,
      dailyData, categories: catMap, priorities: priMap,
      bestDay, avgPerDay,
    };
  }, [periodTasks, range, now, period, dateFnsLocale, lang, tasks]);

  const cardSx = {
    p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
    transition: 'all 0.2s ease',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' },
  };

  const PRI_COLORS: Record<string, string> = { P0: '#dc2626', P1: '#ea580c', P2: '#ca8a04', P3: '#6b7280' };

  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>

        {/* ═══ HEADER ═══ */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SpeedIcon sx={{ color: '#6366f1', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
              {t(lang, 'Productivity', '생산성')}
            </Typography>
          </Box>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small"
            sx={{ '& .MuiToggleButton-root': { borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2 } }}>
            <ToggleButton value="week">{t(lang, 'This Week', '이번 주')}</ToggleButton>
            <ToggleButton value="month">{t(lang, 'This Month', '이번 달')}</ToggleButton>
            <ToggleButton value="3months">{t(lang, '3 Months', '3개월')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* ═══ HERO STATS ═══ */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
          {[
            { icon: <CheckCircleIcon />, label: t(lang, 'Completed', '완료'), value: stats.completed.toString(), sub: `/ ${stats.total}`, color: '#10b981' },
            { icon: <TrendingUpIcon />, label: t(lang, 'Completion Rate', '완료율'), value: `${stats.rate}%`, color: '#6366f1' },
            { icon: <WhatshotIcon />, label: t(lang, 'Day Streak', '연속 달성'), value: stats.streak.toString(), sub: t(lang, 'days', '일'), color: '#f59e0b' },
            { icon: <TimerIcon />, label: t(lang, 'Avg Per Day', '일 평균'), value: stats.avgPerDay, sub: t(lang, 'tasks', '건'), color: '#3b82f6' },
            { icon: <EmojiEventsIcon />, label: t(lang, 'Best Day', '최고의 날'), value: stats.bestDay?.completed.toString() || '0', sub: stats.bestDay ? format(stats.bestDay.day, period === '3months' ? 'M/d' : 'EEE', { locale: dateFnsLocale }) : '', color: '#8b5cf6' },
          ].map((card, i) => (
            <Paper key={i} sx={{ ...cardSx, textAlign: 'center' }}>
              <Box sx={{ mx: 'auto', mb: 1, p: 1, borderRadius: 2, bgcolor: alpha(card.color, 0.1), color: card.color, display: 'inline-flex' }}>
                {card.icon}
              </Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: card.color, lineHeight: 1 }}>
                {card.value}
                {card.sub && <Typography component="span" variant="body2" fontWeight={500} color="text.secondary" sx={{ ml: 0.5 }}>{card.sub}</Typography>}
              </Typography>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {card.label}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* ═══ DAILY CHART ═══ */}
        <Paper sx={{ ...cardSx, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <BarChartIcon sx={{ fontSize: 20, color: '#6366f1' }} />
            <Typography variant="subtitle1" fontWeight={700}>
              {t(lang, 'Daily Activity', '일별 활동')}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#6366f1' }} />
                <Typography variant="caption" color="text.secondary">{t(lang, 'Completed', '완료')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#cbd5e1' }} />
                <Typography variant="caption" color="text.secondary">{t(lang, 'Remaining', '남은 작업')}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ height: 260, width: '100%', mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94a3b8', 0.2)} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  dy={10}
                  interval={period === '3months' ? 14 : 'preserveStartEnd'}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  cursor={{ fill: alpha('#6366f1', 0.05) }}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: '12px' }}
                  labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: 8 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    value,
                    name === 'completed' ? t(lang, 'Completed', '완료') : t(lang, 'Total', '전체')
                  ]}
                  // @ts-expect-error recharts internal typings are overly strict here
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(label: any, payload: any[]) => {
                    if (payload && payload.length > 0 && payload[0].payload) {
                      return format(payload[0].payload.day, 'PPP', { locale: dateFnsLocale });
                    }
                    return label || '';
                  }}
                />
                <Bar
                  dataKey="completed"
                  stackId="a"
                  fill="#6366f1"
                  radius={[0, 0, 4, 4]}
                  barSize={period === '3months' ? 4 : 24}
                >
                  {stats.dailyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.completed === stats.bestDay?.completed && entry.completed > 0 ? '#10b981' : '#6366f1'} />
                  ))}
                </Bar>
                <Bar
                  dataKey={(d) => Math.max(0, d.total - d.completed)}
                  stackId="a"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  opacity={0.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* ═══ BOTTOM SECTIONS ═══ */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

          {/* ── Category Breakdown ── */}
          <Paper sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CategoryIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
              <Typography variant="subtitle1" fontWeight={700}>
                {t(lang, 'By Category', '카테고리별')}
              </Typography>
            </Box>
            {stats.categories.size === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
                {t(lang, 'No data for this period', '이 기간에 데이터가 없습니다')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {Array.from(stats.categories.entries()).sort((a, b) => b[1].total - a[1].total).map(([name, data]) => {
                  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                  return (
                    <Box key={name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: data.color }} />
                          <Typography variant="body2" fontWeight={600}>{name}</Typography>
                        </Box>
                        <Typography variant="caption" fontWeight={700} sx={{ color: data.color }}>
                          {data.completed}/{data.total} ({pct}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{
                          height: 6, borderRadius: 3, bgcolor: alpha(data.color, 0.1),
                          '& .MuiLinearProgress-bar': { bgcolor: data.color, borderRadius: 3 },
                        }} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>

          {/* ── Priority Breakdown ── */}
          <Paper sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <StarIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
              <Typography variant="subtitle1" fontWeight={700}>
                {t(lang, 'By Priority', '우선순위별')}
              </Typography>
            </Box>
            {stats.priorities.size === 0 ? (
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 4 }}>
                {t(lang, 'No data for this period', '이 기간에 데이터가 없습니다')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {['P0', 'P1', 'P2', 'P3'].filter(p => stats.priorities.has(p)).map(pri => {
                  const data = stats.priorities.get(pri)!;
                  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                  const color = PRI_COLORS[pri];
                  const labels: Record<string, string> = {
                    P0: t(lang, 'Critical', '긴급'), P1: t(lang, 'High', '높음'),
                    P2: t(lang, 'Medium', '보통'), P3: t(lang, 'Low', '낮음'),
                  };
                  return (
                    <Box key={pri}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={pri} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha(color, 0.1), color }} />
                          <Typography variant="body2" fontWeight={600}>{labels[pri]}</Typography>
                        </Box>
                        <Typography variant="caption" fontWeight={700} sx={{ color }}>
                          {data.completed}/{data.total} ({pct}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{
                          height: 6, borderRadius: 3, bgcolor: alpha(color, 0.1),
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                        }} />
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </Fade>
  );
}
