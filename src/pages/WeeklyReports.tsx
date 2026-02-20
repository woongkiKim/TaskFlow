import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, IconButton, Chip, CircularProgress,
  Tabs, Tab, Avatar, Select, MenuItem, FormControl, InputLabel, alpha, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
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
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import LockIcon from '@mui/icons-material/Lock';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';

import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTasks } from '../hooks/useTasks';
import { useOnboarding } from '../hooks/useOnboarding';
import CycleAnalytics from '../components/CycleAnalytics';
import type { Task, TeamMember, TeamGroup, MemberRole } from '../types';
import { ROLE_CONFIG, ROLE_HIERARCHY, hasRoleLevel } from '../types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Role detection helper ──
function detectRole(
  uid: string,
  members: TeamMember[],
  teamGroups: TeamGroup[],
): { role: MemberRole; myTeamGroup: TeamGroup | null } {
  const me = members.find(m => m.uid === uid);
  if (!me) return { role: 'viewer', myTeamGroup: null };

  // Owner/Admin see all
  if (hasRoleLevel(me.role, 'admin')) return { role: me.role, myTeamGroup: null };

  // Maintainer: check if leaderId matches, or just has maintainer role
  if (me.role === 'maintainer') {
    const leadTeam = teamGroups.find(tg => tg.leaderId === uid);
    const myTeam = leadTeam || teamGroups.find(tg => tg.memberIds.includes(uid)) || null;
    return { role: 'maintainer', myTeamGroup: myTeam };
  }

  // Check if any team has this user as leader (even if role is member)
  const leadTeam = teamGroups.find(tg => tg.leaderId === uid);
  if (leadTeam) return { role: 'maintainer', myTeamGroup: leadTeam };

  // Regular member, triage, viewer
  const myTeam = teamGroups.find(tg => tg.memberIds.includes(uid)) || null;
  return { role: me.role, myTeamGroup: myTeam };
}

// ── Permission definitions for report access ──
const REPORT_PERMISSIONS: Record<MemberRole, { canSeeTeam: boolean; canSeeAllMembers: boolean; reportAccess: string; reportAccessKo: string }> = {
  owner:      { canSeeTeam: true,  canSeeAllMembers: true,  reportAccess: 'All member reports & team overview', reportAccessKo: '전체 멤버 리포트 및 팀 개요' },
  admin:      { canSeeTeam: true,  canSeeAllMembers: true,  reportAccess: 'All member reports & team overview', reportAccessKo: '전체 멤버 리포트 및 팀 개요' },
  maintainer: { canSeeTeam: true,  canSeeAllMembers: false, reportAccess: 'Team member reports & overview', reportAccessKo: '팀원 리포트 및 팀 개요' },
  member:     { canSeeTeam: false, canSeeAllMembers: false, reportAccess: 'Own report only', reportAccessKo: '본인 리포트만' },
  triage:     { canSeeTeam: false, canSeeAllMembers: false, reportAccess: 'Own report only', reportAccessKo: '본인 리포트만' },
  viewer:     { canSeeTeam: false, canSeeAllMembers: false, reportAccess: 'Own report only (read-only)', reportAccessKo: '본인 리포트만 (읽기 전용)' },
};

// ── View mode types ──
type ViewMode = 'my' | 'teamOverview' | 'memberDetail';

// ── Color palette ──
const COLORS = {
  indigo: '#6366f1',
  emerald: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  blue: '#3b82f6',
};

