// src/pages/InboxPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Avatar, IconButton, Tooltip, Chip,
    CircularProgress, Divider, alpha, Tabs, Tab, Button, Card, CardContent, CardActions,
    Snackbar, Slide,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ArchiveIcon from '@mui/icons-material/Archive';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import HistoryIcon from '@mui/icons-material/History';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import {
    fetchNotifications, markAsRead, markAllAsRead, archiveNotification, archiveAllRead,
} from '../services/notificationService';
import { fetchTriageTasks, updateTaskTriageStatus, unassignTask } from '../services/taskService';
import type { Notification, Task } from '../types';
import { NOTIFICATION_TYPE_CONFIG } from '../types';
import { handleError } from '../utils/errorHandler';

import { getTimeAgo } from '../components/inbox/getTimeAgo';
import NotificationDetailDialog from '../components/inbox/NotificationDetailDialog';
import TriageDetailDialog from '../components/inbox/TriageDetailDialog';

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
                setTriageTasks(prev => [task, ...prev]);
                handleError(error, { fallbackMessage: 'Failed to accept task' });
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
            handleError(err, { fallbackMessage: 'Failed to save reply' });
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
                        <Box sx={{
                            py: 10, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
                            borderRadius: 4, border: '1px dashed', borderColor: 'divider',
                            backdropFilter: 'blur(10px)', mt: 2, mb: 4
                        }}>
                            <Box sx={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 8px 32px rgba(16, 185, 129, 0.25)', mb: 1
                            }}>
                                <Typography fontSize="2.5rem">☕</Typography>
                            </Box>
                            <Typography variant="h6" fontWeight={800} color="text.primary">
                                {textByLang('All caught up!', '모두 확인했어요!')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" align="center" fontWeight={500} sx={{ maxWidth: 350, lineHeight: 1.6 }}>
                                {textByLang('No new tasks to triage.', '트리아지할 새 작업이 없습니다.')}
                            </Typography>
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
                            py: 10, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                            borderRadius: 4, border: '1px dashed', borderColor: 'divider',
                            backdropFilter: 'blur(10px)', mt: 2, mb: 4
                        }}>
                            <Box sx={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.25)', mb: 1
                            }}>
                                <Typography fontSize="2.5rem">📭</Typography>
                            </Box>
                            <Typography variant="h6" fontWeight={800} color="text.primary">
                                {t('inboxEmpty') as string}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" align="center" fontWeight={500} sx={{ maxWidth: 350, lineHeight: 1.6 }}>
                                {t('inboxEmptyDesc') as string}
                            </Typography>
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

export default InboxPage;
