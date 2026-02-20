import { useState, useEffect, useCallback, useRef } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, Avatar,
  Button, Divider, Chip, List, ListItemButton, ListItemAvatar,
  ListItemText, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SendIcon from '@mui/icons-material/Send';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchNotifications, markAsRead, markAllAsRead, fetchUnreadCount } from '../services/notificationService';
import { addComment, fetchCommentsByNotificationId } from '../services/commentService';
import { NOTIFICATION_TYPE_CONFIG } from '../types';
import type { Notification, TaskComment } from '../types';

/** Relative time label */
const timeAgo = (iso: string, lang: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === 'ko' ? '방금 전' : 'Just now';
  if (mins < 60) return lang === 'ko' ? `${mins}분 전` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'ko' ? `${hrs}시간 전` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return lang === 'ko' ? `${days}일 전` : `${days}d ago`;
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Detail dialog
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<TaskComment[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // --- Detail Dialog ---
  const handleNotificationClick = async (n: Notification) => {
    setSelectedNotification(n);
    handleMarkRead(n);
    // Load existing replies
    setRepliesLoading(true);
    try {
      const existing = await fetchCommentsByNotificationId(n.id);
      setReplies(existing);
    } catch {
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
    // Focus reply input after dialog opens
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleDetailClose = () => {
    setSelectedNotification(null);
    setReplyText('');
    setReplies([]);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !selectedNotification) return;
    const newComment = await addComment({
      notificationId: selectedNotification.id,
      taskId: selectedNotification.taskId,
      authorUid: user.uid,
      authorName: user.displayName || 'User',
      authorPhoto: user.photoURL || undefined,
      body: replyText.trim(),
    });
    setReplies(prev => [newComment, ...prev]);
    setReplyText('');
  };

  const handleGoToTask = () => {
    if (!selectedNotification?.taskId) return;
    handleDetailClose();
    handleClose();
    navigate(`/tasks?taskId=${selectedNotification.taskId}`);
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

      {/* ────── Popover (notification list) ────── */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 400,
              maxHeight: 500,
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
          <List disablePadding sx={{ maxHeight: 380, overflow: 'auto' }}>
            {notifications.map((n) => {
              const config = NOTIFICATION_TYPE_CONFIG[n.type];
              return (
                <ListItemButton
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  sx={{
                    px: 2, py: 1.5,
                    bgcolor: n.read ? 'transparent' : 'action.hover',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: n.read ? 'action.hover' : 'action.selected' },
                    transition: 'background 0.15s',
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
                          {timeAgo(n.createdAt, lang)}
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

      {/* ────── Notification Detail Dialog ────── */}
      <Dialog
        open={!!selectedNotification}
        onClose={handleDetailClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            maxHeight: '80vh',
          },
        }}
      >
        {selectedNotification && (() => {
          const n = selectedNotification;
          const config = NOTIFICATION_TYPE_CONFIG[n.type];
          return (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
                <Avatar
                  src={n.actorPhoto || undefined}
                  sx={{ width: 36, height: 36, fontSize: 15, bgcolor: config?.color || 'primary.main' }}
                >
                  {config?.icon || '📌'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>{n.title}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={config?.label || n.type}
                      size="small"
                      sx={{
                        height: 18, fontSize: '0.6rem', fontWeight: 600,
                        bgcolor: (config?.color || '#6366f1') + '20',
                        color: config?.color || '#6366f1',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {n.actorName} · {timeAgo(n.createdAt, lang)}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={handleDetailClose}
                  size="small"
                  sx={{ position: 'absolute', right: 12, top: 12 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>

              <DialogContent dividers sx={{ py: 2 }}>
                {/* Notification body */}
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2, lineHeight: 1.7 }}>
                  {n.body}
                </Typography>

                {/* Context chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {n.projectName && (
                    <Chip label={`📁 ${n.projectName}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
                  )}
                  {n.sprintName && (
                    <Chip label={`🚀 ${n.sprintName}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
                  )}
                  {n.taskText && (
                    <Chip label={`📋 ${n.taskText}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
                  )}
                </Box>

                {/* Go to Task button */}
                {n.taskId && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<OpenInNewIcon />}
                    onClick={handleGoToTask}
                    sx={{ mb: 2, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    {lang === 'ko' ? '작업으로 이동' : 'Go to Task'}
                  </Button>
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* Replies section */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  💬 {lang === 'ko' ? '빠른 답변' : 'Quick Reply'}
                </Typography>

                {repliesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : replies.length > 0 && (
                  <Box sx={{
                    mb: 2, maxHeight: 200, overflow: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 1,
                  }}>
                    {replies.map((r) => (
                      <Box key={r.id} sx={{
                        display: 'flex', gap: 1, p: 1.5,
                        bgcolor: 'action.hover', borderRadius: 2,
                        border: '1px solid', borderColor: 'divider',
                      }}>
                        <Avatar src={r.authorPhoto} sx={{ width: 24, height: 24, fontSize: 11 }}>
                          {r.authorName?.[0]?.toUpperCase() || '?'}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" fontWeight={700}>{r.authorName}</Typography>
                            <Typography variant="caption" color="text.disabled">{timeAgo(r.createdAt, lang)}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.3, fontSize: '0.85rem' }}>
                            {r.body}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Reply input */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  <TextField
                    inputRef={inputRef}
                    fullWidth
                    multiline
                    maxRows={4}
                    size="small"
                    placeholder={lang === 'ko' ? '답변을 입력하세요...' : 'Type a reply...'}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <IconButton
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    color="primary"
                    sx={{
                      width: 40, height: 40,
                      bgcolor: replyText.trim() ? 'primary.main' : 'action.disabledBackground',
                      color: replyText.trim() ? 'white' : 'text.disabled',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'primary.dark' },
                      transition: 'all 0.2s',
                    }}
                  >
                    <SendIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </DialogContent>

              <DialogActions sx={{ px: 3, py: 1.5 }}>
                <Button onClick={handleDetailClose} sx={{ textTransform: 'none' }}>
                  {lang === 'ko' ? '닫기' : 'Close'}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </>
  );
}
