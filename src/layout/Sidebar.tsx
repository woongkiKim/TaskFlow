import React, { useState, useEffect, useCallback } from 'react';
import { handleError } from '../utils/errorHandler';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Chip, IconButton,
  Tooltip, Collapse, Menu, MenuItem, alpha, Button
} from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import HubIcon from '@mui/icons-material/Hub';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FolderIcon from '@mui/icons-material/Folder';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import EditAttributesOutlinedIcon from '@mui/icons-material/EditAttributesOutlined';
import EditCalendarOutlinedIcon from '@mui/icons-material/EditCalendarOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GroupIcon from '@mui/icons-material/Group';

import { useLanguage, type TranslationKeys } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { joinWorkspaceByCode } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';
import { fetchUnreadCount } from '../services/notificationService';
import { useCustomViews } from '../hooks/useCustomViews';
import SidebarDialogs from './SidebarDialogs';

export const DRAWER_WIDTH = 280;
export const COLLAPSED_DRAWER_WIDTH = 70;

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  createWsOpen: boolean;
  setCreateWsOpen: (open: boolean) => void;
  joinWsOpen: boolean;
  setJoinWsOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

type SidebarNavItem = {
  textKey: TranslationKeys;
  icon: React.ReactNode;
  path: string;
  protected?: boolean;
  shortcut?: string;
};

type NavGroup = {
  labelEn: string;
  labelKo: string;
  items: SidebarNavItem[];
};

const isMobileQuery = () => window.innerWidth < 900;

