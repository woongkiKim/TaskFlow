// src/pages/InboxPage.tsx
import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Avatar, IconButton, Tooltip, Chip,
    CircularProgress, Divider, alpha, Tabs, Tab, Button, Card, CardContent, CardActions,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ArchiveIcon from '@mui/icons-material/Archive';
import CheckIcon from '@mui/icons-material/Check';
import InboxIcon from '@mui/icons-material/Inbox';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
    fetchNotifications, markAsRead, markAllAsRead, archiveNotification, archiveAllRead,
} from '../services/notificationService';
import { fetchTriageTasks, updateTaskTriageStatus, unassignTask } from '../services/taskService';
import type { Notification, Task } from '../types';
import { NOTIFICATION_TYPE_CONFIG } from '../types';

const InboxPage = () => {
    const { t, lang } = useLanguage();
    const textByLang = (enText: string, koText: string) => (lang === 'ko' ? koText : enText);
    const { user } = useAuth();
    const { projects } = useWorkspace();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [triageTasks, setTriageTasks] = useState<Task[]>([]);
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);

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

    const handleAcceptTask = async (task: Task) => {
        if (!user) return;
        try {
            // Optimistic update
            setTriageTasks(prev => prev.filter(t => t.id !== task.id));
            await updateTaskTriageStatus(task.id, 'accepted');
        } catch (error) {
            // Revert on error? For now just log
            console.error('Failed to accept task', error);
            loadNotifications(); // Reload
        }
    };

    const handleDeclineTask = async (task: Task) => {
        if (!user) return;
        try {
            setTriageTasks(prev => prev.filter(t => t.id !== task.id));
            await unassignTask(task.id, user.uid);
        } catch (error) {
            console.error('Failed to decline task', error);
            loadNotifications();
        }
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

    // Auto-switch to Triage if there are items and no unread notifications?
    // optional logic.

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
                    {triageTasks.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, opacity: 0.6 }}>
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.light', mb: 2 }} />
                            <Typography variant="h6" fontWeight={700}>{textByLang('All caught up!', '모두 확인했어요!')}</Typography>
                            <Typography variant="body2" color="text.secondary">{textByLang('No new tasks to triage.', '트리아지할 새 작업이 없습니다.')}</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {triageTasks.map(task => (
                                <Card key={task.id} variant="outlined" sx={{ borderRadius: 3 }}>
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
                                    </CardContent>
                                    <Divider />
                                    <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, py: 1.5 }}>
                                        <Button size="small" startIcon={<CloseIcon />} color="inherit" onClick={() => handleDeclineTask(task)}>
                                            {textByLang('Decline', '거절')}
                                        </Button>
                                        <Button size="small" startIcon={<CheckIcon />} variant="contained" onClick={() => handleAcceptTask(task)}>
                                            {textByLang('Accept', '수락')}
                                        </Button>
                                    </CardActions>
                                </Card>
                            ))}
                        </Box>
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
                                            onClick={() => !n.read && handleMarkRead(n.id)}
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