const FILL_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ═══════════════════════════════════════════════
// Report Content — individual report view
// ═══════════════════════════════════════════════
function ReportContent({
  tasks,
  weekStart,
  weekEnd,
  lastWeekTasks,
  t,
  memberName,
}: {
  tasks: Task[];
  weekStart: Date;
  weekEnd: Date;
  lastWeekTasks: Task[];
  t: (key: string) => string | string[];
  memberName?: string;
}) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(tk => tk.completed).length;
  const pendingTasks = tasks.filter(tk => !tk.completed);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const lastWeekCompleted = lastWeekTasks.filter(tk => tk.completed).length;
  const lastWeekTotal = lastWeekTasks.length;
  const lastWeekRate = lastWeekTotal > 0 ? Math.round((lastWeekCompleted / lastWeekTotal) * 100) : 0;

  const completedDiff = lastWeekCompleted > 0
    ? Math.round(((completedTasks - lastWeekCompleted) / lastWeekCompleted) * 100)
    : (completedTasks > 0 ? 100 : 0);
  const rateDiff = completionRate - lastWeekRate;

  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const chartData = daysOfWeek.map((day, i) => {
    const dayTasks = tasks.filter(tk => isSameDay(new Date(tk.createdAt), day));
    return {
      day: DAY_LABELS[i],
      total: dayTasks.length,
      completed: dayTasks.filter(tk => tk.completed).length,
    };
  });
  const maxChartValue = Math.max(...chartData.map(d => Math.max(d.total, d.completed)), 1);

  const achievements = tasks
    .filter(tk => tk.completed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <>
      {/* Member name banner */}
      {memberName && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: 1 }}>
          <PersonIcon sx={{ fontSize: 18, color: COLORS.indigo }} />
          <Typography variant="body2" fontWeight={700} color="primary">
            {(t('viewingReportOf') as string).replace('{name}', memberName)}
          </Typography>
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="500">{t('totalTasks') as string}</Typography>
                <Typography variant="h3" fontWeight="800" sx={{ mt: 1 }}>{totalTasks}</Typography>
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

      {/* Productivity Trends Chart */}
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

        <Box sx={{ height: 250, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', px: { xs: 0, sm: 4 } }}>
          {chartData.map((data) => (
            <Box key={data.day} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', flex: 1 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 0.5 }}>
                {data.total > 0 ? `${data.completed}/${data.total}` : ''}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: '80%', width: '100%', justifyContent: 'center' }}>
                <Box sx={{
                  width: { xs: 8, sm: 14 },
                  height: `${maxChartValue > 0 ? (data.total / maxChartValue) * 100 : 0}%`,
                  minHeight: data.total > 0 ? 4 : 0,
                  bgcolor: 'grey.300', borderRadius: '4px 4px 0 0', transition: 'height 0.5s'
                }} />
                <Box sx={{
                  width: { xs: 8, sm: 14 },
                  height: `${maxChartValue > 0 ? (data.completed / maxChartValue) * 100 : 0}%`,
                  minHeight: data.completed > 0 ? 4 : 0,
                  bgcolor: 'primary.main', borderRadius: '4px 4px 0 0', transition: 'height 0.5s',
                  boxShadow: data.completed > 0 ? '0 4px 6px rgba(59, 130, 246, 0.3)' : 'none'
                }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontWeight: 500 }}>{data.day}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Bottom Lists */}
      <Grid container spacing={3} sx={{ pb: 4 }}>
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
                        bgcolor: '#eff6ff', color: task.categoryColor || '#3b82f6',
                        fontWeight: 'bold', borderRadius: 1, height: 20, fontSize: '0.65rem'
                      }} />
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

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
  );
}

