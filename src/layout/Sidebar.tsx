import { useState } from 'react';
import { toast } from 'sonner';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Avatar, Chip, IconButton, Menu, MenuItem, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  ToggleButtonGroup, ToggleButton, AvatarGroup, Tooltip, Collapse,
  Select, FormControl, InputLabel, Checkbox, FormControlLabel,
} from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import HubIcon from '@mui/icons-material/Hub';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FlagIcon from '@mui/icons-material/Flag';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FolderIcon from '@mui/icons-material/Folder';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { joinWorkspaceByCode } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';
import InviteDialog from '../components/InviteDialog';
import type { TranslationKeys } from '../locales/en';

export const DRAWER_WIDTH = 280;

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const WS_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const PROJECT_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Media query matches md breakpoint (900px) — mobile when below
const isMobileQuery = () => window.innerWidth < 900;

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    workspaces, currentWorkspace, setCurrentWorkspace,
    teamGroups, currentTeamGroup, setCurrentTeamGroup,
    projects, currentProject, setCurrentProject,
    sprints, currentSprint, setCurrentSprint,
    currentMembers,
    addWorkspace, addProject, addSprint, refreshWorkspaces,
  } = useWorkspace();

  const [wsMenuAnchor, setWsMenuAnchor] = useState<null | HTMLElement>(null);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [joinWsOpen, setJoinWsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [newWsName, setNewWsName] = useState('');
  const [newWsType, setNewWsType] = useState<'personal' | 'team' | 'organization'>('team');
  const [newProjectName, setNewProjectName] = useState('');
  const [newSprintName, setNewSprintName] = useState('');
  const [newSprintType, setNewSprintType] = useState<'sprint' | 'phase' | 'milestone'>('sprint');
  const [newSprintStartDate, setNewSprintStartDate] = useState('');
  const [newSprintEndDate, setNewSprintEndDate] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newWsColor, setNewWsColor] = useState(WS_COLORS[0]);
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [newSprintParentId, setNewSprintParentId] = useState<string>('');
  const [newSprintLinkedIds, setNewSprintLinkedIds] = useState<string[]>([]);

  const [sprintsExpanded, setSprintsExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);

  // Close the mobile drawer after a navigation action
  const closeMobileDrawer = () => {
    if (mobileOpen && isMobileQuery()) handleDrawerToggle();
  };

  // nav items — dashboard path set to '/' to match route
  // "My Tasks" (formerly Dashboard) should clear project/sprint
  // Weekly planner is accessed via Calendar → Week tab, no separate nav entry needed
  const navItems = [
    { textKey: 'myTasks' as TranslationKeys, icon: <HomeIcon sx={{ fontSize: 20 }} />, path: '/' },
    { textKey: 'calendar' as TranslationKeys, icon: <CalendarMonthIcon sx={{ fontSize: 20 }} />, path: '/calendar' },
    { textKey: 'reports' as TranslationKeys, icon: <BarChartIcon sx={{ fontSize: 20 }} />, path: '/reports' },
    { textKey: 'opsCenter' as TranslationKeys, icon: <HubIcon sx={{ fontSize: 20 }} />, path: '/ops' },
    { textKey: 'settings' as TranslationKeys, icon: <SettingsIcon sx={{ fontSize: 20 }} />, path: '/settings' },
    { textKey: 'teamSettings' as TranslationKeys, icon: <GroupsIcon sx={{ fontSize: 20 }} />, path: '/team-settings' },
  ];

  // handlers
  const handleCreateWs = async () => {
    if (!newWsName.trim()) return;
    try {
      const ws = await addWorkspace(newWsName.trim(), newWsColor, newWsType);
      setCurrentWorkspace(ws);
      setCreateWsOpen(false); setNewWsName('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to create workspace');
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const proj = await addProject(newProjectName.trim(), newProjectColor, currentTeamGroup?.id);
      setCurrentProject(proj);
      setCreateProjectOpen(false); setNewProjectName('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to create project');
    }
  };

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;
    try {
      const startDate = newSprintType === 'milestone' ? undefined : (newSprintStartDate || undefined);
      const endDate = newSprintType === 'milestone' ? (newSprintEndDate || undefined) : (newSprintEndDate || undefined);
      const parentId = newSprintType === 'sprint' && newSprintParentId ? newSprintParentId : undefined;
      const linkedIds = newSprintType === 'milestone' && newSprintLinkedIds.length > 0 ? newSprintLinkedIds : undefined;
      const sp = await addSprint(newSprintName.trim(), newSprintType, startDate, endDate, parentId, linkedIds);
      setCurrentSprint(sp);
      setCreateSprintOpen(false); setNewSprintName(''); setNewSprintStartDate(''); setNewSprintEndDate(''); setNewSprintParentId(''); setNewSprintLinkedIds([]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to create sprint');
    }
  };

  const handleJoinWs = async () => {
    if (!joinCode.trim() || !user) return;
    try {
      const ws = await joinWorkspaceByCode(joinCode.trim(), {
        uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL,
      });
      if (ws) { await refreshWorkspaces(); setCurrentWorkspace(ws); setJoinWsOpen(false); setJoinCode(''); }
      else toast.error(t('invalidInviteCode') as string);
    } catch (e) {
      console.error(e);
      toast.error('Failed to join workspace');
    }
  };

  // Drawer content (pure layout)
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <RocketLaunchIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="h6" fontWeight={700} color="text.primary">TaskFlow</Typography>
      </Box>

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
      <Box sx={{ px: 2, pt: 1.5, flex: 1, overflowY: 'auto' }}>
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

        {/* Sprints/Phases (within current project) */}
        {currentProject && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mt: 1.5, mb: 0.5 }}>
              <Box role="button" tabIndex={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }} onClick={() => setSprintsExpanded(!sprintsExpanded)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSprintsExpanded(!sprintsExpanded); } }}>
                {sprintsExpanded ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('sprints') as string}</Typography>
              </Box>
              <IconButton size="small" onClick={() => setHideCompleted(!hideCompleted)} sx={{ p: 0.3, mr: 0.3 }}>
                <Tooltip title={hideCompleted ? (t('showCompleted') as string) : (t('hideCompleted') as string)} arrow>
                  <Typography sx={{ fontSize: 12, color: hideCompleted ? 'primary.main' : 'text.disabled', cursor: 'pointer' }}>{hideCompleted ? '◉' : '◎'}</Typography>
                </Tooltip>
              </IconButton>
              <IconButton size="small" onClick={() => setCreateSprintOpen(true)} sx={{ p: 0.3 }}>
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Collapse in={sprintsExpanded}>
              <List dense disablePadding>
                {(() => {
                  // Build tree: top-level items = phases + sprints without parent + milestones
                  const visibleSprints = hideCompleted ? sprints.filter(s => s.status !== 'completed') : sprints;
                  const phases = visibleSprints.filter(s => s.type === 'phase');
                  const topLevelSprints = visibleSprints.filter(s => s.type === 'sprint' && !s.parentId);
                  const milestones = visibleSprints.filter(s => s.type === 'milestone');
                  const childSprintsByPhase = (phaseId: string) => visibleSprints.filter(s => s.type === 'sprint' && s.parentId === phaseId);

                  const renderItem = (sp: typeof sprints[0], indent: boolean = false) => {
                    const typeIcon = sp.type === 'milestone' ? <FlagIcon sx={{ fontSize: 14, color: sp.status === 'active' ? 'error.main' : sp.status === 'completed' ? 'success.main' : 'text.disabled', mr: 1.5 }} />
                      : sp.type === 'phase' ? <ListAltIcon sx={{ fontSize: 14, color: sp.status === 'active' ? 'success.main' : sp.status === 'completed' ? 'success.main' : 'text.disabled', mr: 1.5 }} />
                        : <RocketLaunchIcon sx={{ fontSize: 14, color: sp.status === 'active' ? 'primary.main' : sp.status === 'completed' ? 'success.main' : 'text.disabled', mr: 1.5 }} />;
                    const selectedColor = sp.type === 'milestone' ? 'rgba(239,68,68,0.15)' : sp.type === 'phase' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)';
                    const selectedHover = sp.type === 'milestone' ? 'rgba(239,68,68,0.22)' : sp.type === 'phase' ? 'rgba(16,185,129,0.22)' : 'rgba(99,102,241,0.22)';
                    const statusColor = sp.type === 'milestone' ? 'error.main' : sp.type === 'phase' ? 'success.main' : 'primary.main';
                    const dateLabel = sp.type === 'milestone' ? (sp.endDate ? `\u2192 ${sp.endDate}` : '') : (sp.startDate && sp.endDate ? `${sp.startDate} ~ ${sp.endDate}` : '');
                    return (
                      <ListItem key={sp.id} disablePadding sx={{ mb: 0.3 }}>
                        <ListItemButton selected={currentSprint?.id === sp.id} onClick={() => { setCurrentSprint(currentSprint?.id === sp.id ? null : sp); navigate('/'); closeMobileDrawer(); }}
                          sx={{ borderRadius: 1.5, py: 0.5, pl: indent ? 4.5 : 1, '&.Mui-selected': { bgcolor: selectedColor, '&:hover': { bgcolor: selectedHover } } }}>
                          {typeIcon}
                          <ListItemText primary={sp.name} secondary={dateLabel || undefined}
                            primaryTypographyProps={{ fontSize: indent ? '0.75rem' : '0.8rem', fontWeight: currentSprint?.id === sp.id ? 600 : 400 }}
                            secondaryTypographyProps={{ fontSize: '0.65rem', color: 'text.disabled' }} />
                          <Tooltip title={sp.status === 'active' ? t('active') as string : sp.status === 'completed' ? t('completed') as string : t('planned') as string} arrow>
                            <Chip label={sp.status === 'active' ? '\u25cf' : sp.status === 'completed' ? '\u2713' : '\u25cb'} size="small"
                              sx={{
                                height: 16, minWidth: 16, fontSize: '0.6rem', p: 0, bgcolor: 'transparent',
                                color: sp.status === 'active' ? statusColor : sp.status === 'completed' ? 'success.main' : 'text.disabled'
                              }} />
                          </Tooltip>
                        </ListItemButton>
                      </ListItem>
                    );
                  };

                  return (
                    <>
                      {/* PHASES section */}
                      {phases.length > 0 && (
                        <>
                          <Typography variant="caption" sx={{ pl: 1.5, pt: 0.8, pb: 0.3, display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'success.main', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            📋 Phases
                          </Typography>
                          {phases.map(phase => {
                            const children = childSprintsByPhase(phase.id);
                            return (
                              <Box key={phase.id} sx={{ mb: 0.5 }}>
                                {renderItem(phase)}
                                {children.length > 0 && (
                                  <Box sx={{ ml: 2.5, borderLeft: '2px solid', borderColor: 'success.main', pl: 0.5, opacity: 0.95 }}>
                                    {children.map(child => renderItem(child, true))}
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                        </>
                      )}
                      {/* SPRINTS section */}
                      {topLevelSprints.length > 0 && (
                        <>
                          <Typography variant="caption" sx={{ pl: 1.5, pt: 0.8, pb: 0.3, display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'primary.main', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            🚀 Sprints
                          </Typography>
                          {topLevelSprints.map(sp => renderItem(sp))}
                        </>
                      )}
                      {/* MILESTONES section */}
                      {milestones.length > 0 && (
                        <>
                          <Typography variant="caption" sx={{ pl: 1.5, pt: 0.8, pb: 0.3, display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'error.main', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            🎯 Milestones
                          </Typography>
                          {milestones.map(ms => renderItem(ms))}
                        </>
                      )}
                    </>
                  );
                })()}
                {/* Backlog */}
                <ListItem disablePadding sx={{ mb: 0.3 }}>
                  <ListItemButton selected={currentSprint === null && sprints.length > 0} onClick={() => { setCurrentSprint(null); navigate('/'); closeMobileDrawer(); }}
                    sx={{ borderRadius: 1.5, py: 0.6, opacity: 0.7 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ pl: 3.5 }}>
                      {t('backlog') as string}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              </List>
            </Collapse>
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

      {/* --- Dialogs (Outside Drawer) --- */}

      <Dialog open={createWsOpen} onClose={() => setCreateWsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('createWorkspace') as string}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('workspaceName') as string} value={newWsName}
            onChange={e => setNewWsName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateWs()}
            sx={{ mt: 1, mb: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('workspaceType') as string}</Typography>
          <ToggleButtonGroup value={newWsType} exclusive onChange={(_, v) => v && setNewWsType(v)} size="small" fullWidth sx={{
            mb: 2,
            '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }
          }}>
            <ToggleButton value="personal">{t('typePersonal') as string}</ToggleButton>
            <ToggleButton value="team">{t('typeTeam') as string}</ToggleButton>
            <ToggleButton value="organization">{t('typeOrg') as string}</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('teamColor') as string}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {WS_COLORS.map(c => (
              <Box key={c} role="button" tabIndex={0} aria-label={`Color ${c}`}
                onClick={() => setNewWsColor(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewWsColor(c); } }}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: newWsColor === c ? '3px solid' : '2px solid transparent', borderColor: newWsColor === c ? 'text.primary' : 'transparent',
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateWsOpen(false)}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleCreateWs} disabled={!newWsName.trim()}>{t('save') as string}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={joinWsOpen} onClose={() => setJoinWsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('joinWorkspace') as string}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('inviteCode') as string} placeholder="ABC123"
            value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoinWs()} sx={{ mt: 1 }}
            inputProps={{ style: { letterSpacing: 4, fontWeight: 700, textAlign: 'center' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinWsOpen(false)}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleJoinWs} disabled={joinCode.length < 6}>{t('joinWorkspace') as string}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('createProject') as string}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('projectName') as string} value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
            sx={{ mt: 1, mb: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('projectColor') as string}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {PROJECT_COLORS.map(c => (
              <Box key={c} role="button" tabIndex={0} aria-label={`Color ${c}`}
                onClick={() => setNewProjectColor(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNewProjectColor(c); } }}
                sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: newProjectColor === c ? '3px solid' : '2px solid transparent', borderColor: newProjectColor === c ? 'text.primary' : 'transparent',
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }} />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateProjectOpen(false)}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleCreateProject} disabled={!newProjectName.trim()}>{t('save') as string}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createSprintOpen} onClose={() => { setCreateSprintOpen(false); setNewSprintStartDate(''); setNewSprintEndDate(''); setNewSprintParentId(''); setNewSprintLinkedIds([]); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('createSprint') as string}</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label={t('sprintName') as string} value={newSprintName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintName(e.target.value)} onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCreateSprint()}
            sx={{ mt: 1, mb: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{t('sprintType') as string}</Typography>
          <ToggleButtonGroup value={newSprintType} exclusive onChange={(_: React.MouseEvent, v: string | null) => { if (v) { setNewSprintType(v as 'sprint' | 'phase' | 'milestone'); setNewSprintStartDate(''); setNewSprintEndDate(''); setNewSprintParentId(''); setNewSprintLinkedIds([]); } }} size="small" fullWidth
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' } }}>
            <ToggleButton value="sprint">🏃 Sprint</ToggleButton>
            <ToggleButton value="phase">📋 Phase</ToggleButton>
            <ToggleButton value="milestone">🎯 Milestone</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 1.5, minHeight: 20, fontSize: '0.8rem', lineHeight: 1.5 }}>
            {newSprintType === 'sprint' && (t('sprintDesc') as string)}
            {newSprintType === 'phase' && (t('phaseDesc') as string)}
            {newSprintType === 'milestone' && (t('milestoneDesc') as string)}
          </Typography>

          {/* Parent Phase selector (Sprint type only) */}
          {newSprintType === 'sprint' && sprints.filter(s => s.type === 'phase').length > 0 && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>{t('parentPhase') as string}</InputLabel>
              <Select value={newSprintParentId} label={t('parentPhase') as string}
                onChange={(e) => setNewSprintParentId(e.target.value as string)}>
                <MenuItem value="">{t('noParent') as string}</MenuItem>
                {sprints.filter(s => s.type === 'phase').map(phase => (
                  <MenuItem key={phase.id} value={phase.id}>📋 {phase.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Linked Sprints selector (Milestone type only) */}
          {newSprintType === 'milestone' && sprints.filter(s => s.type !== 'milestone').length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                {t('selectLinkedSprints') as string}
              </Typography>
              {sprints.filter(s => s.type !== 'milestone').map(sp => (
                <FormControlLabel key={sp.id} sx={{ display: 'block', ml: 0 }}
                  control={
                    <Checkbox size="small" checked={newSprintLinkedIds.includes(sp.id)}
                      onChange={(e) => {
                        if (e.target.checked) setNewSprintLinkedIds(prev => [...prev, sp.id]);
                        else setNewSprintLinkedIds(prev => prev.filter(id => id !== sp.id));
                      }} />
                  }
                  label={<Typography variant="body2">{sp.type === 'phase' ? '📋' : '🚀'} {sp.name}</Typography>}
                />
              ))}
            </Box>
          )}

          {/* Date fields based on type */}
          {newSprintType === 'milestone' ? (
            <TextField fullWidth type="date" label={t('targetDate') as string} value={newSprintEndDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ mt: 1 }} />
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
              <TextField fullWidth type="date" label={t('startDate') as string} value={newSprintStartDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }} />
              <TextField fullWidth type="date" label={t('endDate') as string} value={newSprintEndDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSprintEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateSprintOpen(false); setNewSprintStartDate(''); setNewSprintEndDate(''); setNewSprintParentId(''); setNewSprintLinkedIds([]); }}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleCreateSprint} disabled={!newSprintName.trim()}>{t('save') as string}</Button>
        </DialogActions>
      </Dialog>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
};

export default Sidebar;