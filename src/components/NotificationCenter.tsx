import { useState, useEffect, useCallback } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, Avatar,
  Button, Divider, Chip, List, ListItemButton, ListItemAvatar,
  ListItemText, CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchNotifications, markAsRead, markAllAsRead, fetchUnreadCount } from '../services/notificationService';
import { NOTIFICATION_TYPE_CONFIG } from '../types';
import type { Notification } from '../types';

/** Relative time label */
const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Poll unread count every 30s
  const loadCount = useCallback(async () => {
    if (!user) return;
    const count = await fetchUnreadCount(user.uid);
    setUnreadCount(count);
  }, [user]);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30_000);
    return () => clearInterval(interval);
  }, [loadCount]);

  const handleOpen = async (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchNotifications(user.uid);
      setNotifications(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkRead = async (n: Notification) => {
    if (n.read) return;
    await markAsRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAsRead(user.uid);
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="large"
        color="inherit"
        onClick={handleOpen}
        sx={{ ml: 0.5, position: 'relative' }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              height: 18,
              minWidth: 18,
            },
          }}
        >
          <NotificationsIcon sx={{ color: 'text.secondary' }} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              maxHeight: 480,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              mt: 1,
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          p: 2, pb: 1,
        }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('notifications') as string}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllRead}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              {t('markAllRead') as string}
            </Button>
          )}
        </Box>
        <Divider />

        {/* Body */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ mb: 1 }}>🎉</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('noNotifications') as string}
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {notifications.map((n) => {
              const config = NOTIFICATION_TYPE_CONFIG[n.type];
              return (
                <ListItemButton
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  sx={{
                    px: 2, py: 1.5,
                    bgcolor: n.read ? 'transparent' : 'action.hover',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 44 }}>
                    <Avatar
                      src={n.actorPhoto || undefined}
                      sx={{ width: 32, height: 32, fontSize: 14, bgcolor: config?.color || 'primary.main' }}
                    >
                      {config?.icon || '📌'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={n.read ? 400 : 600} fontSize="0.85rem">
                        {n.title}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                        <Chip
                          label={config?.label || n.type}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: (config?.color || '#6366f1') + '20',
                            color: config?.color || '#6366f1',
                          }}
                        />
                        <Typography variant="caption" color="text.disabled">
                          {timeAgo(n.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />
                  {!n.read && (
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: 'primary.main', ml: 1, flexShrink: 0,
                    }} />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Popover>
    </>
  );
}