// ═══════════════════════════════════════════════
// Team Overview — team lead / admin view
// ═══════════════════════════════════════════════
function TeamOverviewContent({
  tasks,
  memberIds,
  members,
  weekStart,
  weekEnd,
  t,
}: {
  tasks: Task[];
  memberIds: string[];
  members: TeamMember[];
  weekStart: Date;
  weekEnd: Date;
  t: (key: string) => string | string[];
}) {
  // Per-member stats
  const memberStats = useMemo(() => {
    return memberIds.map(uid => {
      const m = members.find(mem => mem.uid === uid);
      const myTasks = tasks.filter(tk =>
        tk.ownerUids?.includes(uid) &&
        isWithinInterval(new Date(tk.createdAt), { start: weekStart, end: weekEnd })
      );
      const completed = myTasks.filter(tk => tk.completed).length;
      return {
        uid,
        name: m?.displayName || uid.slice(0, 6),
        photo: m?.photoURL,
        total: myTasks.length,
        completed,
        rate: myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0,
      };
    }).sort((a, b) => b.completed - a.completed);
  }, [tasks, memberIds, members, weekStart, weekEnd]);

  const totalCompleted = memberStats.reduce((s, m) => s + m.completed, 0);
  const totalAll = memberStats.reduce((s, m) => s + m.total, 0);
  const avgRate = memberStats.length > 0
    ? Math.round(memberStats.reduce((s, m) => s + m.rate, 0) / memberStats.length)
    : 0;
  const topPerformer = memberStats[0];
  const maxCompleted = Math.max(...memberStats.map(m => m.completed), 1);

  return (
    <Box>
      {/* Team KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{t('teamTotalCompleted') as string}</Typography>
                <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>{totalCompleted}</Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: alpha(COLORS.indigo, 0.1), borderRadius: 2 }}>
                <TaskAltIcon sx={{ color: COLORS.indigo }} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
              {totalAll} {t('totalTasks') as string}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{t('avgCompletionRate') as string}</Typography>
                <Typography variant="h3" fontWeight={800} sx={{ mt: 1, color: avgRate >= 70 ? COLORS.emerald : avgRate >= 40 ? COLORS.amber : COLORS.red }}>{avgRate}%</Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: alpha(COLORS.cyan, 0.1), borderRadius: 2 }}>
                <PieChartIcon sx={{ color: COLORS.cyan }} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
              {memberStats.length} {t('memberCount') as string}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{t('topPerformer') as string}</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }} noWrap>{topPerformer?.name || '-'}</Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: alpha(COLORS.amber, 0.1), borderRadius: 2 }}>
                <EmojiEventsIcon sx={{ color: COLORS.amber }} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
              {topPerformer?.completed || 0} {t('tasksCompleted') as string}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Member Comparison Bar Chart */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <BarChartIcon sx={{ color: COLORS.indigo, fontSize: 20 }} />
          <Typography variant="h6" fontWeight={700}>{t('memberComparison') as string}</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {memberStats.map((m, i) => (
            <Box key={m.uid} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={m.photo || undefined} sx={{ width: 28, height: 28, fontSize: 12, bgcolor: FILL_COLORS[i % FILL_COLORS.length] }}>
                {m.name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80, maxWidth: 100 }} noWrap>{m.name}</Typography>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  height: 24, borderRadius: 2,
                  width: `${Math.max((m.completed / maxCompleted) * 100, 4)}%`,
                  background: `linear-gradient(90deg, ${FILL_COLORS[i % FILL_COLORS.length]}, ${alpha(FILL_COLORS[i % FILL_COLORS.length], 0.6)})`,
                  transition: 'width 0.5s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 1,
                }}>
                  <Typography variant="caption" fontWeight={700} color="white" fontSize="0.65rem">
                    {m.completed}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  /{m.total} ({m.rate}%)
                </Typography>
              </Box>
            </Box>
          ))}
          {memberStats.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('noTeamAssigned') as string}</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

