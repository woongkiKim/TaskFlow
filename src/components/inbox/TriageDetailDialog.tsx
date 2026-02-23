// src/components/inbox/TriageDetailDialog.tsx
import { useRef, useState } from 'react';
import {
  Box, Typography, IconButton, Chip,
  Divider, alpha, Dialog, DialogTitle, DialogContent, DialogActions as MuiDialogActions,
  TextField, Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import CheckIcon from '@mui/icons-material/Check';
import FlagIcon from '@mui/icons-material/Flag';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { Task } from '../../types';
import { TASK_TYPE_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG, normalizePriority } from '../../types';
import { getTimeAgo } from './getTimeAgo';

interface TriageDetailDialogProps {
  open: boolean;
  task: Task | null;
  projectName: string;
  onClose: () => void;
  onAccept: (t: Task) => void;
  onDecline: (t: Task) => void;
  onNavigate: (t: Task) => void;
  lang: 'ko' | 'en';
}

const TriageDetailDialog = ({
  open, task, projectName, onClose, onAccept, onDecline, onNavigate, lang,
}: TriageDetailDialogProps) => {
  const textByLang = (en: string, ko: string) => (lang === 'ko' ? ko : en);
  const [commentText, setCommentText] = useState('');
  const [commentSent, setCommentSent] = useState(false);

  const prevTaskId = useRef(task?.id);
  if (task?.id !== prevTaskId.current) {
    prevTaskId.current = task?.id;
    setCommentText('');
    setCommentSent(false);
  }

  if (!task) return null;

  const typeCfg = TASK_TYPE_CONFIG[task.type || 'task'];
  const statusCfg = STATUS_CONFIG[task.status || 'todo'] || STATUS_CONFIG['todo'];
  const priority = normalizePriority(task.priority);
  const priorityCfg = priority ? PRIORITY_CONFIG[priority] : null;
  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date(new Date().toISOString().split('T')[0]);

  const handleSendComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    // TODO: Wire to a comment/activity service
    setCommentText('');
    setCommentSent(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      {/* Colored top accent */}
      <Box sx={{ height: 4, background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)' }} />
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2.5, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {task.taskCode && (
            <Chip label={task.taskCode} size="small"
              sx={{ fontWeight: 700, fontFamily: 'monospace', bgcolor: 'action.hover', fontSize: '0.75rem' }} />
          )}
          <Chip label={`${typeCfg.icon} ${typeCfg.label}`} size="small"
            sx={{ fontWeight: 600, bgcolor: typeCfg.color + '18', color: typeCfg.color }} />
          <Chip label={statusCfg.label} size="small"
            sx={{ fontWeight: 600, bgcolor: statusCfg.bgColor, color: statusCfg.color }} />
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Task title */}
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          {task.text}
        </Typography>

        {/* Project & Priority & Due Date row */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip label={projectName} size="small"
            sx={{ fontWeight: 600, bgcolor: 'action.hover' }} />
          {priorityCfg && (
            <Chip
              icon={<FlagIcon sx={{ fontSize: 14 }} />}
              label={priority}
              size="small"
              sx={{ fontWeight: 700, bgcolor: priorityCfg.bgColor, color: priorityCfg.color }}
            />
          )}
          {task.dueDate && (
            <Chip
              icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />}
              label={task.dueDate}
              size="small"
              sx={{
                fontWeight: 600,
                bgcolor: isOverdue ? '#fef2f2' : 'action.hover',
                color: isOverdue ? '#dc2626' : 'text.primary',
              }}
            />
          )}
        </Box>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
            {task.tags.map(tag => (
              <Chip key={tag} label={`#${tag}`} size="small"
                sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: 'action.hover' }} />
            ))}
          </Box>
        )}

        {/* Full description */}
        {task.description ? (
          <Box sx={{
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.6),
            borderRadius: 2, p: 2, border: '1px solid', borderColor: 'divider',
          }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {textByLang('Description', '설명')}
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {task.description}
            </Typography>
          </Box>
        ) : (
          <Box sx={{
            bgcolor: 'action.hover', borderRadius: 2, p: 2,
            display: 'flex', justifyContent: 'center',
          }}>
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              {textByLang('No description provided.', '설명이 없습니다.')}
            </Typography>
          </Box>
        )}

        {/* Blocker info */}
        {task.blockerStatus === 'blocked' && task.blockerDetail && (
          <Box sx={{
            mt: 2, p: 1.5, borderRadius: 2,
            bgcolor: '#fef2f2', border: '1px solid #fecaca',
          }}>
            <Typography variant="caption" fontWeight={700} color="error.main" sx={{ mb: 0.3, display: 'block' }}>
              🚫 {textByLang('Blocker', '블로커')}
            </Typography>
            <Typography variant="body2" color="error.dark">
              {task.blockerDetail}
            </Typography>
          </Box>
        )}

        {/* Subtasks summary */}
        {task.subtasks && task.subtasks.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {textByLang('Subtasks', '하위 작업')} ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {task.subtasks.map(sub => (
                <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.3 }}>
                  <Box sx={{
                    width: 16, height: 16, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: sub.completed ? '#10b981' : 'action.hover',
                    color: sub.completed ? 'white' : 'text.disabled',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {sub.completed ? '✓' : ''}
                  </Box>
                  <Typography variant="body2" sx={{
                    textDecoration: sub.completed ? 'line-through' : 'none',
                    color: sub.completed ? 'text.secondary' : 'text.primary',
                  }}>
                    {sub.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Owners */}
        {task.owners && task.owners.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {textByLang('Assigned to', '담당자')}: <strong>{task.owners.map(o => o.name).join(', ')}</strong>
            </Typography>
          </Box>
        )}

        {/* Created timestamp */}
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
          {textByLang('Created', '생성')}: {getTimeAgo(task.createdAt, lang)}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* ─── Quick Comment ─── */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ReplyIcon sx={{ fontSize: 14 }} />
            {textByLang('Leave a comment', '댓글 남기기')}
          </Typography>
          {commentSent ? (
            <Box sx={{
              p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <CheckCircleIcon sx={{ fontSize: 18, color: '#10b981' }} />
              <Typography variant="body2" fontWeight={600} color="#059669">
                {textByLang('Comment added!', '댓글이 추가되었습니다!')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth multiline maxRows={3} size="small"
                placeholder={textByLang('Add a comment or question...', '댓글이나 질문을 남기세요...')}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <IconButton
                onClick={handleSendComment}
                disabled={!commentText.trim()}
                sx={{
                  bgcolor: commentText.trim() ? 'primary.main' : 'action.hover',
                  color: commentText.trim() ? 'white' : 'text.disabled',
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

      <Divider />
      <MuiDialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          onClick={() => onNavigate(task)}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {textByLang('Go to Board', '보드로 이동')}
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<CloseIcon />}
            color="inherit"
            onClick={() => { onDecline(task); onClose(); }}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {textByLang('Decline', '거절')}
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={() => { onAccept(task); onClose(); }}
            sx={{
              borderRadius: 2, fontWeight: 600,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
          >
            {textByLang('Accept', '수락')}
          </Button>
        </Box>
      </MuiDialogActions>
    </Dialog>
  );
};

export default TriageDetailDialog;
