// src/components/inbox/NotificationDetailDialog.tsx
import { useRef, useState, useEffect } from 'react';
import {
  Box, Typography, Avatar, IconButton, Chip,
  Divider, alpha, Dialog, DialogTitle, DialogContent, DialogActions as MuiDialogActions,
  TextField, Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import type { Notification } from '../../types';
import { NOTIFICATION_TYPE_CONFIG } from '../../types';
import { getTimeAgo } from './getTimeAgo';

interface NotificationDetailDialogProps {
  open: boolean;
  notification: Notification | null;
  onClose: () => void;
  onNavigate: (n: Notification) => void;
  onReply: (n: Notification, message: string) => void;
  lang: 'ko' | 'en';
}

const NotificationDetailDialog = ({
  open, notification, onClose, onNavigate, onReply, lang,
}: NotificationDetailDialogProps) => {
  const textByLang = (en: string, ko: string) => (lang === 'ko' ? ko : en);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when notification changes
  const prevNotifId = useRef(notification?.id);
  if (notification?.id !== prevNotifId.current) {
    prevNotifId.current = notification?.id;
    setReplyText('');
    setReplySent(false);
  }

  // Focus after mount
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  if (!notification) return null;
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const timeAgo = getTimeAgo(notification.createdAt, lang);

  const handleSendReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReply(notification, trimmed);
    setReplyText('');
    setReplySent(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      {/* Colored top bar */}
      <Box sx={{ height: 4, bgcolor: config.color }} />
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2.5, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={notification.actorPhoto}
            sx={{ width: 44, height: 44, bgcolor: config.color, fontWeight: 700, fontSize: 16 }}
          >
            {notification.actorName?.charAt(0) || config.icon}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{notification.title}</Typography>
            <Typography variant="caption" color="text.secondary">{timeAgo}</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Type badge */}
        <Box sx={{ mb: 2, display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
          <Chip
            label={`${config.icon} ${config.label}`} size="small"
            sx={{ fontWeight: 600, bgcolor: config.color + '18', color: config.color }}
          />
          {notification.projectName && (
            <Chip label={notification.projectName} size="small"
              sx={{ fontWeight: 600, bgcolor: 'action.hover' }} />
          )}
          {notification.sprintName && (
            <Chip label={notification.sprintName} size="small" variant="outlined"
              sx={{ fontWeight: 600 }} />
          )}
        </Box>

        {/* Full body */}
        <Box sx={{
          bgcolor: (theme) => alpha(theme.palette.background.default, 0.6),
          borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider',
        }}>
          <Typography variant="body1" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {notification.body}
          </Typography>
        </Box>

        {/* Task context */}
        {notification.taskText && (
          <Box
            onClick={() => onNavigate(notification)}
            sx={{
              mt: 2, p: 1.5, borderRadius: 2, cursor: 'pointer',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              border: '1px solid', borderColor: (theme) => alpha(theme.palette.primary.main, 0.12),
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                borderColor: 'primary.main',
              },
            }}
          >
            <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <OpenInNewIcon sx={{ fontSize: 12 }} />
              {textByLang('Related Task — click to view', '관련 작업 — 클릭하여 이동')}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {notification.taskText}
            </Typography>
          </Box>
        )}

        {/* Actor info */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {textByLang('From', '보낸 사람')}: <strong>{notification.actorName}</strong>
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* ─── Quick Reply Section ─── */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ReplyIcon sx={{ fontSize: 14 }} />
            {textByLang('Quick Reply', '빠른 답변')}
          </Typography>

          {replySent ? (
            <Box sx={{
              p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} />
              <Typography variant="body2" fontWeight={600} color="#059669">
                {textByLang('Reply sent!', '답변이 전송되었습니다!')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={4}
                size="small"
                placeholder={textByLang(
                  `Reply to ${notification.actorName}...`,
                  `${notification.actorName}님에게 답변...`
                )}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
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
                sx={{
                  bgcolor: replyText.trim() ? 'primary.main' : 'action.hover',
                  color: replyText.trim() ? 'white' : 'text.disabled',
                  borderRadius: 2, width: 40, height: 40,
                  '&:hover': { bgcolor: 'primary.dark', color: 'white' },
                }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogContent>

      <MuiDialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ borderRadius: 2 }}>
          {textByLang('Close', '닫기')}
        </Button>
        {notification.taskId && (
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={() => onNavigate(notification)}
            sx={{
              borderRadius: 2, fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            }}
          >
            {textByLang('Go to Task', '작업으로 이동')}
          </Button>
        )}
      </MuiDialogActions>
    </Dialog>
  );
};

export default NotificationDetailDialog;