// ═══════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════
const WeeklyReports = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { currentMembers, teamGroups, currentWorkspace } = useWorkspace();
  const { tasks: allTasks, loading } = useTasks();
  const isKo = language === 'ko';

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('my');
  const [selectedMemberUid, setSelectedMemberUid] = useState<string>('');
  const [infoOpen, setInfoOpen] = useState(false);

  // Per-page onboarding
  const onboarding = useOnboarding('weeklyReports');
  useEffect(() => {
    if (!loading && onboarding.shouldShowOnboarding()) {
      setInfoOpen(true);
      onboarding.endTour(true); // Mark as shown
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(weekStart, 1);
  const lastWeekEnd = subWeeks(weekEnd, 1);

  // Role detection
  const uid = user?.uid || '';
  const { role, myTeamGroup } = useMemo(
    () => detectRole(uid, currentMembers || [], teamGroups || []),
    [uid, currentMembers, teamGroups],
  );

  const permissions = REPORT_PERMISSIONS[role];
  const roleConfig = ROLE_CONFIG[role];

  // Determine which UIDs this user can view
  const viewableUids = useMemo((): string[] => {
    if (hasRoleLevel(role, 'admin')) {
      return (currentMembers || []).map(m => m.uid);
    }
    if (role === 'maintainer' && myTeamGroup) {
      return myTeamGroup.memberIds;
    }
    return [uid];
  }, [role, currentMembers, myTeamGroup, uid]);

  // Determine which team group member IDs to show in overview
  const teamMemberIds = useMemo((): string[] => {
    if (hasRoleLevel(role, 'admin')) {
      return (currentMembers || []).map(m => m.uid);
    }
    if (role === 'maintainer' && myTeamGroup) {
      return myTeamGroup.memberIds;
    }
    return [uid];
  }, [role, currentMembers, myTeamGroup, uid]);

  // Filter tasks based on view mode & selected member
  const getTasksForUid = (targetUid: string) =>
    allTasks.filter(tk => tk.ownerUids?.includes(targetUid));

  const thisWeekTasksForUid = (targetUid: string) =>
    getTasksForUid(targetUid).filter(tk =>
      isWithinInterval(new Date(tk.createdAt), { start: weekStart, end: weekEnd })
    );

  const lastWeekTasksForUid = (targetUid: string) =>
    getTasksForUid(targetUid).filter(tk =>
      isWithinInterval(new Date(tk.createdAt), { start: lastWeekStart, end: lastWeekEnd })
    );

  // My tasks
  const myThisWeekTasks = useMemo(() => thisWeekTasksForUid(uid), [allTasks, uid, weekStart, weekEnd]);
  const myLastWeekTasks = useMemo(() => lastWeekTasksForUid(uid), [allTasks, uid, lastWeekStart, lastWeekEnd]);

  // Selected member tasks
  const selectedUid = selectedMemberUid || uid;
  const selectedThisWeekTasks = useMemo(() => thisWeekTasksForUid(selectedUid), [allTasks, selectedUid, weekStart, weekEnd]);
  const selectedLastWeekTasks = useMemo(() => lastWeekTasksForUid(selectedUid), [allTasks, selectedUid, lastWeekStart, lastWeekEnd]);
  const selectedMemberName = (currentMembers || []).find(m => m.uid === selectedUid)?.displayName;

  // Navigation
  const goToPrevWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const goToThisWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Can see team?
  const canSeeTeam = permissions.canSeeTeam;
  const canSeeAllMembers = permissions.canSeeAllMembers;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, height: '100%', overflowY: 'auto' }}>

      {/* ── Role Permission Info Dialog ── */}
      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
          <ShieldIcon sx={{ color: COLORS.indigo }} />
          {isKo ? '주간 리포트 접근 권한' : 'Weekly Report Permissions'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            {isKo
              ? '역할에 따라 볼 수 있는 리포트 범위가 다릅니다. 현재 역할: '
              : 'Report visibility varies by role. Current role: '}
            <Chip
              label={isKo ? roleConfig.labelKo : roleConfig.label}
              size="small"
              sx={{ fontWeight: 700, bgcolor: roleConfig.bgColor, color: roleConfig.color, ml: 0.5 }}
            />
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ROLE_HIERARCHY.slice().reverse().map(r => {
              const rc = ROLE_CONFIG[r];
              const rp = REPORT_PERMISSIONS[r];
              const isCurrentRole = r === role;
              return (
                <Paper
                  key={r}
                  elevation={0}
                  sx={{
                    p: 1.5, borderRadius: 2,
                    border: '1px solid',
                    borderColor: isCurrentRole ? rc.color : 'divider',
                    bgcolor: isCurrentRole ? rc.bgColor : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: rc.color }} />
                      <Typography variant="body2" fontWeight={700} sx={{ color: rc.color }}>
                        {isKo ? rc.labelKo : rc.label}
                      </Typography>
                      {isCurrentRole && (
                        <Chip label={isKo ? '현재' : 'You'} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: rc.color, color: 'white' }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {isKo ? rp.reportAccessKo : rp.reportAccess}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ ml: 2.5 }}>
                    {isKo ? rc.descriptionKo : rc.description}
                  </Typography>
                </Paper>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInfoOpen(false)} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: COLORS.indigo }}>
            {isKo ? '확인' : 'Got it'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Header Section */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3, gap: 2 }}>
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

        {/* Role badge + info button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={hasRoleLevel(role, 'maintainer') ? <ShieldIcon sx={{ fontSize: 14 }} /> : <LockIcon sx={{ fontSize: 14 }} />}
            label={isKo ? roleConfig.labelKo : roleConfig.label}
            size="small"
            sx={{
              fontWeight: 700, fontSize: '0.7rem', height: 26,
              bgcolor: roleConfig.bgColor,
              color: roleConfig.color,
              '& .MuiChip-icon': { color: roleConfig.color },
            }}
          />
          {myTeamGroup && (
            <Chip label={myTeamGroup.name} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', height: 24, bgcolor: alpha(myTeamGroup.color || COLORS.blue, 0.1), color: myTeamGroup.color || COLORS.blue }} />
          )}
          <Tooltip title={isKo ? '접근 권한 안내' : 'Permission info'} arrow>
            <IconButton size="small" onClick={() => setInfoOpen(true)} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: COLORS.indigo } }}>
              <InfoOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Report Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' } }}
      >
        <Tab label={t('weeklyReport') as string} />
        <Tab label={t('analytics') as string} />
      </Tabs>

      {activeTab === 1 ? (
        <CycleAnalytics />
      ) : (
        <>
          {/* ── View Mode Tabs (team lead / admin / owner) ── */}
          {canSeeTeam && (
            <Paper elevation={0} sx={{ display: 'flex', gap: 1, p: 1, mb: 3, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              {/* My Report */}
              <Button
                variant={viewMode === 'my' ? 'contained' : 'text'}
                startIcon={<PersonIcon sx={{ fontSize: 16 }} />}
                onClick={() => setViewMode('my')}
                sx={{
                  textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2, px: 2, py: 0.8,
                  bgcolor: viewMode === 'my' ? COLORS.indigo : 'transparent',
                  color: viewMode === 'my' ? 'white' : 'text.secondary',
                  '&:hover': { bgcolor: viewMode === 'my' ? COLORS.indigo : 'action.hover' },
                  boxShadow: viewMode === 'my' ? 2 : 0,
                }}
              >
                {t('myReport') as string}
              </Button>

              {/* Team Overview */}
              <Button
                variant={viewMode === 'teamOverview' ? 'contained' : 'text'}
                startIcon={<GroupIcon sx={{ fontSize: 16 }} />}
                onClick={() => setViewMode('teamOverview')}
                sx={{
                  textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2, px: 2, py: 0.8,
                  bgcolor: viewMode === 'teamOverview' ? COLORS.indigo : 'transparent',
                  color: viewMode === 'teamOverview' ? 'white' : 'text.secondary',
                  '&:hover': { bgcolor: viewMode === 'teamOverview' ? COLORS.indigo : 'action.hover' },
                  boxShadow: viewMode === 'teamOverview' ? 2 : 0,
                }}
              >
                {t('teamOverview') as string}
              </Button>

              {/* Member Detail */}
              <Button
                variant={viewMode === 'memberDetail' ? 'contained' : 'text'}
                startIcon={<BarChartIcon sx={{ fontSize: 16 }} />}
                onClick={() => { setViewMode('memberDetail'); if (!selectedMemberUid) setSelectedMemberUid(viewableUids[0] || uid); }}
                sx={{
                  textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2, px: 2, py: 0.8,
                  bgcolor: viewMode === 'memberDetail' ? COLORS.indigo : 'transparent',
                  color: viewMode === 'memberDetail' ? 'white' : 'text.secondary',
                  '&:hover': { bgcolor: viewMode === 'memberDetail' ? COLORS.indigo : 'action.hover' },
                  boxShadow: viewMode === 'memberDetail' ? 2 : 0,
                }}
              >
                {t('teamMemberReport') as string}
              </Button>

              {/* Member selector (only visible in memberDetail mode) */}
              {viewMode === 'memberDetail' && (
                <FormControl size="small" sx={{ ml: 'auto', minWidth: 160 }}>
                  <InputLabel sx={{ fontSize: '0.8rem' }}>{t('selectMember') as string}</InputLabel>
                  <Select
                    value={selectedMemberUid || viewableUids[0] || ''}
                    label={t('selectMember') as string}
                    onChange={e => setSelectedMemberUid(e.target.value)}
                    sx={{ borderRadius: 2, height: 36, fontSize: '0.8rem' }}
                  >
                    {viewableUids.map(vUid => {
                      const m = (currentMembers || []).find(mem => mem.uid === vUid);
                      return (
                        <MenuItem key={vUid} value={vUid} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={m?.photoURL} sx={{ width: 20, height: 20, fontSize: 10 }}>
                            {(m?.displayName || vUid).charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontSize="0.8rem">{m?.displayName || vUid.slice(0, 6)}</Typography>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            </Paper>
          )}

          {/* ── Render based on view mode ── */}
          {viewMode === 'my' && (
            <ReportContent tasks={myThisWeekTasks} weekStart={weekStart} weekEnd={weekEnd} lastWeekTasks={myLastWeekTasks} t={t as (key: string) => string | string[]} />
          )}

          {viewMode === 'teamOverview' && canSeeTeam && (
            <TeamOverviewContent
              tasks={allTasks}
              memberIds={teamMemberIds}
              members={currentMembers || []}
              weekStart={weekStart}
              weekEnd={weekEnd}
              t={t as (key: string) => string | string[]}
            />
          )}

          {viewMode === 'memberDetail' && canSeeTeam && (
            <ReportContent
              tasks={selectedThisWeekTasks}
              weekStart={weekStart}
              weekEnd={weekEnd}
              lastWeekTasks={selectedLastWeekTasks}
              t={t as (key: string) => string | string[]}
              memberName={selectedMemberName}
            />
          )}

          {/* Fallback for regular members — always show own report */}
          {!canSeeTeam && viewMode !== 'my' && (
            <ReportContent tasks={myThisWeekTasks} weekStart={weekStart} weekEnd={weekEnd} lastWeekTasks={myLastWeekTasks} t={t as (key: string) => string | string[]} />
          )}
        </>
      )}
    </Box>
  );
};

export default WeeklyReports;