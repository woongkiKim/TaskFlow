import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, Box, TextField, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, Chip, InputAdornment, alpha, useTheme, Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InboxIcon from '@mui/icons-material/Inbox';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import BuildIcon from '@mui/icons-material/Build';
import MapIcon from '@mui/icons-material/Map';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import DescriptionIcon from '@mui/icons-material/Description';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import BarChartIcon from '@mui/icons-material/BarChart';
import ForumIcon from '@mui/icons-material/Forum';
import TimerIcon from '@mui/icons-material/Timer';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ExtensionIcon from '@mui/icons-material/Extension';
import TuneIcon from '@mui/icons-material/Tune';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GitHubIcon from '@mui/icons-material/GitHub';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useThemeMode } from '../contexts/ThemeContext';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'action' | 'navigation' | 'project' | 'initiative';
  action: () => void;
  keywords?: string[];
}

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  onCreateTask?: () => void;
}

const CommandMenu = ({ open, onClose, onCreateTask }: CommandMenuProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const { projects, setCurrentProject, initiatives } = useWorkspace();
  const { lang } = useLanguage();
  const t = (en: string, ko: string) => (lang === 'ko' ? ko : en);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isDark = mode === 'dark';

  const initiativeStatusLabel = (status: string) => {
    if (status === 'planned') return t('Planned', '계획');
    if (status === 'active') return t('Active', '진행 중');
    if (status === 'completed') return t('Completed', '완료');
    return status;
  };

  // ─── Build command items ──────────────────────────────
  const commands: CommandItem[] = useMemo(() => {
    // Quick actions
    const actions: CommandItem[] = [
      {
        id: 'action-create-task',
        label: t('Create New Task', '새 작업 만들기'),
        description: 'C',
        icon: <AddIcon fontSize="small" />,
        category: 'action',
        action: () => { onCreateTask?.(); onClose(); },
        keywords: ['create', 'new', 'task', 'add', '생성', '추가'],
      },
      {
        id: 'action-toggle-theme',
        label: isDark ? t('Switch to Light Mode', '라이트 모드로 전환') : t('Switch to Dark Mode', '다크 모드로 전환'),
        description: isDark ? '☀️' : '🌙',
        icon: isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />,
        category: 'action',
        action: () => { toggleMode(); onClose(); },
        keywords: ['theme', 'dark', 'light', 'mode', '테마', '다크', '라이트'],
      },
      {
        id: 'action-invite',
        label: t('Invite Team Member', '팀원 초대'),
        description: t('Invite via email or link', '이메일 또는 링크로 초대'),
        icon: <PersonAddIcon fontSize="small" />,
        category: 'action',
        action: () => { navigate('/team-settings'); onClose(); },
        keywords: ['invite', 'member', 'team', '초대', '팀원'],
      },
    ];

    // Navigation
    const nav: CommandItem[] = [
      { id: 'nav-home', label: t('Go to Home', '홈으로 이동'), description: t('Dashboard & My Work', '대시보드 및 내 업무'), icon: <DashboardIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/'); onClose(); }, keywords: ['home', 'dashboard', '홈', '대시보드'] },
      { id: 'nav-tasks', label: t('Go to Tasks', '작업으로 이동'), description: t('Board / List / Table', '보드 / 목록 / 테이블'), icon: <DashboardIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/tasks'); onClose(); }, keywords: ['tasks', 'board', 'kanban', '작업', '보드'] },
      { id: 'nav-inbox', label: t('Go to Inbox', '인박스로 이동'), description: t('Notifications & Triage', '알림 및 트리아지'), icon: <InboxIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/inbox'); onClose(); }, keywords: ['inbox', 'notifications', '알림', '인박스'] },
      { id: 'nav-calendar', label: t('Go to Calendar', '캘린더로 이동'), icon: <CalendarTodayIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/calendar'); onClose(); }, keywords: ['calendar', '캘린더'] },
      { id: 'nav-planner', label: t('Go to Weekly Planner', '주간 플래너로 이동'), icon: <ViewWeekIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/planner'); onClose(); }, keywords: ['planner', 'weekly', '주간'] },
      { id: 'nav-reports', label: t('Go to Reports', '리포트로 이동'), icon: <AssessmentIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/reports'); onClose(); }, keywords: ['reports', '리포트'] },
      { id: 'nav-roadmap', label: t('Go to Roadmap', '로드맵으로 이동'), icon: <MapIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/roadmap'); onClose(); }, keywords: ['roadmap', '로드맵'] },
      { id: 'nav-analytics', label: t('Go to Analytics', '분석으로 이동'), icon: <BarChartIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/analytics'); onClose(); }, keywords: ['analytics', '분석'] },
      { id: 'nav-okr', label: t('Go to OKR', 'OKR로 이동'), description: t('Objectives & Key Results', '목표 및 핵심 결과'), icon: <TrackChangesIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/okr'); onClose(); }, keywords: ['okr', 'objectives', '목표'] },
      { id: 'nav-wiki', label: t('Go to Wiki', '위키로 이동'), description: t('Documents & Knowledge base', '문서 및 지식 베이스'), icon: <DescriptionIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/wiki'); onClose(); }, keywords: ['wiki', 'docs', 'documents', '위키', '문서'] },
      { id: 'nav-gantt', label: t('Go to Gantt Chart', '간트 차트로 이동'), icon: <ViewTimelineIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/gantt'); onClose(); }, keywords: ['gantt', 'timeline', '간트'] },
      { id: 'nav-discussions', label: t('Go to Discussions', '토론으로 이동'), icon: <ForumIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/discussions'); onClose(); }, keywords: ['discussions', 'chat', '토론'] },
      { id: 'nav-productivity', label: t('Go to Productivity', '생산성으로 이동'), icon: <TrendingUpIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/productivity'); onClose(); }, keywords: ['productivity', '생산성'] },
      { id: 'nav-time-tracking', label: t('Go to Time Tracking', '시간 추적으로 이동'), icon: <TimerIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/time-tracking'); onClose(); }, keywords: ['time', 'tracking', 'timer', '시간', '추적'] },
      { id: 'nav-automations', label: t('Go to Automations', '자동화로 이동'), icon: <AutoFixHighIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/automations'); onClose(); }, keywords: ['automations', '자동화'] },
      { id: 'nav-integrations', label: t('Go to Integrations', '연동으로 이동'), icon: <ExtensionIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/integrations'); onClose(); }, keywords: ['integrations', 'slack', 'google', '연동'] },
      { id: 'nav-custom-fields', label: t('Go to Custom Fields', '커스텀 필드로 이동'), icon: <TuneIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/custom-fields'); onClose(); }, keywords: ['custom', 'fields', '커스텀', '필드'] },
      { id: 'nav-github', label: t('Go to GitHub', 'GitHub로 이동'), icon: <GitHubIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/github'); onClose(); }, keywords: ['github', 'git', 'code'] },
      { id: 'nav-ops', label: t('Go to Ops Center', 'Ops 센터로 이동'), icon: <BuildIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/ops'); onClose(); }, keywords: ['ops', 'operations'] },
      { id: 'nav-settings', label: t('Go to Settings', '설정으로 이동'), icon: <SettingsIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/settings'); onClose(); }, keywords: ['settings', '설정'] },
      { id: 'nav-team', label: t('Go to Team Settings', '팀 설정으로 이동'), icon: <GroupIcon fontSize="small" />, category: 'navigation', action: () => { navigate('/team-settings'); onClose(); }, keywords: ['team', 'members', '팀'] },
    ];

    // Projects
    const projectItems: CommandItem[] = projects.map(p => ({
      id: `proj-${p.id}`,
      label: p.name,
      description: t('Project', '프로젝트'),
      icon: <FolderIcon fontSize="small" sx={{ color: p.color || '#6366f1' }} />,
      category: 'project' as const,
      action: () => { setCurrentProject(p); navigate('/tasks'); onClose(); },
      keywords: [p.name.toLowerCase()],
    }));

    // Initiatives
    const initiativeItems: CommandItem[] = initiatives.map(i => ({
      id: `init-${i.id}`,
      label: i.name,
      description: `${t('Initiative', '이니셔티브')} · ${initiativeStatusLabel(i.status)}`,
      icon: <RocketLaunchIcon fontSize="small" sx={{ color: i.color || '#3b82f6' }} />,
      category: 'initiative' as const,
      action: () => { navigate(`/initiative/${i.id}`); onClose(); },
      keywords: [i.name.toLowerCase()],
    }));

    return [...actions, ...nav, ...projectItems, ...initiativeItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, initiatives, navigate, onClose, onCreateTask, setCurrentProject, lang, isDark, query]);

  // ─── Filter ───────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.includes(q)),
    );
  }, [query, commands]);

  // ─── Grouping ─────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filtered]);

  const flatList = useMemo(() => filtered, [filtered]);

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => { if (open) { setQuery(''); setSelectedIndex(0); } }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatList[selectedIndex]) {
      e.preventDefault();
      flatList[selectedIndex].action();
    }
  }, [flatList, selectedIndex]);

  const categoryLabels: Record<string, string> = {
    action: t('Quick Actions', '빠른 작업'),
    navigation: t('Navigation', '이동'),
    project: t('Projects', '프로젝트'),
    initiative: t('Initiatives', '이니셔티브'),
  };

  const categoryOrder = ['action', 'navigation', 'project', 'initiative'];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      transitionDuration={150}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: isDark
            ? alpha('#1e293b', 0.85)
            : alpha('#ffffff', 0.82),
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid',
          borderColor: isDark
            ? alpha('#94a3b8', 0.15)
            : alpha('#e2e8f0', 0.8),
          boxShadow: isDark
            ? '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(148,163,184,0.1)'
            : '0 25px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
          mt: '-12vh',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(8px)',
            bgcolor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(15,23,42,0.25)',
          },
        },
      }}
    >
      {/* Search input */}
      <Box sx={{
        px: 2.5, py: 2,
        borderBottom: '1px solid',
        borderColor: isDark ? alpha('#94a3b8', 0.1) : alpha('#e2e8f0', 0.6),
        background: isDark
          ? `linear-gradient(180deg, ${alpha('#334155', 0.4)} 0%, transparent 100%)`
          : `linear-gradient(180deg, ${alpha('#f8fafc', 0.5)} 0%, transparent 100%)`,
      }}>
        <TextField
          fullWidth
          autoFocus
          placeholder={t('Type a command or search tasks...', '명령어 또는 작업을 검색하세요...')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{
                  color: theme.palette.primary.main,
                  mr: 1,
                  fontSize: 22,
                  opacity: 0.8,
                }} />
              </InputAdornment>
            ),
            sx: {
              fontSize: '1rem',
              fontWeight: 500,
              color: 'text.primary',
            },
          }}
        />
      </Box>

      {/* Results */}
      <Box sx={{
        maxHeight: 400,
        overflowY: 'auto',
        py: 0.5,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: alpha(theme.palette.text.primary, 0.1),
          borderRadius: 2,
        },
      }}>
        {flatList.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {t('No results found', '검색 결과가 없습니다')}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              {t('Try searching for tasks, pages, or actions', '작업, 페이지 또는 작업을 검색해 보세요')}
            </Typography>
          </Box>
        ) : (
          categoryOrder
            .filter(cat => grouped[cat]?.length)
            .map(category => (
              <Box key={category} sx={{ mb: 0.5 }}>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  fontWeight={700}
                  sx={{
                    px: 2.5, py: 0.75,
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontSize: '0.65rem',
                  }}
                >
                  {categoryLabels[category] || category}
                </Typography>
                <List dense disablePadding>
                  {grouped[category].map(item => {
                    const globalIdx = flatList.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    return (
                      <ListItemButton
                        key={item.id}
                        selected={isSelected}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        sx={{
                          mx: 1,
                          borderRadius: 2,
                          px: 1.5,
                          py: 0.75,
                          transition: 'all 0.1s ease',
                          '&.Mui-selected': {
                            bgcolor: isDark
                              ? alpha(theme.palette.primary.main, 0.15)
                              : alpha(theme.palette.primary.main, 0.08),
                            '&:hover': {
                              bgcolor: isDark
                                ? alpha(theme.palette.primary.main, 0.2)
                                : alpha(theme.palette.primary.main, 0.12),
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{
                          minWidth: 34,
                          color: isSelected ? theme.palette.primary.main : 'text.secondary',
                          transition: 'color 0.1s ease',
                        }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography fontSize="0.85rem" fontWeight={isSelected ? 600 : 500} sx={{
                              color: isSelected ? 'text.primary' : 'text.primary',
                            }}>
                              {item.label}
                            </Typography>
                          }
                          secondary={item.description && (
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                              {item.description}
                            </Typography>
                          )}
                        />
                        {isSelected && (
                          <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                            px: 0.75, py: 0.25, borderRadius: 1,
                            bgcolor: alpha(theme.palette.text.primary, 0.06),
                          }}>
                            <KeyboardReturnIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                          </Box>
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              </Box>
            ))
        )}
      </Box>

      {/* Footer hints */}
      <Box sx={{
        px: 2.5, py: 1.25,
        borderTop: '1px solid',
        borderColor: isDark ? alpha('#94a3b8', 0.1) : alpha('#e2e8f0', 0.6),
        display: 'flex', alignItems: 'center', gap: 2.5,
        background: isDark
          ? alpha('#0f172a', 0.3)
          : alpha('#f8fafc', 0.4),
      }}>
        {[
          { keys: '↑↓', label: t('Navigate', '이동') },
          { keys: '↵', label: t('Select', '선택') },
          { keys: 'esc', label: t('Close', '닫기') },
        ].map(hint => (
          <Box key={hint.keys} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={hint.keys}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.6rem',
                fontWeight: 700,
                borderColor: alpha(theme.palette.text.primary, 0.12),
                bgcolor: alpha(theme.palette.text.primary, 0.04),
                color: 'text.disabled',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            <Typography variant="caption" color="text.disabled" fontSize="0.68rem">{hint.label}</Typography>
          </Box>
        ))}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.disabled" fontSize="0.65rem" fontWeight={600}>
          TaskFlow
        </Typography>
      </Box>
    </Dialog>
  );
};

export default CommandMenu;
