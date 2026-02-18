// src/components/CycleAnalytics.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Select, MenuItem, FormControl,
  InputLabel, Chip, Avatar, LinearProgress, CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTasks } from '../hooks/useTasks';
import type { Task, Sprint } from '../types';
import { eachDayOfInterval, isWithinInterval, isBefore, format } from 'date-fns';

// --- Chart Colors ---
const CHART_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// ---------- Burn-down Chart (pure CSS/SVG) ----------

interface BurndownProps {
  sprint: Sprint;
  tasks: Task[];
}

function BurndownChart({ sprint, tasks }: BurndownProps) {
  const { t } = useLanguage();
  const total = tasks.reduce((sum, t) => sum + (t.estimate || 1), 0);
  if (!sprint.startDate || !sprint.endDate || total === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('noDataAvailable') as string}</Typography>
      </Box>
    );
  }

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const days = eachDayOfInterval({ start, end });
  const totalDays = days.length;

  // Ideal line: linear from total → 0
  const idealPoints = days.map((_, i) => ({
    x: (i / (totalDays - 1)) * 100,
    y: ((totalDays - 1 - i) / (totalDays - 1)) * 100,
  }));

  // Actual remaining: for each day, sum estimate of uncompleted tasks
  const actualPoints = days.map((day, i) => {
    const remaining = tasks.reduce((sum, task) => {
      const pts = task.estimate || 1;
      if (task.completed && task.updatedAt) {
        const completedDate = new Date(task.updatedAt);
        if (isBefore(completedDate, day) || format(completedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')) {
          return sum; // task done by this day
        }
      }
      return sum + pts;
    }, 0);
    return {
      x: (i / (totalDays - 1)) * 100,
      y: (remaining / total) * 100,
    };
  });

  // Only show actuals up to "today" or end of sprint
  const today = new Date();
  const cutoffIndex = days.findIndex(d => d > today);
  const visibleActual = cutoffIndex === -1 ? actualPoints : actualPoints.slice(0, cutoffIndex);

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <Box sx={{ position: 'relative', pt: 1 }}>
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 24, height: 3, bgcolor: '#94a3b8', borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">{t('idealLine') as string}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 24, height: 3, bgcolor: '#6366f1', borderRadius: 1 }} />
          <Typography variant="caption" color="text.secondary">{t('actualLine') as string}</Typography>
        </Box>
      </Box>

      {/* SVG Chart */}
      <svg viewBox="-5 -5 110 110" style={{ width: '100%', height: 220 }} preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeWidth="0.2" opacity="0.15" />
        ))}
        {/* Ideal line (dashed) */}
        <path d={toPath(idealPoints)} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2" />
        {/* Actual line */}
        {visibleActual.length > 1 && (
          <>
            <path
              d={toPath(visibleActual) + ` L ${visibleActual[visibleActual.length - 1].x} 100 L ${visibleActual[0].x} 100 Z`}
              fill="url(#burnGrad)" opacity="0.15"
            />
            <path d={toPath(visibleActual)} fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={visibleActual[visibleActual.length - 1].x} cy={visibleActual[visibleActual.length - 1].y} r="2.5" fill="#6366f1" />
          </>
        )}
        <defs>
          <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* X-axis labels */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
        <Typography variant="caption" color="text.disabled">{format(start, 'M/d')}</Typography>
        <Typography variant="caption" color="text.disabled">{format(end, 'M/d')}</Typography>
      </Box>
    </Box>
  );
}

// ---------- Velocity Chart ----------

interface VelocityProps {
  sprints: Sprint[];
  allTasks: Task[];
}

function VelocityChart({ sprints, allTasks }: VelocityProps) {
  const { t } = useLanguage();
  // Calculate completed points per sprint
  const data = sprints
    .filter(s => s.endDate && new Date(s.endDate) <= new Date())
    .slice(-6) // last 6 sprints
    .map(s => {
      const sprintTasks = allTasks.filter(tk => tk.sprintId === s.id);
      const completed = sprintTasks
        .filter(tk => tk.completed)
        .reduce((sum, tk) => sum + (tk.estimate || 1), 0);
      const total = sprintTasks.reduce((sum, tk) => sum + (tk.estimate || 1), 0);
      return { name: s.name, completed, total, id: s.id };
    });

  const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.completed, 0) / data.length) : 0;
  const maxVal = Math.max(...data.map(d => Math.max(d.completed, d.total)), 1);

  if (data.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('noDataAvailable') as string}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Avg velocity badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <WhatshotIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
        <Typography variant="body2" fontWeight={600}>
          {t('avgVelocity') as string}: <strong>{avg}</strong> pts
        </Typography>
      </Box>

      {/* Bars */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 180 }}>
        {data.map((d, i) => (
          <Box key={d.id} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5 }}>
              {d.completed}
            </Typography>
            {/* Completed bar */}
            <Box sx={{
              width: '60%',
              height: `${(d.completed / maxVal) * 100}%`,
              minHeight: d.completed > 0 ? 4 : 0,
              bgcolor: CHART_COLORS[i % CHART_COLORS.length],
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.5s',
              opacity: 0.85,
            }} />
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, fontSize: '0.65rem', textAlign: 'center' }} noWrap>
              {d.name.length > 8 ? d.name.slice(0, 8) + '…' : d.name}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Average line indicator */}
      <Box sx={{ position: 'relative', mt: -1 }}>
        <Box sx={{
          position: 'absolute',
          bottom: `${(avg / maxVal) * 180}px`,
          left: 0, right: 0,
          borderBottom: '2px dashed',
          borderColor: '#f59e0b',
          opacity: 0.5,
        }} />
      </Box>
    </Box>
  );
}