const Sidebar = ({
  mobileOpen,
  handleDrawerToggle,
  createWsOpen,
  setCreateWsOpen,
  joinWsOpen,
  setJoinWsOpen,
  collapsed,
  setCollapsed,
}: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const {
    workspaces,
    currentWorkspace, setCurrentWorkspace,
    projects, currentProject, setCurrentProject,
    sprints, currentSprint, setCurrentSprint,
    currentMembers,
    addWorkspace, addProject, addSprint, refreshWorkspaces,
    setCurrentViewMode,
    setActiveViewFilter,
    initiatives, addInitiative,
  } = useWorkspace();

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const myRole = currentMembers.find(m => m.uid === user?.uid)?.role || 'member';
  const canCreateInitiative = myRole === 'owner' || myRole === 'admin';
  const roadmapLabel = lang === 'ko' ? '로드맵' : 'Roadmap';

  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [initiativesExpanded, setInitiativesExpanded] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const [createInitiativeOpen, setCreateInitiativeOpen] = useState(false);

  const [activeCustomViewId, setActiveCustomViewId] = useState<string | null>(null);
  const {
    customViews,
    createViewOpen, setCreateViewOpen,
    editingView, setEditingView,
    deleteConfirmView, setDeleteConfirmView,
    viewMenuAnchor, viewMenuTarget,
    handleCreateOrUpdateView,
    handleDeleteView,
    handleCloseViewMenu,
  } = useCustomViews({
    projectId: currentProject?.id,
    workspaceId: currentWorkspace?.id,
    userId: user?.uid,
    activeCustomViewId,
    setActiveCustomViewId,
    setActiveViewFilter,
    setCurrentViewMode,
  });

  const [sprintsExpanded, setSprintsExpanded] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await fetchUnreadCount(user.uid);
      setUnreadCount(count);
    } catch (e) {
      console.error('Failed to fetch unread count:', e);
    }
  }, [user]);

  const [wsMenuAnchor, setWsMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (!user) return;
      try {
        const count = await fetchUnreadCount(user.uid);
        if (!cancelled) setUnreadCount(count);
      } catch (e) {
        console.error('Failed to fetch unread count:', e);
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  const handleWsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setWsMenuAnchor(event.currentTarget);
  };

  const handleWsMenuClose = () => {
    setWsMenuAnchor(null);
  };

  const closeMobileDrawer = () => {
    if (mobileOpen && isMobileQuery()) handleDrawerToggle();
  };

  const navGroups: NavGroup[] = [
    {
      labelEn: 'CORE', labelKo: '핵심',
      items: [
        { textKey: 'home', icon: <DashboardOutlinedIcon sx={{ fontSize: 20 }} />, path: '/', shortcut: 'G H' },
        { textKey: 'myTasks', icon: <HomeIcon sx={{ fontSize: 20 }} />, path: '/tasks', shortcut: 'G B' },
      ],
    },
    {
      labelEn: 'PLAN & TRACK', labelKo: '계획 & 추적',
      items: [
        { textKey: 'reports', icon: <BarChartIcon sx={{ fontSize: 20 }} />, path: '/reports', shortcut: 'G R' },
        { textKey: 'analytics', icon: <AnalyticsIcon sx={{ fontSize: 20 }} />, path: '/analytics' },
        { textKey: 'okr', icon: <TrackChangesIcon sx={{ fontSize: 20 }} />, path: '/okr' },
        { textKey: 'gantt', icon: <EditCalendarOutlinedIcon sx={{ fontSize: 20 }} />, path: '/gantt' },
        { textKey: 'timeTracking', icon: <TimerOutlinedIcon sx={{ fontSize: 20 }} />, path: '/time-tracking' },
        { textKey: 'workload', icon: <GroupIcon sx={{ fontSize: 20 }} />, path: '/workload' },
        { textKey: 'productivity', icon: <SpeedOutlinedIcon sx={{ fontSize: 20 }} />, path: '/productivity' },
      ],
    },
    {
      labelEn: 'COLLABORATE', labelKo: '협업',
      items: [
        { textKey: 'wiki', icon: <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />, path: '/wiki' },
        { textKey: 'discussions', icon: <ForumOutlinedIcon sx={{ fontSize: 20 }} />, path: '/discussions' },
        { textKey: 'whiteboard', icon: <DrawOutlinedIcon sx={{ fontSize: 20 }} />, path: '/whiteboard' },
      ],
    },
    {
      labelEn: 'CONFIGURE', labelKo: '설정 & 연동',
      items: [
        { textKey: 'automations', icon: <AutoFixHighOutlinedIcon sx={{ fontSize: 20 }} />, path: '/automations', protected: true },
        { textKey: 'integrations', icon: <ExtensionOutlinedIcon sx={{ fontSize: 20 }} />, path: '/integrations', protected: true },
        { textKey: 'customFields', icon: <EditAttributesOutlinedIcon sx={{ fontSize: 20 }} />, path: '/custom-fields', protected: true },
        { textKey: 'publicForms', icon: <ListAltIcon sx={{ fontSize: 20 }} />, path: '/public-forms', protected: true },
        { textKey: 'opsCenter', icon: <HubIcon sx={{ fontSize: 20 }} />, path: '/ops', protected: true },
      ],
    },
  ];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    CORE: true, 'PLAN & TRACK': true, COLLABORATE: true, CONFIGURE: false,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateWs = async (name: string, color: string, type: 'personal' | 'team' | 'organization') => {
    try {
      const ws = await addWorkspace(name, color, type);
      setCurrentWorkspace(ws);
      setCreateWsOpen(false);
    } catch (e) {
      console.error(e);
      handleError(e, { fallbackMessage: t('createWorkspaceFailed') as string });
    }
  };

  const handleCreateProject = async (name: string, color: string, initiativeId?: string) => {
    try {
      const proj = await addProject(name, color, undefined, initiativeId);
      setCurrentProject(proj);
      setCreateProjectOpen(false);
    } catch (e) {
      console.error(e);
      handleError(e, { fallbackMessage: t('createProjectFailed') as string || 'Failed to create project' });
    }
  };

  const handleCreateSprint = async (name: string, type: 'sprint' | 'phase' | 'milestone', startDate?: string, endDate?: string, parentId?: string, linkedIds?: string[]) => {
    try {
      const sp = await addSprint(name, type, startDate, endDate, parentId, linkedIds);
      setCurrentSprint(sp);
      setCreateSprintOpen(false);
    } catch (e) {
      console.error(e);
      handleError(e, { fallbackMessage: t('createSprintFailed') as string });
    }
  };

  const handleJoinWs = async (code: string) => {
    if (!user) return;
    try {
      const ws = await joinWorkspaceByCode(code, {
        uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL,
      });
      if (ws) { await refreshWorkspaces(); setCurrentWorkspace(ws); setJoinWsOpen(false); }
      else handleError(new Error('Invalid invite code'), { fallbackMessage: t('invalidInviteCode') as string });
    } catch (e) {
      console.error(e);
      handleError(e, { fallbackMessage: t('joinWorkspaceFailed') as string });
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        onClick={collapsed ? undefined : handleWsMenuOpen}
        sx={{
          p: collapsed ? 1.5 : 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 1.5,
          cursor: collapsed ? 'default' : 'pointer',
          '&:hover': collapsed ? {} : { bgcolor: 'action.hover' },
          transition: 'all 0.2s ease',
          borderRadius: '0 0 12px 12px',
        }}
      >
        <Tooltip title={collapsed ? (currentWorkspace?.name || 'Workspace') : ''} placement="right">
          <Avatar
            variant="rounded"
            onClick={collapsed ? handleWsMenuOpen : undefined}
            sx={{
              width: 32,
              height: 32,
              bgcolor: currentWorkspace?.color || 'primary.main',
              fontSize: 16,
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }}
          >
            {currentWorkspace ? currentWorkspace.name.charAt(0) : <RocketLaunchIcon sx={{ fontSize: 20, color: 'white' }} />}
          </Avatar>
        </Tooltip>
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} color="text.primary" noWrap sx={{ lineHeight: 1.2 }}>
                {currentWorkspace?.name || 'TaskFlow'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                TaskFlow
              </Typography>
            </Box>
            <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </>
        )}
      </Box>

      <Menu
        anchorEl={wsMenuAnchor}
        open={Boolean(wsMenuAnchor)}
        onClose={handleWsMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
              minWidth: 240, maxWidth: 320, boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('workspaces') as string}
          </Typography>
        </Box>
        {workspaces.map(ws => (
          <MenuItem
            key={ws.id}
            selected={ws.id === currentWorkspace?.id}
            onClick={() => { setCurrentWorkspace(ws); handleWsMenuClose(); }}
            sx={{ gap: 1.5, py: 1, px: 2 }}
          >
            <Avatar sx={{ width: 24, height: 24, bgcolor: ws.color, fontSize: 12, fontWeight: 700 }}>
              {ws.name.charAt(0)}
            </Avatar>
            <ListItemText
              primary={ws.name}
              secondary={ws.type}
              primaryTypographyProps={{ variant: 'body2', fontWeight: ws.id === currentWorkspace?.id ? 700 : 500, noWrap: true }}
              secondaryTypographyProps={{ variant: 'caption', sx: { textTransform: 'capitalize' } }}
            />
          </MenuItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={() => { handleWsMenuClose(); setCreateWsOpen(true); }} sx={{ gap: 1.5, py: 1, px: 2 }}>
          <ListItemIcon sx={{ minWidth: 'auto' }}><AddIcon fontSize="small" color="primary" /></ListItemIcon>
          <Typography variant="body2" fontWeight={500}>{t('createWorkspace') as string}</Typography>
        </MenuItem>
        <MenuItem onClick={() => { handleWsMenuClose(); setJoinWsOpen(true); }} sx={{ gap: 1.5, py: 1, px: 2 }}>
          <ListItemIcon sx={{ minWidth: 'auto' }}><LoginIcon fontSize="small" /></ListItemIcon>
          <Typography variant="body2" fontWeight={500}>{t('joinWorkspace') as string}</Typography>
        </MenuItem>
      </Menu>

      <Box sx={{ px: collapsed ? 1 : 2, mb: 1 }}>
        <Tooltip title={collapsed ? (t('inbox') as string) : ''} placement="right">
          <ListItemButton
            component={NavLink} to="/inbox"
            selected={location.pathname === '/inbox'}
            onClick={() => { closeMobileDrawer(); loadUnreadCount(); }}
            sx={{
              borderRadius: 2, py: 0.8, px: 1.5,
              justifyContent: collapsed ? 'center' : 'flex-start',
              '&.Mui-selected': { bgcolor: alpha('#6366f1', 0.1), '&:hover': { bgcolor: alpha('#6366f1', 0.15) } },
            }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 32 }}>
              <InboxOutlinedIcon sx={{ fontSize: 20, color: location.pathname === '/inbox' ? '#6366f1' : 'text.secondary' }} />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={t('inbox') as string}
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: location.pathname === '/inbox' ? 700 : 500 }}
              />
            )}
            {unreadCount > 0 && !collapsed && (
              <Chip
                label={unreadCount > 99 ? '99+' : unreadCount}
                size="small"
                sx={{
                  height: 20, minWidth: 20, fontWeight: 700, fontSize: '0.65rem',
                  bgcolor: '#6366f1', color: 'white', '& .MuiChip-label': { px: 0.6 },
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <Box sx={{ px: collapsed ? 1 : 2, mb: 1 }}>
        {navGroups.map((group) => {
          const groupKey = group.labelEn;
          const isExpanded = expandedGroups[groupKey] ?? true;
          const filteredItems = group.items.filter(item => {
            if (item.protected && myRole !== 'owner' && myRole !== 'admin') return false;
            return true;
          });
          if (filteredItems.length === 0) return null;

          return (
            <Box key={groupKey} sx={{ mb: 0.5 }}>
              {!collapsed && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, mb: 0.3, mt: 1, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleGroup(groupKey)}
                >
                  {isExpanded
                    ? <ExpandLessIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                    : <ExpandMoreIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                  <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.8 }}>
                    {lang === 'ko' ? group.labelKo : group.labelEn}
                  </Typography>
                </Box>
              )}
              <Collapse in={isExpanded || collapsed}>
                <List dense disablePadding>
                  {filteredItems.map(item => (
                    <ListItem key={item.textKey} disablePadding sx={{ mb: 0.2 }}>
                      <Tooltip
                        title={
                          collapsed ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" fontWeight={600}>{t(item.textKey) as string}</Typography>
                              {item.shortcut && (
                                <Chip
                                  label={item.shortcut}
                                  size="small"
                                  sx={{
                                    height: 16, fontSize: '0.6rem', fontWeight: 800,
                                    bgcolor: 'rgba(255,255,255,0.2)', color: 'white',
                                    borderRadius: 1, '& .MuiChip-label': { px: 0.5 }
                                  }}
                                />
                              )}
                            </Box>
                          ) : ''
                        }
                        placement="right"
                        arrow
                      >
                        <ListItemButton
                          component={NavLink} to={item.path} end={item.path === '/'} selected={location.pathname === item.path}
                          onClick={() => {
                            closeMobileDrawer();
                            if (item.path === '/tasks') { setCurrentProject(null); setCurrentSprint(null); }
                          }}
                          sx={{
                            borderRadius: 1.5, py: 0.6, px: 1.5,
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            '&.active': { bgcolor: 'primary.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } }
                          }}>
                          <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 32, color: location.pathname === item.path ? 'white' : 'text.secondary' }}>
                            {item.icon}
                          </ListItemIcon>
                          {!collapsed && (
                            <ListItemText primary={t(item.textKey)}
                              primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} />
                          )}
                        </ListItemButton>
                      </Tooltip>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ mx: 2, mb: 1 }} />

      <Box sx={{ px: collapsed ? 1 : 2, pt: 1, flex: 1, overflowY: 'auto' }}>
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
            <Box onClick={() => setProjectsExpanded(!projectsExpanded)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
              {projectsExpanded ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('projects') as string}</Typography>
            </Box>
            <IconButton size="small" onClick={() => setCreateProjectOpen(true)} sx={{ p: 0.3 }}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
          </Box>
        )}
        <Collapse in={projectsExpanded || collapsed}>
          <List dense disablePadding>
            {projects.length === 0 && !collapsed && (
              <ListItem disablePadding sx={{ mb: 1, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', opacity: 0.7 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontStyle: 'italic' }}>
                  {t('noProjects') as string}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setCreateProjectOpen(true)}
                  sx={{ py: 0.2, px: 1, fontSize: '0.7rem', textTransform: 'none', borderRadius: 1.5 }}
                >
                  + {t('addProject') as string}
                </Button>
              </ListItem>
            )}
            {projects.map(proj => (
              <ListItem key={proj.id} disablePadding sx={{ mb: 0.2 }}>
                <Tooltip title={collapsed ? proj.name : ''} placement="right">
                  <ListItemButton selected={currentProject?.id === proj.id} onClick={() => { setCurrentProject(proj); navigate('/tasks'); closeMobileDrawer(); }}
                    sx={{ borderRadius: 1.5, py: 0.5, justifyContent: collapsed ? 'center' : 'flex-start', '&.Mui-selected': { bgcolor: proj.color + '18' } }}>
                    <FolderIcon sx={{ fontSize: 16, color: proj.color, mr: collapsed ? 0 : 1.5 }} />
                    {!collapsed && <ListItemText primary={proj.name} primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: currentProject?.id === proj.id ? 600 : 400 }} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Collapse>

        <Box sx={{ px: collapsed ? 0 : 1.2, mt: 1 }}>
          <Tooltip title={collapsed ? roadmapLabel : ''} placement="right">
            <ListItemButton onClick={() => { navigate('/roadmap'); closeMobileDrawer(); }}
              sx={{ borderRadius: 1.5, py: 0.6, justifyContent: collapsed ? 'center' : 'flex-start', bgcolor: location.pathname === '/roadmap' ? 'action.selected' : 'transparent' }}>
              <TimelineIcon sx={{ fontSize: 18, color: 'text.secondary', mr: collapsed ? 0 : 1.5 }} />
              {!collapsed && <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.82rem' }}>{roadmapLabel}</Typography>}
            </ListItemButton>
          </Tooltip>
        </Box>

        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mt: 1.5, mb: 0.5 }}>
            <Box onClick={() => setInitiativesExpanded(!initiativesExpanded)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
              {initiativesExpanded ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('initiatives') || 'INITIATIVES'}</Typography>
            </Box>
            {canCreateInitiative && <IconButton size="small" onClick={() => setCreateInitiativeOpen(true)} sx={{ p: 0.3 }}><AddIcon sx={{ fontSize: 16 }} /></IconButton>}
          </Box>
        )}
        <Collapse in={initiativesExpanded || collapsed}>
          <List dense disablePadding>
            {initiatives.map(init => (
              <ListItem key={init.id} disablePadding sx={{ mb: 0.2 }}>
                <Tooltip title={collapsed ? init.name : ''} placement="right">
                  <ListItemButton onClick={() => { navigate(`/ initiative / ${init.id} `); closeMobileDrawer(); }}
                    sx={{ borderRadius: 1.5, py: 0.5, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: init.color || '#3b82f6', mr: collapsed ? 0 : 1.5 }} />
                    {!collapsed && <ListItemText primary={init.name} primaryTypographyProps={{ fontSize: '0.82rem' }} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Collapse>

        {currentProject && (
          <Box sx={{ mt: 1.5 }}>
            {!collapsed && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
                <Box onClick={() => setSprintsExpanded(!sprintsExpanded)} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
                  {sprintsExpanded ? <ExpandLessIcon sx={{ fontSize: 12, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 12, color: 'text.secondary' }} />}
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.8 }}>{t('sprints')}</Typography>
                </Box>
                <IconButton size="small" onClick={() => setCreateSprintOpen(true)} sx={{ p: 0.3 }}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
            )}
            <Collapse in={sprintsExpanded || collapsed}>
              <List dense disablePadding>
                {sprints.map(sp => {
                  const isSelected = currentSprint?.id === sp.id;
                  return (
                    <ListItem key={sp.id} disablePadding sx={{ mb: 0.1 }}>
                      <Tooltip title={collapsed ? sp.name : ''} placement="right">
                        <ListItemButton selected={isSelected} onClick={() => { setCurrentSprint(isSelected ? null : sp); navigate('/tasks'); closeMobileDrawer(); }}
                          sx={{ borderRadius: 1.5, py: 0.4, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: sp.status === 'active' ? '#6366f1' : '#94a3b8', mr: collapsed ? 0 : 1.2 }} />
                          {!collapsed && <ListItemText primary={sp.name} primaryTypographyProps={{ fontSize: '0.78rem', noWrap: true }} />}
                        </ListItemButton>
                      </Tooltip>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        )}
      </Box>

      <Divider sx={{ mx: 2 }} />
      <Box sx={{ p: 1.5, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
        <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <ArrowBackIcon sx={{ fontSize: 16, transform: collapsed ? 'rotate(180deg)' : 'none' }} />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <>
      <Box component="nav" className="sidebar-transition" sx={{ width: { md: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH }, flexShrink: { md: 0 }, transition: 'width 0.2s' }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent" open
          PaperProps={{ className: 'sidebar-transition' }}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH,
              transition: 'width 0.2s', overflowX: 'hidden'
            }
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      <SidebarDialogs
        createWsOpen={createWsOpen} setCreateWsOpen={setCreateWsOpen} onCreateWs={handleCreateWs}
        joinWsOpen={joinWsOpen} setJoinWsOpen={setJoinWsOpen} onJoinWs={handleJoinWs}
        inviteOpen={inviteOpen} setInviteOpen={setInviteOpen}
        createProjectOpen={createProjectOpen} setCreateProjectOpen={setCreateProjectOpen}
        onCreateProject={handleCreateProject} initiatives={initiatives}
        createSprintOpen={createSprintOpen} setCreateSprintOpen={setCreateSprintOpen}
        onCreateSprint={handleCreateSprint} sprints={sprints}
        customViews={customViews} createViewOpen={createViewOpen} setCreateViewOpen={setCreateViewOpen}
        editingView={editingView} setEditingView={setEditingView} onCreateOrUpdateView={handleCreateOrUpdateView}
        deleteConfirmView={deleteConfirmView} setDeleteConfirmView={setDeleteConfirmView} onDeleteView={handleDeleteView}
        viewMenuAnchor={viewMenuAnchor} viewMenuTarget={viewMenuTarget} onCloseViewMenu={handleCloseViewMenu}
        createInitiativeOpen={createInitiativeOpen} setCreateInitiativeOpen={setCreateInitiativeOpen} onAddInitiative={addInitiative}
      />
    </>
  );
};

export default Sidebar;
