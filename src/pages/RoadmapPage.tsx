import { useState, useMemo } from 'react';
import { Box, Typography, Paper, Chip, ToggleButton, ToggleButtonGroup, alpha } from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import GanttChart from '../components/GanttChart';
import { useLanguage } from '../contexts/LanguageContext';
import { INITIATIVE_STATUS_CONFIG } from '../types';

const t = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

type ViewMode = 'initiatives' | 'projects' | 'all';

const RoadmapPage = () => {
  const { initiatives, projects } = useWorkspace();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // Categorise initiatives
  const activeInitiatives = useMemo(() => initiatives.filter(i => i.status === 'active' || i.status === 'planned'), [initiatives]);
  const completedInitiatives = useMemo(() => initiatives.filter(i => i.status === 'completed'), [initiatives]);
  const canceledInitiatives = useMemo(() => initiatives.filter(i => i.status === 'canceled'), [initiatives]);

  // Active projects (not completed/paused)
  const activeProjects = useMemo(() => projects.filter(p => p.status === 'active' || p.status === 'planned'), [projects]);

  // Build Gantt items based on view mode
  const ganttItems = useMemo(() => {
    const items: { id: string; name: string; startDate?: string; targetDate?: string; createdAt: string; color: string }[] = [];

    if (viewMode === 'initiatives' || viewMode === 'all') {
      activeInitiatives.forEach(i => {
        items.push({
          id: i.id,
          name: i.name,
          startDate: i.startDate || i.createdAt,
          targetDate: i.targetDate,
          createdAt: i.createdAt,
          color: i.color || '#3b82f6',
        });
      });
    }

    if (viewMode === 'projects' || viewMode === 'all') {
      activeProjects.forEach(p => {
        items.push({
          id: p.id,
          name: p.name,
          startDate: p.startDate || p.createdAt,
          targetDate: p.targetDate,
          createdAt: p.createdAt,
          color: p.color || '#6366f1',
        });
      });
    }

    return items;
  }, [viewMode, activeInitiatives, activeProjects]);

  const handleGanttClick = (item: { id: string }) => {
    // Check if it's an initiative or project
    const isInitiative = initiatives.some(i => i.id === item.id);
    if (isInitiative) {
      navigate(`/initiative/${item.id}`);
    } else {
      navigate(`/project/${item.id}`);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    totalInitiatives: initiatives.length,
    active: activeInitiatives.length,
    completed: completedInitiatives.length,
    totalProjects: projects.length,
  }), [initiatives, activeInitiatives, completedInitiatives, projects]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, flex: 1, overflow: 'auto', bgcolor: 'background.default', minHeight: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <RocketLaunchIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: -1 }}>
            {t(lang, 'Roadmap', '로드맵')}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {t(lang, 'High-level overview of all initiatives and projects with their timelines.',
                   '모든 이니셔티브와 프로젝트의 일정을 한눈에 볼 수 있는 로드맵입니다.')}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2, mb: 3 }}>
        {[
          { label: t(lang, 'Initiatives', '이니셔티브'), value: stats.totalInitiatives, color: '#6366f1' },
          { label: t(lang, 'Active', '진행/계획'), value: stats.active, color: '#3b82f6' },
          { label: t(lang, 'Completed', '완료'), value: stats.completed, color: '#10b981' },
          { label: t(lang, 'Projects', '프로젝트'), value: stats.totalProjects, color: '#f59e0b' },
        ].map((s, i) => (
          <Paper key={i} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* View Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {t(lang, 'Timeline', '타임라인')}
        </Typography>
        <ToggleButtonGroup
          value={viewMode} exclusive size="small"
          onChange={(_e, v) => { if (v) setViewMode(v); }}
          sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', px: 2 } }}
        >
          <ToggleButton value="all">{t(lang, 'All', '전체')}</ToggleButton>
          <ToggleButton value="initiatives">{t(lang, 'Initiatives', '이니셔티브')}</ToggleButton>
          <ToggleButton value="projects">{t(lang, 'Projects', '프로젝트')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Gantt Chart */}
      {ganttItems.length > 0 ? (
        <GanttChart items={ganttItems} onItemClick={handleGanttClick} />
      ) : (
        <Paper sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', bgcolor: 'transparent', borderRadius: 3 }}>
          <RocketLaunchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" fontWeight={600} color="text.secondary">
            {t(lang, 'No items to display', '표시할 항목이 없습니다')}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {t(lang, 'Create initiatives or projects to see them on the roadmap.',
                     '이니셔티브나 프로젝트를 만들면 로드맵에 표시됩니다.')}
          </Typography>
        </Paper>
      )}

      {/* Completed Initiatives */}
      {completedInitiatives.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CheckCircleIcon sx={{ fontSize: 20, color: '#10b981' }} />
            <Typography variant="subtitle1" fontWeight={700}>
              {t(lang, 'Completed', '완료됨')} ({completedInitiatives.length})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {completedInitiatives.map(i => {
              const cfg = INITIATIVE_STATUS_CONFIG[i.status];
              return (
                <Chip
                  key={i.id}
                  icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                  label={`${i.name}${i.targetDate ? ` (${i.targetDate})` : ''}`}
                  onClick={() => navigate(`/initiative/${i.id}`)}
                  sx={{
                    bgcolor: alpha(cfg.color, 0.1), color: cfg.color,
                    border: `1px solid ${alpha(cfg.color, 0.3)}`,
                    fontWeight: 600, cursor: 'pointer',
                    '&:hover': { bgcolor: alpha(cfg.color, 0.2) },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Canceled Initiatives */}
      {canceledInitiatives.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CancelIcon sx={{ fontSize: 20, color: '#ef4444' }} />
            <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
              {t(lang, 'Canceled', '취소됨')} ({canceledInitiatives.length})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {canceledInitiatives.map(i => (
              <Chip
                key={i.id}
                icon={<CancelIcon sx={{ fontSize: 16 }} />}
                label={i.name}
                variant="outlined"
                sx={{ color: 'text.disabled', borderColor: 'divider', fontWeight: 500, textDecoration: 'line-through' }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RoadmapPage;