// ---------- Workload Chart ----------

interface WorkloadProps {
  tasks: Task[];
}

function WorkloadChart({ tasks }: WorkloadProps) {
  const { t } = useLanguage();
  const { currentMembers } = useWorkspace();

  // Group tasks by assignee
  const workloadMap = useMemo(() => {
    const map = new Map<string, { assigned: number; completed: number; name: string; photo?: string }>();
    tasks.forEach(task => {
      const owners = task.ownerUids || [];
      const pts = task.estimate || 1;
      owners.forEach((uid: string) => {
        if (!map.has(uid)) {
          const m = currentMembers?.find((mem: { uid: string; displayName: string; photoURL?: string }) => mem.uid === uid);
          map.set(uid, { assigned: 0, completed: 0, name: m?.displayName || uid.slice(0, 6), photo: m?.photoURL });
        }
        const entry = map.get(uid)!;
        entry.assigned += pts;
        if (task.completed) entry.completed += pts;
      });
    });
    return Array.from(map.entries())
      .map(([uid, data]) => ({ uid, ...data }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [tasks, currentMembers]);

  if (workloadMap.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('noDataAvailable') as string}</Typography>
      </Box>
    );
  }

  const maxPts = Math.max(...workloadMap.map(w => w.assigned), 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {workloadMap.slice(0, 8).map((w, i) => (
        <Box key={w.uid} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={w.photo || undefined}
            sx={{ width: 28, height: 28, fontSize: 12, bgcolor: CHART_COLORS[i % CHART_COLORS.length] }}
          >
            {w.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
              <Typography variant="body2" fontWeight={600} noWrap fontSize="0.8rem">{w.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {w.completed}/{w.assigned} pts
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', height: 6, borderRadius: 3, bgcolor: 'action.hover' }}>
              <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(w.assigned / maxPts) * 100}%`,
                borderRadius: 3,
                bgcolor: CHART_COLORS[i % CHART_COLORS.length] + '30',
              }} />
              <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(w.completed / maxPts) * 100}%`,
                borderRadius: 3,
                bgcolor: CHART_COLORS[i % CHART_COLORS.length],
                transition: 'width 0.5s',
              }} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ---------- Main Component ----------

export default function CycleAnalytics() {
  const { t } = useLanguage();
  const { sprints } = useWorkspace();
  const { tasks: allTasks, loading } = useTasks();
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  // Auto-select first active sprint
  useEffect(() => {
    if (selectedSprintId || !sprints?.length) return;
    const active = sprints.find(s => {
      if (!s.startDate || !s.endDate) return false;
      const now = new Date();
      return isWithinInterval(now, { start: new Date(s.startDate), end: new Date(s.endDate) });
    });
    setSelectedSprintId(active?.id || sprints[0]?.id || '');
  }, [sprints, selectedSprintId]);

  const selectedSprint = sprints?.find(s => s.id === selectedSprintId);
  const sprintTasks = useMemo(
    () => allTasks.filter(t => t.sprintId === selectedSprintId),
    [allTasks, selectedSprintId]
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalPoints = sprintTasks.reduce((s, t) => s + (t.estimate || 1), 0);
  const completedPoints = sprintTasks.filter(t => t.completed).reduce((s, t) => s + (t.estimate || 1), 0);
  const progressPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return (
    <Box>
      {/* Sprint Selector + Progress */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row'}, alignItems: { sm: 'center' }, gap: 2, mb: 4 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{t('selectSprint') as string}</InputLabel>
          <Select
            value={selectedSprintId}
            label={t('selectSprint') as string}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            {(sprints || []).map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedSprint && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            <Box sx={{ flex: 1, maxWidth: 300 }}>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                sx={{
                  height: 8, borderRadius: 4,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                  },
                }}
              />
            </Box>
            <Typography variant="body2" fontWeight={700} color="primary">
              {progressPct}%
            </Typography>
            <Chip
              label={`${completedPoints}/${totalPoints} pts`}
              size="small"
              sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', fontSize: '0.75rem' }}
            />
          </Box>
        )}
      </Box>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Burn-down Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>{t('burndownChart') as string}</Typography>
            </Box>
            {selectedSprint ? (
              <BurndownChart sprint={selectedSprint} tasks={sprintTasks} />
            ) : (
              <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                {t('selectSprint') as string}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Velocity Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <WhatshotIcon sx={{ color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={700}>{t('velocityChart') as string}</Typography>
            </Box>
            <VelocityChart sprints={sprints || []} allTasks={allTasks} />
          </Paper>
        </Grid>

        {/* Workload Chart */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <GroupIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>{t('teamWorkload') as string}</Typography>
            </Box>
            <WorkloadChart tasks={sprintTasks} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
