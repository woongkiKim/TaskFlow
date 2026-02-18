import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Chip, IconButton, Menu, MenuItem,
  AvatarGroup, Tooltip, Collapse,
} from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import HubIcon from '@mui/icons-material/Hub';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FolderIcon from '@mui/icons-material/Folder';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import TableChartIcon from '@mui/icons-material/TableChart';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import TimelineIcon from '@mui/icons-material/Timeline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { joinWorkspaceByCode } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';
import { fetchUnreadCount } from '../services/notificationService';
import type { CustomView } from '../types';
import { useCustomViews } from '../hooks/useCustomViews';
import type { TranslationKeys } from '../locales/en';
import SidebarDialogs from './SidebarDialogs';

export const DRAWER_WIDTH = 280;

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}



// Media query matches md breakpoint (900px) ??mobile when below
const isMobileQuery = () => window.innerWidth < 900;

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const {
    workspaces, currentWorkspace, setCurrentWorkspace,
    teamGroups, currentTeamGroup, setCurrentTeamGroup,
    projects, currentProject, setCurrentProject,
    sprints, currentSprint, setCurrentSprint,
    currentMembers,
    addWorkspace, addProject, addSprint, refreshWorkspaces,
    currentViewMode, setCurrentViewMode,
    setActiveViewFilter,
    initiatives, addInitiative,
  } = useWorkspace();

  const [wsMenuAnchor, setWsMenuAnchor] = useState<null | HTMLElement>(null);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [joinWsOpen, setJoinWsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const myRole = currentMembers.find(m => m.uid === user?.uid)?.role || 'member';
  const canCreateInitiative = myRole === 'owner' || myRole === 'admin';
  const roadmapLabel = lang === 'ko' ? '\uB85C\uB4DC\uB9F5' : 'Roadmap';
  const noInitiativesLabel = lang === 'ko' ? '\uC774\uB2C8\uC2DC\uC5D0\uC774\uD2F0\uBE0C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4' : 'No initiatives';

  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [initiativesExpanded, setInitiativesExpanded] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [createInitiativeOpen, setCreateInitiativeOpen] = useState(false);


  // Custom Views (managed by dedicated hook — avoids synchronous setState in useEffect)
  const [activeCustomViewId, setActiveCustomViewId] = useState<string | null>(null);
  const {
    customViews,
    createViewOpen, setCreateViewOpen,
    editingView, setEditingView,
    deleteConfirmView, setDeleteConfirmView,
    viewMenuAnchor, viewMenuTarget,
    handleCreateOrUpdateView,
    handleDeleteView,
    handleOpenViewMenu,
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

  // Collapsible sections
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const [myViewsExpanded, setMyViewsExpanded] = useState(true);
  const [sprintsExpanded, setSprintsExpanded] = useState(true);

  // Fetch unread notification count
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await fetchUnreadCount(user.uid);
      setUnreadCount(count);
    } catch (e) {
      console.error('Failed to fetch unread count:', e);
    }
  }, [user]);

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


  const handleApplyView = (view: CustomView) => {
    if (activeCustomViewId === view.id) {
      // Toggle off
      setActiveCustomViewId(null);
      setActiveViewFilter(null);
    } else {
      setActiveCustomViewId(view.id);
      if (view.viewMode) setCurrentViewMode(view.viewMode as 'list' | 'board' | 'calendar' | 'table');
      setActiveViewFilter(view.filters);
    }
    navigate('/');
    closeMobileDrawer();
  };

  // Close the mobile drawer after a navigation action
  const closeMobileDrawer = () => {
    if (mobileOpen && isMobileQuery()) handleDrawerToggle();
  };

  // nav items ??dashboard path set to '/' to match route
  // "My Tasks" (formerly Dashboard) should clear project/sprint
  // Weekly planner is accessed via Calendar ??Week tab, no separate nav entry needed
  const navItems = [
    { textKey: 'myTasks' as TranslationKeys, icon: <HomeIcon sx={{ fontSize: 20 }} />, path: '/' },
    { textKey: 'reports' as TranslationKeys, icon: <BarChartIcon sx={{ fontSize: 20 }} />, path: '/reports' },
    { textKey: 'opsCenter' as TranslationKeys, icon: <HubIcon sx={{ fontSize: 20 }} />, path: '/ops' },
    { textKey: 'teamSettings' as TranslationKeys, icon: <GroupsIcon sx={{ fontSize: 20 }} />, path: '/team-settings' },
  ];

  // handlers
  const handleCreateWs = async (name: string, color: string, type: 'personal' | 'team' | 'organization') => {
    try {
      const ws = await addWorkspace(name, color, type);
      setCurrentWorkspace(ws);
      setCreateWsOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(t('createWorkspaceFailed') as string);
    }
  };

  const handleCreateProject = async (name: string, color: string, initiativeId?: string) => {
    try {
      const proj = await addProject(name, color, currentTeamGroup?.id, initiativeId);
      setCurrentProject(proj);
      setCreateProjectOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(t('createProjectFailed') as string || 'Failed to create project');
    }
  };

  const handleCreateSprint = async (name: string, type: 'sprint' | 'phase' | 'milestone', startDate?: string, endDate?: string, parentId?: string, linkedIds?: string[]) => {
    try {
      const sp = await addSprint(name, type, startDate, endDate, parentId, linkedIds);
      setCurrentSprint(sp);
      setCreateSprintOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(t('createSprintFailed') as string);
    }
  };

  const handleJoinWs = async (code: string) => {
    if (!user) return;
    try {
      const ws = await joinWorkspaceByCode(code, {
        uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL,
      });
      if (ws) { await refreshWorkspaces(); setCurrentWorkspace(ws); setJoinWsOpen(false); }
      else toast.error(t('invalidInviteCode') as string);
    } catch (e) {
      console.error(e);
      toast.error(t('joinWorkspaceFailed') as string);
    }
  };

  // Drawer content (pure layout)
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <RocketLaunchIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ flex: 1 }}>TaskFlow</Typography>
      </Box>

      {/* Inbox ??Linear-style top navigation */}
      <Box sx={{ px: 2, mb: 1 }}>
        <ListItemButton
          component={NavLink} to="/inbox"
          selected={location.pathname === '/inbox'}
          onClick={() => { closeMobileDrawer(); loadUnreadCount(); }}
          sx={{
            borderRadius: 2, py: 0.8, px: 1.5,
            '&.Mui-selected': {
              bgcolor: 'rgba(99,102,241,0.1)',
              '&:hover': { bgcolor: 'rgba(99,102,241,0.15)' },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <InboxOutlinedIcon sx={{ fontSize: 20, color: location.pathname === '/inbox' ? '#6366f1' : 'text.secondary' }} />
          </ListItemIcon>
          <ListItemText
            primary={t('inbox') as string}
            primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: location.pathname === '/inbox' ? 700 : 500 }}
          />
          {unreadCount > 0 && (
            <Chip
              label={unreadCount > 99 ? '99+' : unreadCount}
              size="small"
              sx={{
                height: 20, minWidth: 20, fontWeight: 700, fontSize: '0.65rem',
                bgcolor: '#6366f1', color: 'white',
                '& .MuiChip-label': { px: 0.6 },
              }}
            />
          )}
        </ListItemButton>
      </Box>

      <Divider sx={{ mx: 2, mb: 1 }} />

      {/* Workspace Selector */}
      <Box sx={{ px: 2, mb: 1 }}>
        <Box
          role="button"
          tabIndex={0}
          onClick={e => setWsMenuAnchor(e.currentTarget)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWsMenuAnchor(e.currentTarget as HTMLElement); } }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
            borderRadius: 2, cursor: 'pointer', border: '1px solid', borderColor: 'divider',
            '&:hover': { bgcolor: 'action.hover' },
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: currentWorkspace?.color || '#6366f1', fontSize: 14, fontWeight: 700 }}>
            {currentWorkspace?.name?.charAt(0) || 'W'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{currentWorkspace?.name || 'Workspace'}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label={currentWorkspace?.type || 'personal'} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700 }} />
              <Typography variant="caption" color="text.secondary">{currentMembers.length} {t('members') as string}</Typography>
            </Box>
          </Box>
          <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Box>

        <Menu anchorEl={wsMenuAnchor} open={Boolean(wsMenuAnchor)} onClose={() => setWsMenuAnchor(null)}
          slotProps={{ paper: { sx: { maxWidth: 260, borderRadius: 2 } } }}>
          {workspaces.map(ws => (
            <MenuItem key={ws.id} selected={ws.id === currentWorkspace?.id}
              onClick={() => { setCurrentWorkspace(ws); setWsMenuAnchor(null); }}>
              <Avatar sx={{ width: 24, height: 24, bgcolor: ws.color, fontSize: 12, mr: 1.5 }}>{ws.name.charAt(0)}</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={500}>{ws.name}</Typography>
                <Typography variant="caption" color="text.secondary">{ws.type}</Typography>
              </Box>
            </MenuItem>
          ))}
          <Divider />
          <MenuItem onClick={() => { setWsMenuAnchor(null); setCreateWsOpen(true); }}>
            <AddIcon sx={{ fontSize: 20, mr: 1.5, color: 'primary.main' }} />
            <Typography variant="body2" color="primary" fontWeight={500}>{t('createWorkspace') as string}</Typography>
          </MenuItem>
          <MenuItem onClick={() => { setWsMenuAnchor(null); setJoinWsOpen(true); }}>
            <LoginIcon sx={{ fontSize: 20, mr: 1.5, color: 'text.secondary' }} />
            <Typography variant="body2" fontWeight={500}>{t('joinWorkspace') as string}</Typography>
          </MenuItem>
        </Menu>
      </Box>

      {/* Members + Invite */}
      {currentWorkspace && currentMembers.length > 0 && (
        <Box sx={{ px: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, pl: 3.5 }}>
          <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 22, height: 22, fontSize: 10 } }}>
            {currentMembers.map(m => (
              <Tooltip key={m.uid} title={m.displayName}>
                <Avatar src={m.photoURL} sx={{ bgcolor: 'primary.main' }}>{m.displayName.charAt(0)}</Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          <Box sx={{ flex: 1 }} />
          <Tooltip title={t('inviteMembers') as string}>
            <IconButton size="small" onClick={() => setInviteOpen(true)}>
              <PersonAddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}



      {/* Team Groups (org only) */}
      {currentWorkspace?.type === 'organization' && teamGroups.length > 0 && (
        <Box sx={{ px: 2, pt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ px: 1 }}>{t('teamGroups') as string}</Typography>
          <List dense disablePadding sx={{ mt: 0.5 }}>
            {teamGroups.map(tg => (
              <ListItem key={tg.id} disablePadding>
                <ListItemButton selected={currentTeamGroup?.id === tg.id}
                  onClick={() => setCurrentTeamGroup(tg)}
                  sx={{ borderRadius: 1.5, py: 0.6, '&.Mui-selected': { bgcolor: tg.color + '18' } }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: tg.color, mr: 1.5 }} />
                  <ListItemText primary={tg.name} primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: currentTeamGroup?.id === tg.id ? 600 : 400 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ mt: 1 }} />
        </Box>
      )}

      {/* Projects */}
      <Box data-tour="sidebar-projects" sx={{ px: 2, pt: 1.5, flex: 1, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
          <Box role="button" tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }} onClick={() => setProjectsExpanded(!projectsExpanded)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProjectsExpanded(!projectsExpanded); } }}>
            {projectsExpanded ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('projects') as string}</Typography>
          </Box>
          <IconButton size="small" onClick={() => setCreateProjectOpen(true)} sx={{ p: 0.3 }}>
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <Collapse in={projectsExpanded}>
          <List dense disablePadding>
            {projects.map(proj => (
              <ListItem key={proj.id} disablePadding sx={{ mb: 0.3 }}>
                <ListItemButton selected={currentProject?.id === proj.id} onClick={() => { setCurrentProject(proj); navigate('/'); closeMobileDrawer(); }}
                  sx={{ borderRadius: 1.5, py: 0.7, '&.Mui-selected': { bgcolor: proj.color + '18', '&:hover': { bgcolor: proj.color + '25' } } }}>
                  <FolderIcon sx={{ fontSize: 16, color: proj.color, mr: 1.5 }} />
                  <ListItemText primary={proj.name}
                    primaryTypographyProps={{ fontSize: '0.83rem', fontWeight: currentProject?.id === proj.id ? 600 : 400 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Roadmap Link */}
        <Box sx={{ px: 2, mt: 1 }}>
          <Box
            onClick={() => { navigate('/roadmap'); if (mobileOpen) handleDrawerToggle(); }}
            sx={{
              display: 'flex', alignItems: 'center', p: 1, borderRadius: 1.5, cursor: 'pointer',
              bgcolor: location.pathname === '/roadmap' ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <TimelineIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1.5 }} />
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontSize: '0.85rem' }}>{roadmapLabel}</Typography>
          </Box>
        </Box>

        {/* Initiatives */}
        <Box sx={{ px: 2, pt: 1.5, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
            <Box role="button" tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }} onClick={() => setInitiativesExpanded(!initiativesExpanded)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInitiativesExpanded(!initiativesExpanded); } }}>
              {initiativesExpanded ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
              <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('initiatives') || 'INITIATIVES'}</Typography>
            </Box>
            {canCreateInitiative && (
              <IconButton size="small" onClick={() => setCreateInitiativeOpen(true)} sx={{ p: 0.3 }}>
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
          <Collapse in={initiativesExpanded}>
            <List dense disablePadding>
              {initiatives.map(init => (
                <ListItem key={init.id} disablePadding sx={{ mb: 0.3 }}>
                  <ListItemButton
                    // For now, initiatives don't have a dedicated page, maybe just filter projects?
                    // We'll leave onclick empty or maybe set a filter later
                    onClick={() => {
                      navigate(`/initiative/${init.id}`);
                      closeMobileDrawer();
                    }}
                    sx={{ borderRadius: 1.5, py: 0.7 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: init.color || '#3b82f6', mr: 1.5 }} />
                    <ListItemText primary={init.name} primaryTypographyProps={{ fontSize: '0.83rem' }} />
                  </ListItemButton>
                </ListItem>
              ))}
              {initiatives.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>
                  {noInitiativesLabel}
                </Typography>
              )}
            </List>
          </Collapse>
        </Box>

        {/* View Navigation + Sprint Selector (Linear/Jira style) */}
        {currentProject && (
          <>
            {/* View Navigation */}
            <Box data-tour="sidebar-views" sx={{ px: 2, mt: 1 }}>
              <Box role="button" tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, mb: 0.3, cursor: 'pointer' }} onClick={() => setViewsExpanded(!viewsExpanded)}>
                {viewsExpanded ? <ExpandLessIcon sx={{ fontSize: 12, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 12, color: 'text.secondary' }} />}
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.8 }}>
                  {t('views') as string || 'Views'}
                </Typography>
              </Box>
              <Collapse in={viewsExpanded}>
                <List dense disablePadding>
                  {[
                    { key: 'list', icon: <FormatListBulletedIcon sx={{ fontSize: 17 }} />, label: t('listView') as string },
                    { key: 'board', icon: <ViewKanbanIcon sx={{ fontSize: 17 }} />, label: t('boardView') as string },
                    { key: 'calendar', icon: <CalendarMonthIcon sx={{ fontSize: 17 }} />, label: t('calendarView') as string },
                    { key: 'table', icon: <TableChartIcon sx={{ fontSize: 17 }} />, label: t('tableView') as string },
                  ].map(v => (
                    <ListItem key={v.key} disablePadding sx={{ mb: 0.2 }}>
                      <ListItemButton
                        selected={currentViewMode === v.key}
                        onClick={() => { setCurrentViewMode(v.key as 'list' | 'board' | 'calendar' | 'table'); navigate('/'); closeMobileDrawer(); }}
                        sx={{
                          borderRadius: 1.5, py: 0.6,
                          '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } },
                        }}>
                        <ListItemIcon sx={{ minWidth: 30, color: currentViewMode === v.key ? 'white' : 'text.secondary' }}>
                          {v.icon}
                        </ListItemIcon>
                        <ListItemText primary={v.label}
                          primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: currentViewMode === v.key ? 600 : 400 }} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>

                {/* My Views ??saved filters */}
                {customViews.length > 0 && (
                  <Box data-tour="sidebar-custom-views" sx={{ mt: 1 }}>
                    <Box role="button" tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, mb: 0.3, cursor: 'pointer' }} onClick={() => setMyViewsExpanded(!myViewsExpanded)}>
                      {myViewsExpanded ? <ExpandLessIcon sx={{ fontSize: 12, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 12, color: 'text.secondary' }} />}
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.8 }}>
                        {t('myViews') as string || 'My Views'}
                      </Typography>
                    </Box>
                    <Collapse in={myViewsExpanded}>
                      <List dense disablePadding>
                        {customViews.map(view => {
                          const isActive = activeCustomViewId === view.id;
                          return (
                            <ListItem key={view.id} disablePadding sx={{ mb: 0.2, '&:hover .view-actions': { opacity: 1 } }}>
                              <ListItemButton
                                selected={isActive}
                                onClick={() => handleApplyView(view)}
                                sx={{
                                  borderRadius: 1.5, py: 0.5,
                                  '&.Mui-selected': { bgcolor: view.color + '15', '&:hover': { bgcolor: view.color + '20' } },
                                }}>
                                <Typography sx={{ fontSize: '0.9rem', mr: 0.8, lineHeight: 1 }}>{view.icon}</Typography>
                                <ListItemText primary={view.name}
                                  primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400, color: isActive ? view.color : 'text.primary' }} />
                                {/* Filter count badge */}
                                {(() => {
                                  const fc = Object.values(view.filters).filter(v => v !== undefined && v !== false && (Array.isArray(v) ? v.length > 0 : true)).length;
                                  return fc > 0 ? (
                                    <Chip label={fc} size="small" sx={{ height: 16, minWidth: 16, fontWeight: 700, fontSize: '0.55rem', bgcolor: view.color + '20', color: view.color }} />
                                  ) : null;
                                })()}
                                <IconButton className="view-actions" size="small"
                                  onClick={(e) => handleOpenViewMenu(e, view)}
                                  sx={{ opacity: 0, transition: 'opacity 0.15s', p: 0.3, ml: 0.3 }}>
                                  <MoreVertIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                </IconButton>
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  </Box>
                )}

                {/* Add View button */}
                <Box sx={{ mt: 0.5, px: 1 }}>
                  <ListItemButton onClick={() => { setEditingView(null); setCreateViewOpen(true); }}
                    sx={{ borderRadius: 1.5, py: 0.4, justifyContent: 'center', border: '1px dashed', borderColor: 'divider' }}>
                    <BookmarkBorderIcon sx={{ fontSize: 14, color: 'text.disabled', mr: 0.5 }} />
                    <Typography variant="caption" color="text.disabled" fontWeight={500} sx={{ fontSize: '0.72rem' }}>
                      {t('saveCurrentFilter') as string || 'Save as View'}
                    </Typography>
                  </ListItemButton>
                </Box>
              </Collapse>
            </Box>

            <Divider sx={{ mx: 2, my: 1 }} />

            {/* Sprint Selector ??collapsible */}
            <Box data-tour="sidebar-sprints" sx={{ px: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 0.5 }}>
                <Box role="button" tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={() => setSprintsExpanded(!sprintsExpanded)}>
                  {sprintsExpanded ? <ExpandLessIcon sx={{ fontSize: 12, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 12, color: 'text.secondary' }} />}
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 0.8 }}>
                    {t('sprints') as string}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                  <IconButton size="small" onClick={() => setHideCompleted(!hideCompleted)} sx={{ p: 0.3 }}>
                    <Tooltip title={hideCompleted ? (t('showCompleted') as string) : (t('hideCompleted') as string)} arrow>
                      <Typography sx={{ fontSize: 12, color: hideCompleted ? 'primary.main' : 'text.disabled', cursor: 'pointer' }}>{hideCompleted ? '\u25C9' : '\u25CE'}</Typography>
                    </Tooltip>
                  </IconButton>
                  <IconButton size="small" onClick={() => setCreateSprintOpen(true)} sx={{ p: 0.3 }}>
                    <AddIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>

              <Collapse in={sprintsExpanded}>
                <List dense disablePadding>
                  {(() => {
                    const visibleSprints = hideCompleted ? sprints.filter(s => s.status !== 'completed') : sprints;
                    const activeSprints = visibleSprints.filter(s => s.type === 'sprint');
                    const phases = visibleSprints.filter(s => s.type === 'phase');
                    const milestones = visibleSprints.filter(s => s.type === 'milestone');

                    if (visibleSprints.length === 0 && !hideCompleted) {
                      return (
                        <Box sx={{ py: 2, px: 1, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary">{t('noSprints') as string}</Typography>
                        </Box>
                      );
                    }

                    const renderSprintItem = (sp: typeof sprints[0]) => {
                      const isSelected = currentSprint?.id === sp.id;
                      const dotColor = sp.status === 'active'
                        ? (sp.type === 'milestone' ? '#ef4444' : sp.type === 'phase' ? '#10b981' : '#6366f1')
                        : sp.status === 'completed' ? '#22c55e' : '#94a3b8';
                      return (
                        <ListItem key={sp.id} disablePadding sx={{ mb: 0.2 }}>
                          <ListItemButton
                            selected={isSelected}
                            onClick={() => { setCurrentSprint(isSelected ? null : sp); navigate('/'); closeMobileDrawer(); }}
                            sx={{
                              borderRadius: 1.5, py: 0.4, minHeight: 32,
                              opacity: sp.status === 'completed' ? 0.55 : 1,
                              '&.Mui-selected': { bgcolor: 'rgba(99,102,241,0.1)', '&:hover': { bgcolor: 'rgba(99,102,241,0.15)' } },
                            }}>
                            {/* Status dot */}
                            <Box sx={{
                              width: 7, height: 7, borderRadius: '50%', bgcolor: dotColor, mr: 1.2, flexShrink: 0,
                              ...(sp.status === 'active' && {
                                animation: 'pulse-dot 2s ease-in-out infinite',
                                '@keyframes pulse-dot': {
                                  '0%, 100%': { opacity: 1 },
                                  '50%': { opacity: 0.4 },
                                },
                              }),
                            }} />
                            <ListItemText
                              primary={sp.name}
                              primaryTypographyProps={{
                                fontSize: '0.78rem', fontWeight: isSelected ? 600 : 400,
                                sx: sp.status === 'completed' ? { textDecoration: 'line-through' } : {},
                                noWrap: true,
                              }}
                            />
                            {sp.type === 'phase' && (
                              <Chip label="P" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.15)', color: '#10b981', minWidth: 20 }} />
                            )}
                          </ListItemButton>
                        </ListItem>
                      );
                    };

                    return (
                      <>
                        {/* Active sprints first */}
                        {activeSprints.map(sp => renderSprintItem(sp))}

                        {/* Phases with children */}
                        {phases.length > 0 && (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1, pt: 0.8, pb: 0.3 }}>
                              <Box sx={{ width: 3, height: 10, borderRadius: 1, bgcolor: '#10b981' }} />
                              <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Phases
                              </Typography>
                            </Box>
                            {phases.map(phase => {
                              const children = visibleSprints.filter(s => s.type === 'sprint' && s.parentId === phase.id);
                              return (
                                <Box key={phase.id}>
                                  {renderSprintItem(phase)}
                                  {children.length > 0 && (
                                    <Box sx={{ ml: 2.5, borderLeft: '1.5px solid rgba(16,185,129,0.25)', pl: 0.3 }}>
                                      {children.map(child => renderSprintItem(child))}
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </>
                        )}

                        {/* Milestones */}
                        {milestones.length > 0 && (
                          <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1, pt: 0.8, pb: 0.3 }}>
                              <Box sx={{ width: 3, height: 10, borderRadius: 1, bgcolor: '#ef4444' }} />
                              <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Milestones
                              </Typography>
                            </Box>
                            {milestones.map(ms => renderSprintItem(ms))}
                          </>
                        )}

                        {/* Backlog */}
                        <Box sx={{ mt: 0.5, borderTop: '1px solid', borderColor: 'divider', pt: 0.5 }}>
                          <ListItem disablePadding>
                            <ListItemButton selected={currentSprint === null && sprints.length > 0} onClick={() => { setCurrentSprint(null); navigate('/'); closeMobileDrawer(); }}
                              sx={{ borderRadius: 1.5, py: 0.4, '&.Mui-selected': { bgcolor: 'rgba(100,116,139,0.1)' } }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ pl: 0.5, display: 'flex', alignItems: 'center', gap: 0.8, fontSize: '0.78rem' }}>
                                ?벀 {t('backlog') as string}
                              </Typography>
                            </ListItemButton>
                          </ListItem>
                        </Box>
                      </>
                    );
                  })()}
                </List>
              </Collapse>
            </Box>
          </>
        )}
      </Box>

      <Divider sx={{ mx: 2 }} />

      {/* Bottom Nav */}
      <List sx={{ px: 2, py: 1 }}>
        {navItems.map(item => (
          <ListItem key={item.textKey} disablePadding sx={{ mb: 0.3 }}>
            <ListItemButton component={NavLink} to={item.path} end={item.path === '/'} selected={location.pathname === item.path}
              onClick={() => {
                closeMobileDrawer();
                if (item.path === '/') {
                  setCurrentProject(null);
                  setCurrentSprint(null);
                }
              }}
              sx={{
                borderRadius: 1.5, py: 0.8,
                '&.active': { bgcolor: 'primary.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } }
              }}>
              <ListItemIcon sx={{ minWidth: 36, color: location.pathname === item.path ? 'white' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={t(item.textKey) as string}
                primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH } }}>
          {drawerContent}
        </Drawer>
        <Drawer variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider' } }}
          open>
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
        customViews={customViews}
        createViewOpen={createViewOpen} setCreateViewOpen={setCreateViewOpen}
        editingView={editingView} setEditingView={setEditingView}
        onCreateOrUpdateView={handleCreateOrUpdateView}
        deleteConfirmView={deleteConfirmView} setDeleteConfirmView={setDeleteConfirmView}
        onDeleteView={handleDeleteView}
        viewMenuAnchor={viewMenuAnchor} viewMenuTarget={viewMenuTarget}
        onCloseViewMenu={handleCloseViewMenu}
        createInitiativeOpen={createInitiativeOpen} setCreateInitiativeOpen={setCreateInitiativeOpen}
        onAddInitiative={addInitiative}
      />
    </>
  );
};

export default Sidebar;
