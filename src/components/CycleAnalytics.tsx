// src/components/CycleAnalytics.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Select, MenuItem, FormControl,
  InputLabel, Chip, Avatar, LinearProgress, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Collapse, TextField, InputAdornment, IconButton,
  ToggleButtonGroup, ToggleButton, Button,
  Dialog, DialogTitle, DialogContent, alpha,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import GroupIcon from '@mui/icons-material/Group';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Legend,
  Cell, PieChart, Pie,
} from 'recharts';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';
import HelpTooltip from './HelpTooltip';
import { useTasks } from '../hooks/useTasks';
import type { Task, Sprint } from '../types';
import { eachDayOfInterval, isBefore, format, differenceInDays, differenceInHours, isWithinInterval } from 'date-fns';

const COLORS = {
  indigo: '#6366f1',
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  violet: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
};

const CHART_FILL_COLORS = [COLORS.indigo, COLORS.blue, COLORS.emerald, COLORS.amber, COLORS.red, COLORS.violet, COLORS.pink, COLORS.cyan];

// ===== KPI Card =====
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  onClick?: () => void;
}

function KpiCard({ icon, label, value, subtitle, color, onClick }: KpiCardProps) {
  return (
    <Paper elevation={0} onClick={onClick} sx={{
      p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider',
      display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 180,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 3, borderColor: color + '60' } : {},
    }}>
      <Box sx={{
        p: 1.2, borderRadius: 2, bgcolor: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
        <Typography variant="h5" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
        {subtitle && <Typography variant="caption" color="text.disabled">{subtitle}</Typography>}
      </Box>
    </Paper>
  );
}

// ===== Custom Tooltip =====
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5, borderRadius: 2, minWidth: 140 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary">{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="body2" fontSize="0.8rem">
            {p.name}: <strong>{p.value}</strong>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

// ===== Enhanced Burndown Chart =====
function BurndownChart({ sprint, tasks }: { sprint: Sprint; tasks: Task[] }) {
  const { t } = useLanguage();
  const total = tasks.reduce((sum, tk) => sum + (tk.estimate || 1), 0);

  if (!sprint.startDate || !sprint.endDate || total === 0) {
    return <EmptyState text={t('noDataAvailable') as string} />;
  }

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const days = eachDayOfInterval({ start, end });
  const today = new Date();
  const todayStr = format(today, 'M/d');
  const daysLeft = Math.max(0, differenceInDays(end, today));

  const data = days.map(day => {
    const remaining = tasks.reduce((sum, task) => {
      const pts = task.estimate || 1;
      if (task.completed && task.updatedAt) {
        const completedDate = new Date(task.updatedAt);
        if (isBefore(completedDate, day) || format(completedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')) {
          return sum;
        }
      }
      return sum + pts;
    }, 0);

    const dayIndex = days.indexOf(day);
    const ideal = total - (total * dayIndex) / (days.length - 1);
    const isFuture = day > today;

    return {
      date: format(day, 'M/d'),
      ideal: Math.round(ideal * 10) / 10,
      actual: isFuture ? undefined : remaining,
    };
  });

  // Calculate trend projection: extend current velocity to end of sprint
  const pastData = data.filter(d => d.actual !== undefined);
  let trendData = data;
  if (pastData.length >= 2) {
    const lastActual = pastData[pastData.length - 1].actual!;
    const prevActual = pastData[Math.max(0, pastData.length - 3)].actual!;
    const dailyRate = (prevActual - lastActual) / Math.max(1, pastData.length >= 3 ? 2 : 1);
    const lastIdx = data.findIndex(d => d.date === pastData[pastData.length - 1].date);
    trendData = data.map((d, i) => ({
      ...d,
      trend: i > lastIdx ? Math.max(0, Math.round((lastActual - dailyRate * (i - lastIdx)) * 10) / 10) : (i === lastIdx ? lastActual : undefined),
    }));
  }

  return (
    <Box>
      {/* Sprint status badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        {sprint.status === 'active' && daysLeft > 0 && (
          <Chip
            label={(t('daysRemaining') as string).replace('{n}', String(daysLeft))}
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: daysLeft <= 3 ? '#fef2f2' : '#ecfdf5', color: daysLeft <= 3 ? COLORS.red : COLORS.emerald }}
          />
        )}
        {sprint.status === 'completed' && (
          <Chip label="✅" size="small" sx={{ fontWeight: 600 }} />
        )}
      </Box>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.indigo} stopOpacity={0.3} />
              <stop offset="100%" stopColor={COLORS.indigo} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {/* Today marker */}
          <ReferenceLine x={todayStr} stroke={COLORS.red} strokeDasharray="3 3" strokeWidth={1.5}
            label={{ value: t('todayLabel') as string, position: 'insideTopRight', fontSize: 10, fill: COLORS.red }} />
          {/* Ideal line */}
          <Area type="monotone" dataKey="ideal" name={t('idealLine') as string} stroke="#94a3b8" strokeDasharray="5 3" fill="none" strokeWidth={2} dot={false} />
          {/* Actual remaining */}
          <Area type="monotone" dataKey="actual" name={t('actualLine') as string} stroke={COLORS.indigo} fill="url(#burndownGrad)" strokeWidth={2.5} dot={false} connectNulls={false} />
          {/* Trend projection */}
          {'trend' in (trendData[0] || {}) && (
            <Area type="monotone" dataKey="trend" name={t('trendProjection') as string} stroke={COLORS.amber} fill="none" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls={false} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

// ===== Burnup Chart =====
function BurnupChart({ sprint, tasks }: { sprint: Sprint; tasks: Task[] }) {
  const { t } = useLanguage();
  const total = tasks.reduce((sum, tk) => sum + (tk.estimate || 1), 0);

  if (!sprint.startDate || !sprint.endDate || total === 0) {
    return <EmptyState text={t('noDataAvailable') as string} />;
  }

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const data = days.map(day => {
    const isFuture = day > today;
    const completed = tasks.reduce((sum, task) => {
      const pts = task.estimate || 1;
      if (task.completed && task.updatedAt) {
        const completedDate = new Date(task.updatedAt);
        if (isBefore(completedDate, day) || format(completedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')) {
          return sum + pts;
        }
      }
      return sum;
    }, 0);

    return {
      date: format(day, 'M/d'),
      scope: total,
      completed: isFuture ? undefined : completed,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="burnupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.3} />
            <stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="scope" name={t('scope') as string} stroke={COLORS.amber} fill="none" strokeWidth={2} strokeDasharray="5 3" dot={false} />
        <Area type="monotone" dataKey="completed" name={t('completedLabel') as string} stroke={COLORS.emerald} fill="url(#burnupGrad)" strokeWidth={2.5} dot={false} connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ===== Velocity Chart =====
function VelocityChart({ sprints, allTasks }: { sprints: Sprint[]; allTasks: Task[] }) {
  const { t } = useLanguage();

  const data = sprints
    .filter(s => s.endDate && new Date(s.endDate) <= new Date())
    .slice(-8)
    .map(s => {
      const sprintTasks = allTasks.filter(tk => tk.sprintId === s.id);
      const completed = sprintTasks.filter(tk => tk.completed).reduce((sum, tk) => sum + (tk.estimate || 1), 0);
      const total = sprintTasks.reduce((sum, tk) => sum + (tk.estimate || 1), 0);
      return { name: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name, completed, total, id: s.id };
    });

  const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.completed, 0) / data.length) : 0;

  if (data.length === 0) {
    return <EmptyState text={t('noDataAvailable') as string} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <WhatshotIcon sx={{ color: COLORS.amber, fontSize: 18 }} />
        <Typography variant="body2" fontWeight={600}>
          {t('avgVelocity') as string}: <strong>{avg}</strong> pts
        </Typography>
      </Box>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine y={avg} stroke={COLORS.amber} strokeDasharray="5 3" strokeWidth={2} label={{ value: `Avg: ${avg}`, position: 'insideTopRight', fontSize: 11, fill: COLORS.amber }} />
          <Bar dataKey="completed" name={t('completedLabel') as string} radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_FILL_COLORS[i % CHART_FILL_COLORS.length]} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

// ===== Cumulative Flow Diagram =====
function CfdChart({ sprint, tasks }: { sprint: Sprint; tasks: Task[] }) {
  const { t } = useLanguage();

  if (!sprint.startDate || !sprint.endDate || tasks.length === 0) {
    return <EmptyState text={t('noDataAvailable') as string} />;
  }

  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const data = days
    .filter(day => day <= today)
    .map(day => {
      let done = 0, inprogress = 0, todo = 0;
      tasks.forEach(task => {
        const pts = task.estimate || 1;
        if (task.completed && task.updatedAt) {
          const completedDate = new Date(task.updatedAt);
          if (isBefore(completedDate, day) || format(completedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')) {
            done += pts; return;
          }
        }
        const status = task.status || 'todo';
        if (status === 'inprogress' || status === 'in_progress' || status === 'review') {
          inprogress += pts;
        } else {
          todo += pts;
        }
      });
      return { date: format(day, 'M/d'), done, inprogress, todo };
    });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} stackOffset="none">
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="done" name={t('doneLabel') as string} stackId="1" stroke={COLORS.emerald} fill={COLORS.emerald} fillOpacity={0.6} />
        <Area type="monotone" dataKey="inprogress" name={t('inProgressLabel') as string} stackId="1" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.5} />
        <Area type="monotone" dataKey="todo" name={t('todoLabel') as string} stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ===== Team Workload Panel (Unified) =====
const DEFAULT_CAPACITY = 20; // pts per sprint
const MEMBERS_PER_PAGE = 10;
type SortMode = 'utilization' | 'assigned' | 'name';

type MemberWorkload = {
  uid: string; name: string; photo?: string;
  assigned: number; completed: number; remaining: number;
  capacity: number; utilization: number;
  status: 'overloaded' | 'onTrack' | 'underAllocated';
  tasks: Task[];
};

function TeamWorkloadPanel({ tasks }: { tasks: Task[] }) {
  const { t } = useLanguage();
  const { currentMembers } = useWorkspace();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('utilization');
  const [showAll, setShowAll] = useState(false);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const memberData: MemberWorkload[] = useMemo(() => {
    const map = new Map<string, {
      assigned: number; completed: number; name: string;
      photo?: string; tasks: Task[];
    }>();

    tasks.forEach(task => {
      const owners = task.ownerUids || [];
      const pts = task.estimate || 1;
      owners.forEach((uid: string) => {
        if (!map.has(uid)) {
          const m = currentMembers?.find((mem: { uid: string; displayName: string; photoURL?: string }) => mem.uid === uid);
          map.set(uid, {
            assigned: 0, completed: 0,
            name: m?.displayName || uid.slice(0, 6),
            photo: m?.photoURL,
            tasks: [],
          });
        }
        const entry = map.get(uid)!;
        entry.assigned += pts;
        if (task.completed) entry.completed += pts;
        entry.tasks.push(task);
      });
    });

    return Array.from(map.entries())
      .map(([uid, d]) => ({
        uid,
        ...d,
        remaining: d.assigned - d.completed,
        capacity: DEFAULT_CAPACITY,
        utilization: Math.round((d.assigned / DEFAULT_CAPACITY) * 100),
        status: d.assigned > DEFAULT_CAPACITY ? 'overloaded' as const
          : d.assigned >= DEFAULT_CAPACITY * 0.7 ? 'onTrack' as const
            : 'underAllocated' as const,
      }));
  }, [tasks, currentMembers]);

  // Filter + Sort
  const sortedData = useMemo(() => {
    let filtered = memberData;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(q));
    }

    const sorter = (a: MemberWorkload, b: MemberWorkload) => {
      if (sortMode === 'utilization') return b.utilization - a.utilization;
      if (sortMode === 'assigned') return b.assigned - a.assigned;
      return a.name.localeCompare(b.name);
    };

    return [...filtered].sort(sorter);
  }, [memberData, search, sortMode]);

  const visibleData = showAll ? sortedData : sortedData.slice(0, MEMBERS_PER_PAGE);
  const hasMore = sortedData.length > MEMBERS_PER_PAGE;

  if (memberData.length === 0) {
    return <EmptyState text={t('noDataAvailable') as string} />;
  }

  const totalAssigned = memberData.reduce((s, m) => s + m.assigned, 0);
  const totalCapacity = memberData.length * DEFAULT_CAPACITY;
  const overloadedCount = memberData.filter(m => m.status === 'overloaded').length;

  const statusConfig = {
    overloaded: { label: t('overloaded') as string, color: COLORS.red, icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
    onTrack: { label: t('onTrack') as string, color: COLORS.emerald, icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> },
    underAllocated: { label: t('underAllocated') as string, color: COLORS.amber, icon: null },
  };

  return (
    <Box>
      {/* KPIs + Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <KpiCard
            icon={<GroupIcon sx={{ color: COLORS.indigo, fontSize: 22 }} />}
            label={t('teamCapacity') as string}
            value={`${totalAssigned}/${totalCapacity}`}
            subtitle={`${Math.round((totalAssigned / totalCapacity) * 100)}% ${t('utilizationRate') as string}`}
            color={COLORS.indigo}
          />
          {overloadedCount > 0 && (
            <KpiCard
              icon={<WarningAmberIcon sx={{ color: COLORS.red, fontSize: 22 }} />}
              label={t('overloadedMembers') as string}
              value={overloadedCount}
              subtitle={`${memberData.length} ${t('totalMembers') as string}`}
              color={COLORS.red}
            />
          )}
        </Box>

        {/* Search + Sort Controls */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('searchMembers') as string}
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 2, height: 36 } }}
          />
          <ToggleButtonGroup
            value={sortMode}
            exclusive
            onChange={(_, v) => v && setSortMode(v)}
            size="small"
            sx={{ height: 36, '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, px: 1.5 } }}
          >
            <ToggleButton value="utilization">
              <SortIcon sx={{ fontSize: 14, mr: 0.5 }} />{t('sortByUtilization') as string}
            </ToggleButton>
            <ToggleButton value="assigned">{t('sortByAssigned') as string}</ToggleButton>
            <ToggleButton value="name">{t('sortByName') as string}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Member List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {visibleData.map((m, i) => {
          const pct = Math.min(m.utilization, 150);
          const cfg = statusConfig[m.status];
          const isExpanded = expandedUid === m.uid;

          return (
            <Box key={m.uid}>
              {/* Member Row */}
              <Box
                onClick={() => setExpandedUid(isExpanded ? null : m.uid)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, px: 1.5,
                  cursor: 'pointer', borderRadius: 2,
                  transition: 'all 0.15s',
                  bgcolor: isExpanded ? 'action.selected' : m.status === 'overloaded' ? `${COLORS.red}06` : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderBottom: '1px solid', borderColor: 'divider',
                }}
              >
                <Avatar src={m.photo || undefined} sx={{ width: 32, height: 32, fontSize: 13, bgcolor: CHART_FILL_COLORS[i % CHART_FILL_COLORS.length] }}>
                  {m.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 100, maxWidth: 120 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{m.name}</Typography>
                  <Typography variant="caption" color="text.disabled">
                    {m.completed}/{m.assigned} {t('points') as string}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, mx: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(pct, 100)}
                    sx={{
                      height: 8, borderRadius: 4,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: cfg.color,
                      },
                    }}
                  />
                </Box>
                <Typography variant="caption" fontWeight={700} sx={{ minWidth: 55, textAlign: 'right', color: cfg.color }}>
                  {m.utilization}%
                </Typography>
                <Chip
                  size="small"
                  icon={cfg.icon || undefined}
                  label={cfg.label}
                  sx={{
                    fontSize: '0.65rem', fontWeight: 700, height: 22, minWidth: 70,
                    bgcolor: `${cfg.color}15`, color: cfg.color,
                    border: `1px solid ${cfg.color}30`,
                  }}
                />
                <IconButton size="small" sx={{ ml: 'auto' }}>
                  {isExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Box>

              {/* Drill-Down: Member's Tasks */}
              <Collapse in={isExpanded} timeout={200}>
                <Box sx={{ pl: 7, pr: 2, py: 1.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                  {m.tasks.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">{t('noTasksAssigned') as string}</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.5 }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.5 }}>{t('taskLabel') as string}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.5 }}>{t('points') as string}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.5 }}>{t('priority') as string}</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.5 }}>{t('statusLabel') as string}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {m.tasks.map(tk => (
                            <TableRow key={tk.id} hover
                              onClick={() => navigate(`/tasks?taskId=${tk.id}`)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '&:last-child td': { border: 0 } }}
                            >
                              <TableCell sx={{ py: 0.5 }}>
                                <Chip label={tk.taskCode || tk.id.slice(0, 6)} size="small"
                                  sx={{ fontWeight: 700, fontFamily: 'monospace', height: 20, fontSize: '0.65rem' }} />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500, maxWidth: 250, py: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {tk.completed && <CheckCircleOutlineIcon sx={{ fontSize: 14, color: COLORS.emerald }} />}
                                  <Typography variant="body2" fontSize="0.8rem" noWrap
                                    sx={{ textDecoration: tk.completed ? 'line-through' : 'none', color: tk.completed ? 'text.disabled' : 'text.primary' }}>
                                    {tk.text}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="caption" fontWeight={600}>{tk.estimate || 1}</Typography>
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Chip label={tk.priority || '-'} size="small"
                                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Chip label={tk.completed ? t('doneLabel') as string : (tk.status || 'todo')} size="small"
                                  sx={{
                                    height: 18, fontSize: '0.6rem', fontWeight: 600,
                                    bgcolor: tk.completed ? `${COLORS.emerald}15` : tk.status === 'inprogress' ? '#dbeafe' : '#f1f5f9',
                                    color: tk.completed ? COLORS.emerald : tk.status === 'inprogress' ? '#2563eb' : '#64748b',
                                  }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* Pagination */}
      {hasMore && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            size="small"
            onClick={() => setShowAll(!showAll)}
            startIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
          >
            {showAll ? t('showLess') as string : t('showMore') as string}
            {' '}
            ({(t('showingOf') as string).replace('{shown}', String(visibleData.length)).replace('{total}', String(sortedData.length))})
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ===== Workflow Efficiency Chart (Cycle Time Breakdown) =====
function WorkflowEfficiencyChart({ tasks }: { tasks: Task[] }) {
  const { t } = useLanguage();
  // Calculate avg time in each stage based on completed tasks
  const completedTasks = tasks.filter(tk => tk.completed && tk.updatedAt && tk.createdAt);

  // Approximate time per stage: split total cycle time into stages
  // We use task status history approximation (created→done total time)
  const stageData = useMemo(() => {
    const stageOrder = ['todo', 'inprogress', 'in_progress', 'review', 'done'];
    const stageLabels: Record<string, () => string> = {
      'todo': () => t('todoLabel') as string,
      'inprogress': () => t('inProgressLabel') as string,
      'in_progress': () => t('inProgressLabel') as string,
      'review': () => 'Review',
      'done': () => t('doneLabel') as string,
    };

    if (completedTasks.length === 0) return [];
    const statusCounts: Record<string, number[]> = {};
    const allStatuses = new Set<string>();

    tasks.forEach(tk => {
      const status = tk.status || 'todo';
      allStatuses.add(status);
    });

    // For completed tasks, estimate time per stage based on completion patterns
    completedTasks.forEach(tk => {
      const totalHours = differenceInHours(new Date(tk.updatedAt!), new Date(tk.createdAt));
      // Distribute time across stages (approximation)
      const stages = Array.from(allStatuses).filter(s => stageOrder.includes(s));
      const numStages = Math.max(stages.length, 1);
      stages.forEach(stage => {
        if (!statusCounts[stage]) statusCounts[stage] = [];
        // Weight 'inprogress' heavier than 'todo'
        const weight = (stage === 'inprogress' || stage === 'in_progress') ? 0.5 :
          stage === 'review' ? 0.3 : 0.1;
        statusCounts[stage].push(totalHours * weight / (numStages > 2 ? 1 : numStages));
      });
    });

    return Object.entries(statusCounts)
      .map(([stage, hours]) => {
        const avgHours = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0;
        return {
          stage: (stageLabels[stage] || (() => stage))(),
          hours: Math.round(avgHours * 10) / 10,
          days: Math.round((avgHours / 24) * 10) / 10,
          isBottleneck: false,
          statusKey: stage,
        };
      })
      .sort((a, b) => {
        const ai = stageOrder.indexOf(a.statusKey);
        const bi = stageOrder.indexOf(b.statusKey);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
  }, [tasks, completedTasks, t]);

  if (stageData.length === 0) {
    return <EmptyState text={t('noDataAvailable') as string} />;
  }

  // Mark the bottleneck (max hours)
  const maxHours = Math.max(...stageData.map(d => d.hours));
  const dataWithBottleneck = stageData.map(d => ({
    ...d,
    isBottleneck: d.hours === maxHours && maxHours > 0,
  }));

  return (
    <Box>
      <ResponsiveContainer width="100%" height={Math.max(180, dataWithBottleneck.length * 50)}>
        <BarChart data={dataWithBottleneck} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => v >= 24 ? `${Math.round(v / 24)}d` : `${v}h`} />
          <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fontWeight: 600 }} width={100} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="hours" name={t('hoursUnit') as string} radius={[0, 6, 6, 0]} maxBarSize={28}>
            {dataWithBottleneck.map((entry, i) => (
              <Cell key={i} fill={entry.isBottleneck ? COLORS.red : COLORS.indigo} opacity={entry.isBottleneck ? 1 : 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {dataWithBottleneck.some(d => d.isBottleneck) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <WarningAmberIcon sx={{ fontSize: 14, color: COLORS.red }} />
          <Typography variant="caption" color="error" fontWeight={600}>
            {t('bottleneck') as string}: {dataWithBottleneck.find(d => d.isBottleneck)?.stage}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ===== Status Distribution Chart (Pie) =====
function StatusDistributionChart({ tasks }: { tasks: Task[] }) {
  const { t } = useLanguage();

  const statusMap = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(tk => {
      const status = tk.completed ? 'done' : (tk.status || 'todo');
      map[status] = (map[status] || 0) + 1;
    });
    return map;
  }, [tasks]);

  if (tasks.length === 0) {
    return <EmptyState text={t('noDataAvailable') as string} />;
  }

  const statusColors: Record<string, string> = {
    'todo': '#94a3b8',
    'inprogress': COLORS.blue,
    'in_progress': COLORS.blue,
    'review': COLORS.violet,
    'done': COLORS.emerald,
  };

  const statusLabels: Record<string, () => string> = {
    'todo': () => t('todoLabel') as string,
    'inprogress': () => t('inProgressLabel') as string,
    'in_progress': () => t('inProgressLabel') as string,
    'review': () => 'Review',
    'done': () => t('doneLabel') as string,
  };

  const data = Object.entries(statusMap).map(([status, count]) => ({
    name: (statusLabels[status] || (() => status))(),
    value: count,
    fill: statusColors[status] || COLORS.cyan,
  }));

  return (
    <Box>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
            labelLine={{ strokeWidth: 1, stroke: '#94a3b8' }}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{ textAlign: 'center', mt: -1 }}>
        <Typography variant="h4" fontWeight={800} color="text.primary">{tasks.length}</Typography>
        <Typography variant="caption" color="text.secondary">
          {(t('taskCount') as string).replace('{n}', String(tasks.length))}
        </Typography>
      </Box>
    </Box>
  );
}


// ===== Empty State =====
function EmptyState({ text }: { text: string }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography color="text.secondary">{text}</Typography>
    </Box>
  );
}

// ===== Main Component =====
export default function CycleAnalytics() {
  const { t } = useLanguage();
  const { sprints } = useWorkspace();
  const { tasks: allTasks, loading } = useTasks();
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const navigate = useNavigate();
  const [kpiDialog, setKpiDialog] = useState<{ open: boolean; title: string; tasks: Task[]; color: string }>({
    open: false, title: '', tasks: [], color: COLORS.indigo,
  });

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
    [allTasks, selectedSprintId],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // KPI calculations
  const totalPoints = sprintTasks.reduce((s, t) => s + (t.estimate || 1), 0);
  const completedPoints = sprintTasks.filter(t => t.completed).reduce((s, t) => s + (t.estimate || 1), 0);
  const remainingPoints = totalPoints - completedPoints;
  const progressPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  // Average cycle time (created → completed, in days)
  const completedTasks = sprintTasks.filter(t => t.completed && t.updatedAt && t.createdAt);
  const avgCycleTime = completedTasks.length > 0
    ? Math.round(completedTasks.reduce((sum, t) => {
      return sum + differenceInDays(new Date(t.updatedAt!), new Date(t.createdAt));
    }, 0) / completedTasks.length * 10) / 10
    : 0;

  // Velocity (avg completed points across completed sprints)
  const completedSprints = (sprints || []).filter(s => s.endDate && new Date(s.endDate) <= new Date());
  const avgVelocity = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((sum, s) => {
      return sum + allTasks.filter(t => t.sprintId === s.id && t.completed).reduce((ps, t) => ps + (t.estimate || 1), 0);
    }, 0) / completedSprints.length)
    : 0;

  const remainingTasks = sprintTasks.filter(tk => !tk.completed);

  return (
    <Box>
      {/* Sprint Selector + Progress */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 2, mb: 3 }}>
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
                    background: `linear-gradient(90deg, ${COLORS.indigo}, ${COLORS.blue})`,
                  },
                }}
              />
            </Box>
            <Typography variant="body2" fontWeight={700} color="primary">{progressPct}%</Typography>
            <Chip label={`${completedPoints}/${totalPoints} pts`} size="small" sx={{ fontWeight: 600, bgcolor: 'primary.main', color: 'white', fontSize: '0.75rem' }} />
          </Box>
        )}
      </Box>

      {/* KPI Cards — now clickable */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <KpiCard
          icon={<TrendingUpIcon sx={{ color: COLORS.indigo, fontSize: 22 }} />}
          label={t('kpiTotalPoints') as string} value={totalPoints}
          subtitle={`${completedPoints} ${t('kpiCompleted') as string}`} color={COLORS.indigo}
          onClick={() => setKpiDialog({ open: true, title: `${t('kpiTotalPoints')} — ${selectedSprint?.name || ''}`, tasks: sprintTasks, color: COLORS.indigo })}
        />
        <KpiCard
          icon={<TrendingDownIcon sx={{ color: COLORS.red, fontSize: 22 }} />}
          label={t('kpiRemaining') as string} value={remainingPoints}
          subtitle={`${progressPct}% ${t('kpiDone') as string}`} color={remainingPoints > 0 ? COLORS.red : COLORS.emerald}
          onClick={() => setKpiDialog({ open: true, title: `${t('kpiRemaining')} — ${selectedSprint?.name || ''}`, tasks: remainingTasks, color: COLORS.red })}
        />
        <KpiCard
          icon={<AccessTimeIcon sx={{ color: COLORS.cyan, fontSize: 22 }} />}
          label={t('kpiAvgCycleTime') as string} value={`${avgCycleTime}d`}
          subtitle={t('kpiCreatedToDone') as string} color={COLORS.cyan}
          onClick={() => setKpiDialog({ open: true, title: `${t('kpiAvgCycleTime')} — ${t('kpiCreatedToDone')}`, tasks: completedTasks, color: COLORS.cyan })}
        />
        <KpiCard
          icon={<WhatshotIcon sx={{ color: COLORS.amber, fontSize: 22 }} />}
          label={t('kpiAvgVelocity') as string} value={`${avgVelocity} pts`}
          subtitle={`${completedSprints.length} ${t('kpiSprints') as string}`} color={COLORS.amber}
        />
      </Box>

      {/* ═══ KPI Task List Dialog ═══ */}
      <Dialog
        open={kpiDialog.open}
        onClose={() => setKpiDialog(prev => ({ ...prev, open: false }))}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '80vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kpiDialog.color }} />
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>{kpiDialog.title}</Typography>
          <Chip label={`${kpiDialog.tasks.length} ${t('taskLabel') as string}`} size="small" sx={{ fontWeight: 600 }} />
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {kpiDialog.tasks.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('noDataAvailable') as string}</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(kpiDialog.color, 0.04) }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 80 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{t('taskLabel') as string}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 70 }}>{t('points') as string}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 80 }}>{t('priority') as string}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: 100 }}>{t('statusLabel') as string}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kpiDialog.tasks.map(task => (
                    <TableRow key={task.id} hover
                      onClick={() => { setKpiDialog(prev => ({ ...prev, open: false })); navigate(`/tasks?taskId=${task.id}`); }}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(kpiDialog.color, 0.04) } }}
                    >
                      <TableCell>
                        <Chip label={task.taskCode || task.id.slice(0, 6)} size="small"
                          sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {task.text}
                          <LinkIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{task.estimate || 1}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={task.priority || '-'} size="small"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={task.completed ? (t('doneLabel') as string) : (task.status || 'todo')} size="small"
                          sx={{
                            height: 20, fontSize: '0.65rem', fontWeight: 600,
                            bgcolor: task.completed ? `${COLORS.emerald}15` : task.status === 'inprogress' ? '#dbeafe' : '#f1f5f9',
                            color: task.completed ? COLORS.emerald : task.status === 'inprogress' ? '#2563eb' : '#64748b',
                          }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Burn-down Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <TrendingDownIcon sx={{ color: COLORS.indigo }} />
              <Typography variant="h6" fontWeight={700}>{t('burndownChart') as string}</Typography>
              <HelpTooltip title={t('burndownChart') as string} description={t('burndownChartHelp') as string} />
            </Box>
            {selectedSprint ? <BurndownChart sprint={selectedSprint} tasks={sprintTasks} /> : <EmptyState text={t('selectSprint') as string} />}
          </Paper>
        </Grid>

        {/* Burn-up Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <TrendingUpIcon sx={{ color: COLORS.emerald }} />
              <Typography variant="h6" fontWeight={700}>{t('burnupChart') as string}</Typography>
              <HelpTooltip title={t('burnupChart') as string} description={t('burnupChartHelp') as string} />
            </Box>
            {selectedSprint ? <BurnupChart sprint={selectedSprint} tasks={sprintTasks} /> : <EmptyState text={t('selectSprint') as string} />}
          </Paper>
        </Grid>

        {/* Velocity Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <WhatshotIcon sx={{ color: COLORS.amber }} />
              <Typography variant="h6" fontWeight={700}>{t('velocityChart') as string}</Typography>
              <HelpTooltip title={t('velocityChart') as string} description={t('velocityChartHelp') as string} />
            </Box>
            <VelocityChart sprints={sprints || []} allTasks={allTasks} />
          </Paper>
        </Grid>

        {/* Cumulative Flow Diagram */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <StackedBarChartIcon sx={{ color: COLORS.blue }} />
              <Typography variant="h6" fontWeight={700}>{t('cumulativeFlow') as string}</Typography>
              <HelpTooltip title={t('cumulativeFlow') as string} description={t('cumulativeFlowHelp') as string} />
            </Box>
            {selectedSprint ? <CfdChart sprint={selectedSprint} tasks={sprintTasks} /> : <EmptyState text={t('selectSprint') as string} />}
          </Paper>
        </Grid>

        {/* Workflow Efficiency */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <TimelineIcon sx={{ color: COLORS.violet }} />
              <Typography variant="h6" fontWeight={700}>{t('cycleTimeBreakdown') as string}</Typography>
              <HelpTooltip title={t('cycleTimeBreakdown') as string} description={t('cycleTimeBreakdownHelp') as string} />
            </Box>
            <WorkflowEfficiencyChart tasks={sprintTasks} />
          </Paper>
        </Grid>

        {/* Status Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <PieChartOutlineIcon sx={{ color: COLORS.pink }} />
              <Typography variant="h6" fontWeight={700}>{t('statusDistribution') as string}</Typography>
              <HelpTooltip title={t('statusDistribution') as string} description={t('statusDistributionHelp') as string} />
            </Box>
            <StatusDistributionChart tasks={sprintTasks} />
          </Paper>
        </Grid>

        {/* Team Workload & Capacity (unified) */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <GroupIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>{t('teamWorkloadPanel') as string}</Typography>
              <HelpTooltip title={t('teamWorkloadPanel') as string} description={t('teamWorkloadPanelHelp') as string} />
            </Box>
            <TeamWorkloadPanel tasks={sprintTasks} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
