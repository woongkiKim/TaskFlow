// src/pages/WorkloadPage.tsx
import { Box, Typography, Paper, LinearProgress, CircularProgress, Grid } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTasks } from '../hooks/useTasks';
import { useMemo } from 'react';

// Reuse colors from CycleAnalytics
const COLORS = {
  indigo: '#6366f1', blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b',
  red: '#ef4444', violet: '#8b5cf6',
};

export default function WorkloadPage() {
  const { lang } = useLanguage();
  const textByLang = (en: string, ko: string) => (lang === 'ko' ? ko : en);
  const { projects, currentMembers } = useWorkspace();
  const { tasks: allTasks, loading } = useTasks();

  // Per-member workload across ALL projects
  const memberWorkloads = useMemo(() => {
    const map = new Map<string, {
      name: string; photo?: string; assigned: number; completed: number;
      projectBreakdown: Map<string, { name: string; color: string; points: number; done: number }>;
    }>();

    allTasks.forEach(task => {
      const owners = task.ownerUids || [];
      const pts = task.estimate || 1;
      const proj = projects.find(p => p.id === task.projectId);

      owners.forEach((uid: string) => {
        if (!map.has(uid)) {
          const m = currentMembers?.find((mem: { uid: string; displayName: string; photoURL?: string }) => mem.uid === uid);
          map.set(uid, {
            name: m?.displayName || uid.slice(0, 6),
            photo: m?.photoURL,
            assigned: 0,
            completed: 0,
            projectBreakdown: new Map(),
          });
        }
        const entry = map.get(uid)!;
        entry.assigned += pts;
        if (task.completed) entry.completed += pts;

        // Project-level breakdown
        const pId = task.projectId || 'unassigned';
        if (!entry.projectBreakdown.has(pId)) {
          entry.projectBreakdown.set(pId, {
            name: proj?.name || 'Unassigned',
            color: proj?.color || '#94a3b8',
            points: 0,
            done: 0,
          });
        }
        const pb = entry.projectBreakdown.get(pId)!;
        pb.points += pts;
        if (task.completed) pb.done += pts;
      });
    });

    return Array.from(map.entries())
      .map(([uid, d]) => ({
        uid,
        ...d,
        remaining: d.assigned - d.completed,
        utilization: d.assigned > 0 ? Math.round((d.completed / d.assigned) * 100) : 0,
        projectBreakdown: Array.from(d.projectBreakdown.values()),
      }))
      .sort((a, b) => b.assigned - a.assigned);
  }, [allTasks, projects, currentMembers]);

  // Per-project summary
  const projectSummaries = useMemo(() => {
    return projects.map(proj => {
      const projectTasks = allTasks.filter(t => t.projectId === proj.id);
      const total = projectTasks.reduce((s, t) => s + (t.estimate || 1), 0);
      const done = projectTasks.filter(t => t.completed).reduce((s, t) => s + (t.estimate || 1), 0);
      const memberCount = new Set(projectTasks.flatMap(t => t.ownerUids || [])).size;
      return {
        id: proj.id,
        name: proj.name,
        color: proj.color,
        totalPoints: total,
        donePoints: done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        memberCount,
        taskCount: projectTasks.length,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [allTasks, projects]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalAssigned = memberWorkloads.reduce((s, m) => s + m.assigned, 0);
  const totalCompleted = memberWorkloads.reduce((s, m) => s + m.completed, 0);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <GroupIcon sx={{ color: COLORS.indigo, fontSize: 28 }} />
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
          {textByLang('Workload Management', '워크로드 관리')}
        </Typography>
      </Box>

      {/* KPI Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" fontWeight={800} color={COLORS.indigo}>{memberWorkloads.length}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {textByLang('Active Members', '활성 멤버')}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" fontWeight={800} color={COLORS.blue}>{totalAssigned}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {textByLang('Total Points', '총 포인트')}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" fontWeight={800} color={COLORS.emerald}>{totalCompleted}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {textByLang('Completed', '완료')}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h4" fontWeight={800} color={totalAssigned > 0 ? COLORS.amber : 'text.disabled'}>
              {totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0}%
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {textByLang('Overall Progress', '전체 진행률')}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Project Distribution */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        {textByLang('Project Workload Distribution', '프로젝트별 워크로드 분배')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {projectSummaries.map(proj => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={proj.id}>
            <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: proj.color }} />
              <Box sx={{ pl: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>{proj.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <LinearProgress variant="determinate" value={proj.progress}
                    sx={{
                      flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': { bgcolor: proj.color, borderRadius: 3 }
                    }}
                  />
                  <Typography variant="caption" fontWeight={700} color={proj.color}>{proj.progress}%</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {proj.donePoints}/{proj.totalPoints} {textByLang('pts', '포인트')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    👥 {proj.memberCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    📋 {proj.taskCount}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Member Workload Table */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
        {textByLang('Member Workload Overview', '멤버별 워크로드 현황')}
      </Typography>
      <Paper sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {memberWorkloads.map((m, i) => {
          const progressPct = m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0;
          return (
            <Box key={m.uid} sx={{
              display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5,
              borderBottom: i < memberWorkloads.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}>
              {/* Avatar */}
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%', bgcolor: COLORS.indigo,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 14,
                backgroundImage: m.photo ? `url(${m.photo})` : undefined,
                backgroundSize: 'cover',
              }}>
                {!m.photo && m.name.charAt(0).toUpperCase()}
              </Box>

              {/* Name + stats */}
              <Box sx={{ minWidth: 120 }}>
                <Typography variant="body2" fontWeight={700}>{m.name}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {m.completed}/{m.assigned} {textByLang('pts', '포인트')} · {m.remaining} {textByLang('remaining', '남은')}
                </Typography>
              </Box>

              {/* Progress bar */}
              <Box sx={{ flex: 1, mx: 1 }}>
                <LinearProgress variant="determinate" value={progressPct}
                  sx={{
                    height: 8, borderRadius: 4, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: progressPct >= 100 ? COLORS.emerald : progressPct >= 50 ? COLORS.blue : COLORS.amber,
                    }
                  }}
                />
              </Box>

              {/* Percentage */}
              <Typography variant="body2" fontWeight={700} sx={{ minWidth: 45, textAlign: 'right' }}>
                {progressPct}%
              </Typography>

              {/* Project dots */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {m.projectBreakdown.slice(0, 5).map((pb, j) => (
                  <Box key={j} title={`${pb.name}: ${pb.done}/${pb.points}`}
                    sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: pb.color, cursor: 'help' }} />
                ))}
              </Box>
            </Box>
          );
        })}
        {memberWorkloads.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {textByLang('No workload data available. Assign tasks to team members to see their workload.', '워크로드 데이터가 없습니다. 팀원에게 태스크를 배정하면 여기서 확인할 수 있습니다.')}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
