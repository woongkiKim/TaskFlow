import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Button, Menu, MenuItem, ListItemIcon, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TranslateIcon from '@mui/icons-material/Translate';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { DRAWER_WIDTH } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MiniPomodoroTimer } from '../components/PomodoroTimer';
import SearchBar from '../components/SearchBar';
import NotificationCenter from '../components/NotificationCenter';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { useTasks } from '../hooks/useTasks';
import { useLocation } from 'react-router-dom';
import type { Task } from '../types';
import type { TranslationKeys } from '../locales/en';

interface HeaderProps {
  handleDrawerToggle: () => void;
  onOpenShortcuts?: () => void;
  onStartTour?: () => void;
}

const Header = ({ handleDrawerToggle, onOpenShortcuts, onStartTour }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { tasks, reload: reloadTasks } = useTasks();
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const ROUTE_TITLE_MAP: Record<string, TranslationKeys> = useMemo(() => ({
    '/': 'myTasks',
    '/calendar': 'calendar',
    '/planner': 'planner',
    '/reports': 'reports',
    '/ops': 'opsCenter',
    '/settings': 'settings',
    '/team-settings': 'teamSettings',
  }), []);

  const pageTitle = t((ROUTE_TITLE_MAP[location.pathname] || 'dashboard') as TranslationKeys) as string;

  const handleTaskUpdate = (_updatedTask: Task) => {
    reloadTasks();
  };

  const getInitials = () => {
    if (!user?.displayName) return '?';
    return user.displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleLang = () => setLang(lang === 'ko' ? 'en' : 'ko');

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleGoToSettings = () => {
    handleClose();
    navigate('/settings');
  };

  const handleOpenShortcuts = () => {
    handleClose();
    onOpenShortcuts?.();
  };

  const handleStartTour = () => {
    handleClose();
    onStartTour?.();
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'block' } }}>
            {pageTitle}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* 검색바 */}
          <Box data-tour="header-search">
            <SearchBar tasks={tasks} onSelectTask={setDetailTask} />
          </Box>

          {/* 언어 전환 버튼 */}
          <Button
            size="small"
            startIcon={<TranslateIcon />}
            onClick={toggleLang}
            sx={{
              ml: 1,
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.8rem',
              textTransform: 'none',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              px: 1.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {lang === 'ko' ? 'EN' : '한국어'}
          </Button>

          {/* 포모도로 미니 타이머 */}
          <MiniPomodoroTimer />

          {/* 알림 센터 */}
          <Box data-tour="header-notifications">
            <NotificationCenter />
          </Box>

          {/* 프로필 아바타 */}
          <Box
            role="button"
            tabIndex={0}
            onClick={handleAvatarClick}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAvatarClick(e as unknown as React.MouseEvent<HTMLElement>); } }}
            sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2, borderRadius: 1 } }}
          >
            <Avatar
              src={user?.photoURL || undefined}
              sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}
            >
              {getInitials()}
            </Avatar>
            <Typography variant="subtitle2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.displayName || 'User'}
            </Typography>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  minWidth: 200,
                }
              }
            }}
          >
            {/* User Info */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>{user?.displayName || 'User'}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <Divider />

            {/* Settings */}
            <MenuItem onClick={handleGoToSettings} sx={{ gap: 1.5, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              {t('settings') as string}
            </MenuItem>

            {/* Keyboard Shortcuts */}
            <MenuItem onClick={handleOpenShortcuts} sx={{ gap: 1.5, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <KeyboardIcon fontSize="small" />
              </ListItemIcon>
              {t('keyboardShortcuts') as string || 'Keyboard Shortcuts'}
            </MenuItem>

            {/* Start Tour */}
            <MenuItem onClick={handleStartTour} sx={{ gap: 1.5, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <HelpOutlineIcon fontSize="small" />
              </ListItemIcon>
              {lang === 'ko' ? '가이드 투어' : 'Start Tour'}
            </MenuItem>

            <Divider />

            {/* Logout */}
            <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1, color: 'error.main' }}>
              <ListItemIcon sx={{ minWidth: 'auto' }}>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              {t('logout') as string}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Task Detail from search */}
      <TaskDetailDialog
        open={!!detailTask}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onUpdate={handleTaskUpdate}
      />
    </>
  );
};

export default Header;