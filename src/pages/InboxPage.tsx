// src/pages/InboxPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Avatar, IconButton, Tooltip, Chip,
    CircularProgress, Divider, alpha, Tabs, Tab, Button, Card, CardContent, CardActions,
    Dialog, DialogTitle, DialogContent, DialogActions as MuiDialogActions,
    TextField, Snackbar, Slide,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ArchiveIcon from '@mui/icons-material/Archive';
import CheckIcon from '@mui/icons-material/Check';
import InboxIcon from '@mui/icons-material/Inbox';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FlagIcon from '@mui/icons-material/Flag';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import UndoIcon from '@mui/icons-material/Undo';
import HistoryIcon from '@mui/icons-material/History';
import ReplyIcon from '@mui/icons-material/Reply';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import {
    fetchNotifications, markAsRead, markAllAsRead, archiveNotification, archiveAllRead,
} from '../services/notificationService';
import { fetchTriageTasks, updateTaskTriageStatus, unassignTask } from '../services/taskService';
import type { Notification, Task } from '../types';
import { NOTIFICATION_TYPE_CONFIG, PRIORITY_CONFIG, TASK_TYPE_CONFIG, STATUS_CONFIG, normalizePriority } from '../types';

// ─── Notification Detail Dialog ──────────────────────────
const NotificationDetailDialog = ({
    open, notification, onClose, onNavigate, onReply, lang,
}: {
    open: boolean;
    notification: Notification | null;
    onClose: () => void;
    onNavigate: (n: Notification) => void;
    onReply: (n: Notification, message: string) => void;
    lang: 'ko' | 'en';
}) => {
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

// ─── Triage Detail Dialog ────────────────────────────────
const TriageDetailDialog = ({
    open, task, projectName, onClose, onAccept, onDecline, onNavigate, lang,
}: {
    open: boolean;
    task: Task | null;
    projectName: string;
    onClose: () => void;
    onAccept: (t: Task) => void;
    onDecline: (t: Task) => void;
    onNavigate: (t: Task) => void;
    lang: 'ko' | 'en';
}) => {
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


// ─── Main InboxPage Component ────────────────────────────
const InboxPage = () => {
    const { t, lang } = useLanguage();
    const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);
    const { user } = useAuth();
    const { projects } = useWorkspace();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [triageTasks, setTriageTasks] = useState<Task[]>([]);
    const [declinedTasks, setDeclinedTasks] = useState<Task[]>([]);
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showDeclined, setShowDeclined] = useState(false);

    // Dialog states
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [selectedTriageTask, setSelectedTriageTask] = useState<Task | null>(null);

    // Undo snackbar
    const [undoSnack, setUndoSnack] = useState<{
        message: string;
        task: Task;
        action: 'decline' | 'accept';
    } | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [notifs, tasks] = await Promise.all([
                fetchNotifications(user.uid),
                fetchTriageTasks(user.uid)
            ]);
            setNotifications(notifs);
            setTriageTasks(tasks);
        } catch (e) {
            console.error('Failed to fetch inbox data:', e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    // Cleanup undo timer on unmount
    useEffect(() => {
        return () => {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        };
    }, []);

    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllAsRead(user.uid);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleArchiveRead = async () => {
        if (!user) return;
        await archiveAllRead(user.uid);
        setNotifications(prev => prev.filter(n => !n.read));
    };

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const handleArchive = async (id: string) => {
        await archiveNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // ─── Accept with Undo ───
    const handleAcceptTask = async (task: Task) => {
        if (!user) return;
        // Optimistic: remove from triage immediately
        setTriageTasks(prev => prev.filter(t => t.id !== task.id));

        // Show undo snackbar first, then actually execute after 5s
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoSnack({
            message: textByLang(`"${task.text}" accepted`, `"${task.text}" 수락됨`),
            task,
            action: 'accept',
        });
        undoTimerRef.current = setTimeout(async () => {
            try {
                await updateTaskTriageStatus(task.id, 'accepted');
            } catch (error) {
                console.error('Failed to accept task', error);
                setTriageTasks(prev => [task, ...prev]);
            }
            setUndoSnack(null);
        }, 5000);
    };

    // ─── Decline with Undo ───
    const handleDeclineTask = async (task: Task) => {
        if (!user) return;
        // Optimistic: remove from triage, add to declined
        setTriageTasks(prev => prev.filter(t => t.id !== task.id));
        setDeclinedTasks(prev => [task, ...prev]);

        // Show undo snackbar, execute actual deletion after 5s
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoSnack({
            message: textByLang(`"${task.text}" declined`, `"${task.text}" 거절됨`),
            task,
            action: 'decline',
        });
        undoTimerRef.current = setTimeout(async () => {
            try {
                await unassignTask(task.id, user.uid);
            } catch (error) {
                console.error('Failed to decline task', error);
                // Revert
                setDeclinedTasks(prev => prev.filter(t => t.id !== task.id));
                setTriageTasks(prev => [task, ...prev]);
            }
            setUndoSnack(null);
        }, 5000);
    };

    // ─── Undo Handler ───
    const handleUndo = () => {
        if (!undoSnack) return;
        // Cancel the pending server action
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }

        const { task, action } = undoSnack;
        // Restore to triage list
        setTriageTasks(prev => [task, ...prev]);
        if (action === 'decline') {
            setDeclinedTasks(prev => prev.filter(t => t.id !== task.id));
        }
        setUndoSnack(null);
    };

    // Navigate to the task's board/page
    const handleNavigateToTask = () => {
        navigate('/');
        setSelectedNotification(null);
        setSelectedTriageTask(null);
    };

    // Reply handler — persists via commentService
    const handleReply = async (n: Notification, message: string) => {
        if (!user) return;
        try {
            const { addComment } = await import('../services/commentService');
            await addComment({
                notificationId: n.id,
                taskId: n.taskId,
                authorUid: user.uid,
                authorName: user.displayName || 'User',
                authorPhoto: user.photoURL || undefined,
                body: message,
            });
        } catch (err) {
            console.error('Failed to save reply', err);
        }
    };

    // Notification click handler — opens dialog
    const handleNotificationClick = (n: Notification) => {
        if (!n.read) handleMarkRead(n.id);
        setSelectedNotification(n);
    };

    // Triage card click handler — opens dialog
    const handleTriageClick = (task: Task) => {
        setSelectedTriageTask(task);
    };

    // Group by date
    const groupByDate = (items: Notification[]) => {
        const now = new Date();
        const todayStr = now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        const groups: { label: string; items: Notification[] }[] = [];
        const todayItems: Notification[] = [];
        const yesterdayItems: Notification[] = [];
        const earlierItems: Notification[] = [];

        items.forEach(n => {
            const d = new Date(n.createdAt).toDateString();
            if (d === todayStr) todayItems.push(n);
            else if (d === yesterdayStr) yesterdayItems.push(n);
            else earlierItems.push(n);
        });

        if (todayItems.length) groups.push({ label: t('today') as string, items: todayItems });
        if (yesterdayItems.length) groups.push({ label: t('yesterday') as string, items: yesterdayItems });
        if (earlierItems.length) groups.push({ label: t('earlier') as string, items: earlierItems });

        return groups;
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const groups = groupByDate(notifications);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 720, mx: 'auto' }}>
            {/* Header / Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 48 }}>
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {textByLang('Triage', '트리아지')}
                                {triageTasks.length > 0 && (
                                    <Chip label={triageTasks.length} size="small" color="error"
                                        sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                                )}
                            </Box>
                        }
                    />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {textByLang('Notifications', '알림')}
                                {unreadCount > 0 && (
                                    <Chip label={unreadCount} size="small" color="primary"
                                        sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                                )}
                            </Box>
                        }
                    />
                </Tabs>
            </Box>

            {/* Header Actions (Only for Notifications tab) */}
            {tab === 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 0.5 }}>
                    <Tooltip title={t('markAllRead') as string}>
                        <span>
                            <IconButton size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <DoneAllIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title={t('archiveRead') as string}>
                        <span>
                            <IconButton size="small" onClick={handleArchiveRead}
                                disabled={!notifications.some(n => n.read)}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                <ArchiveIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            )}

            {/* Triage Tab */}
            {tab === 0 && (
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {triageTasks.length === 0 && declinedTasks.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, opacity: 0.6 }}>
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.light', mb: 2 }} />
                            <Typography variant="h6" fontWeight={700}>{textByLang('All caught up!', '모두 확인했어요!')}</Typography>
                            <Typography variant="body2" color="text.secondary">{textByLang('No new tasks to triage.', '트리아지할 새 작업이 없습니다.')}</Typography>
                        </Box>
                    ) : (
                        <>
                            {/* Active triage items */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {triageTasks.map(task => (
                                    <Card key={task.id} variant="outlined"
                                        onClick={() => handleTriageClick(task)}
                                        sx={{
                                            borderRadius: 3, cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                                                borderColor: 'primary.main',
                                                transform: 'translateY(-1px)',
                                            },
                                        }}
                                    >
                                        <CardContent sx={{ pb: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {projects.find(p => p.id === task.projectId)?.name || textByLang('No Project', '프로젝트 없음')}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {getTimeAgo(task.createdAt, lang)}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                                                {task.text}
                                            </Typography>
                                            {task.description && (
                                                <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {task.description}
                                                </Typography>
                                            )}
                                            <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block', fontWeight: 600, fontSize: '0.65rem' }}>
                                                {textByLang('Click to view details →', '클릭하여 상세 보기 →')}
                                            </Typography>
                                        </CardContent>
                                        <Divider />
                                        <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, py: 1.5 }}>
                                            <Button size="small" startIcon={<CloseIcon />} color="inherit"
                                                onClick={(e) => { e.stopPropagation(); handleDeclineTask(task); }}>
                                                {textByLang('Decline', '거절')}
                                            </Button>
                                            <Button size="small" startIcon={<CheckIcon />} variant="contained"
                                                onClick={(e) => { e.stopPropagation(); handleAcceptTask(task); }}>
                                                {textByLang('Accept', '수락')}
                                            </Button>
                                        </CardActions>
                                    </Card>
                                ))}
                            </Box>

                            {/* ─── Declined Tasks Section ─── */}
                            {declinedTasks.length > 0 && (
                                <Box sx={{ mt: 3 }}>
                                    <Button
                                        size="small"
                                        startIcon={showDeclined ? <CloseIcon /> : <HistoryIcon />}
                                        onClick={() => setShowDeclined(!showDeclined)}
                                        sx={{
                                            mb: 1.5, fontWeight: 600, textTransform: 'none',
                                            color: 'text.secondary', fontSize: '0.8rem',
                                        }}
                                    >
                                        {showDeclined
                                            ? textByLang('Hide declined', '거절 목록 숨기기')
                                            : textByLang(`Show declined (${declinedTasks.length})`, `거절된 항목 (${declinedTasks.length})`)
                                        }
                                    </Button>

                                    {showDeclined && (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {declinedTasks.map(task => (
                                                <Card key={task.id} variant="outlined"
                                                    sx={{
                                                        borderRadius: 2, opacity: 0.7,
                                                        borderStyle: 'dashed',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': { opacity: 1 },
                                                    }}
                                                >
                                                    <CardContent sx={{ pb: 1, pt: 1.5 }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                <Typography variant="body2" fontWeight={600} noWrap sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                                                                    {task.text}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.disabled">
                                                                    {projects.find(p => p.id === task.projectId)?.name || ''}
                                                                </Typography>
                                                            </Box>
                                                            <Tooltip title={textByLang('Restore to triage', '트리아지로 복원')}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setDeclinedTasks(prev => prev.filter(t => t.id !== task.id));
                                                                        setTriageTasks(prev => [task, ...prev]);
                                                                    }}
                                                                    sx={{
                                                                        border: '1px solid', borderColor: 'divider',
                                                                        borderRadius: 1.5,
                                                                    }}
                                                                >
                                                                    <UndoIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            )}

            {/* Notifications Tab */}
            {tab === 1 && (
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {notifications.length === 0 && (
                        <Box sx={{
                            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                            gap: 2, opacity: 0.6, py: 8
                        }}>
                            <Box sx={{
                                width: 80, height: 80, borderRadius: '50%',
                                bgcolor: 'rgba(99,102,241,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <InboxIcon sx={{ fontSize: 40, color: '#6366f1' }} />
                            </Box>
                            <Typography variant="h6" fontWeight={700}>{t('inboxEmpty') as string}</Typography>
                            <Typography variant="body2" color="text.secondary">{t('inboxEmptyDesc') as string}</Typography>
                        </Box>
                    )}

                    {groups.map(group => (
                        <Box key={group.label} sx={{ mb: 2 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                                sx={{ px: 1, mb: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1 }}>
                                {group.label}
                            </Typography>

                            {group.items.map((n, idx) => {
                                const config = NOTIFICATION_TYPE_CONFIG[n.type];
                                const timeAgo = getTimeAgo(n.createdAt, lang);

                                return (
                                    <Box key={n.id}>
                                        <Box
                                            onClick={() => handleNotificationClick(n)}
                                            sx={{
                                                display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5,
                                                borderRadius: 2, cursor: 'pointer',
                                                bgcolor: n.read ? 'transparent' : (theme) => alpha(theme.palette.primary.main, 0.04),
                                                borderLeft: n.read ? '3px solid transparent' : `3px solid ${config.color}`,
                                                transition: 'all 0.15s ease',
                                                '&:hover': {
                                                    bgcolor: (theme) => alpha(theme.palette.action.hover, 0.08),
                                                    '& .action-buttons': { opacity: 1 },
                                                },
                                            }}
                                        >
                                            {/* Actor Avatar */}
                                            <Avatar
                                                src={n.actorPhoto}
                                                sx={{
                                                    width: 36, height: 36, fontSize: 14, fontWeight: 700,
                                                    bgcolor: config.color, mt: 0.3,
                                                }}
                                            >
                                                {n.actorName?.charAt(0) || config.icon}
                                            </Avatar>

                                            {/* Content */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                                                    <Typography variant="body2" fontWeight={n.read ? 400 : 700} noWrap>
                                                        {n.title}
                                                    </Typography>
                                                    {!n.read && (
                                                        <Box sx={{
                                                            width: 6, height: 6, borderRadius: '50%', bgcolor: '#6366f1', flexShrink: 0,
                                                        }} />
                                                    )}
                                                </Box>

                                                <Typography variant="body2" color="text.secondary" sx={{
                                                    fontSize: '0.82rem', lineHeight: 1.4,
                                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                }}>
                                                    {n.body}
                                                </Typography>

                                                {/* Context chips */}
                                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.8, flexWrap: 'wrap' }}>
                                                    {n.projectName && (
                                                        <Chip label={n.projectName} size="small"
                                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }} />
                                                    )}
                                                    {n.sprintName && (
                                                        <Chip label={n.sprintName} size="small" variant="outlined"
                                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }} />
                                                    )}
                                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', lineHeight: '18px' }}>
                                                        {timeAgo}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Action buttons */}
                                            <Box className="action-buttons" sx={{
                                                display: 'flex', gap: 0.3, opacity: 0, transition: 'opacity 0.15s ease',
                                                flexShrink: 0,
                                            }}>
                                                {!n.read && (
                                                    <Tooltip title={t('markAllRead') as string} arrow>
                                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}>
                                                            <CheckIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title={t('archiveRead') as string} arrow>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleArchive(n.id); }}>
                                                        <ArchiveIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                        {idx < group.items.length - 1 && <Divider sx={{ mx: 1 }} />}
                                    </Box>
                                );
                            })}
                        </Box>
                    ))}
                </Box>
            )}

            {/* ─── Detail Dialogs ─── */}
            <NotificationDetailDialog
                open={!!selectedNotification}
                notification={selectedNotification}
                onClose={() => setSelectedNotification(null)}
                onNavigate={handleNavigateToTask}
                onReply={handleReply}
                lang={lang}
            />
            <TriageDetailDialog
                open={!!selectedTriageTask}
                task={selectedTriageTask}
                projectName={projects.find(p => p.id === selectedTriageTask?.projectId)?.name || textByLang('No Project', '프로젝트 없음')}
                onClose={() => setSelectedTriageTask(null)}
                onAccept={handleAcceptTask}
                onDecline={handleDeclineTask}
                onNavigate={handleNavigateToTask}
                lang={lang}
            />

            {/* ─── Undo Snackbar ─── */}
            <Snackbar
                open={!!undoSnack}
                autoHideDuration={5000}
                onClose={() => setUndoSnack(null)}
                TransitionComponent={Slide}
                message={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {undoSnack?.action === 'decline'
                            ? <CloseIcon sx={{ fontSize: 16, color: '#fbbf24' }} />
                            : <CheckCircleIcon sx={{ fontSize: 16, color: '#34d399' }} />
                        }
                        <Typography variant="body2" sx={{ maxWidth: 300 }} noWrap>
                            {undoSnack?.message}
                        </Typography>
                    </Box>
                }
                action={
                    <Button
                        color="warning"
                        size="small"
                        startIcon={<UndoIcon />}
                        onClick={handleUndo}
                        sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                        {textByLang('Undo', '되돌리기')}
                    </Button>
                }
                sx={{
                    '& .MuiSnackbarContent-root': {
                        borderRadius: 2.5,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#1e293b',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                    },
                }}
            />
        </Box>
    );
};

// Simple time-ago helper
function getTimeAgo(dateStr: string, lang: 'ko' | 'en'): string {
    const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return textByLang('just now', '방금 전');
    if (mins < 60) return textByLang(`${mins}m ago`, `${mins}분 전`);
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return textByLang(`${hrs}h ago`, `${hrs}시간 전`);
    const days = Math.floor(hrs / 24);
    if (days < 7) return textByLang(`${days}d ago`, `${days}일 전`);
    return new Date(dateStr).toLocaleDateString();
}

export default InboxPage;
