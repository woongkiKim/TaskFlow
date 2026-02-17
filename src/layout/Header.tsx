import { useState, useEffect, useMemo } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Button, Menu, MenuItem, ListItemIcon } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import TranslateIcon from '@mui/icons-material/Translate';
import LogoutIcon from '@mui/icons-material/Logout';
import { DRAWER_WIDTH } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MiniPomodoroTimer } from '../components/PomodoroTimer';
import SearchBar from '../components/SearchBar';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { fetchTasks } from '../services/taskService';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import type { Task } from '../types';
import type { TranslationKeys } from '../locales/en';

interface HeaderProps {
  handleDrawerToggle: () => void;
}

const Header = ({ handleDrawerToggle }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const ROUTE_TITLE_MAP: Record<string, TranslationKeys> = useMemo(() => ({
    '/': 'dashboard',
    '/calendar': 'calendar',
    '/planner': 'planner',
    '/reports': 'reports',
    '/ops': 'opsCenter',
    '/settings': 'settings',
    '/team-settings': 'teamSettings',
  }), []);

  const pageTitle = t((ROUTE_TITLE_MAP[location.pathname] || 'dashboard') as TranslationKeys) as string;

  useEffect(() => {
    if (!user) return;
    fetchTasks(user.uid).then(setTasks).catch(() => toast.error(t('loadFailed') as string));
  }, [user]);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
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
          <SearchBar tasks={tasks} onSelectTask={setDetailTask} />

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

          {/* Notification icon — hidden until feature is implemented
          <Tooltip title={t('comingSoon') as string}>
            <span>
              <IconButton size="large" color="inherit" disabled sx={{ ml: 1, opacity: 0.4 }}>
                <NotificationsIcon sx={{ color: 'text.disabled' }} />
              </IconButton>
            </span>
          </Tooltip>
          */}

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
                  minWidth: 160,
                }
              }
            }}
          >
            <MenuItem onClick={handleLogout} sx={{ gap: 1.5, color: 'error.main' }}>
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