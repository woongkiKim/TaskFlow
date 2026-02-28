// src/pages/DiscussionPage.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box, Typography, Paper, Avatar, TextField, Button, Chip, Divider, IconButton,
  alpha, useTheme, Fade, InputAdornment, Tooltip, Menu, MenuItem, Badge,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AddIcon from '@mui/icons-material/Add';
import ForumIcon from '@mui/icons-material/Forum';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TagIcon from '@mui/icons-material/Tag';
import { format, formatDistanceToNow } from 'date-fns';
import { ko as koLocale, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const t = (lang: string, en: string, ko: string) => (lang === 'ko' ? ko : en);

// ─── Types ───
interface DiscussionThread {
  id: string;
  workspaceId: string;
  title: string;
  channel: string;   // e.g. 'general', 'dev', project id
  channelName: string;
  createdBy: string;
  createdByName: string;
  createdByPhoto?: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  pinned?: boolean;
  resolved?: boolean;
  tags?: string[];
}

interface DiscussionMessage {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: string;
  reactions?: Record<string, string[]>; // emoji → uid[]
  replyTo?: string;
}

// ─── Mock data ───
const CHANNELS = [
  { id: 'general', name: '일반', nameEn: 'General', icon: '💬', color: '#6366f1' },
  { id: 'dev', name: '개발', nameEn: 'Development', icon: '⚙️', color: '#3b82f6' },
  { id: 'design', name: '디자인', nameEn: 'Design', icon: '🎨', color: '#8b5cf6' },
  { id: 'random', name: '자유', nameEn: 'Random', icon: '🎲', color: '#f59e0b' },
];

const EMOJIS = ['👍', '❤️', '🎉', '🤔', '👀', '🔥', '💯', '✅'];

const generateMockThreads = (workspaceId: string): DiscussionThread[] => [
  { id: 'dt_1', workspaceId, title: 'Sprint 3 킥오프 회의 정리', channel: 'general', channelName: '일반', createdBy: 'u1', createdByName: '김영수', createdAt: '2026-02-22T09:00:00Z', lastMessageAt: '2026-02-22T14:30:00Z', messageCount: 12, pinned: true, tags: ['회의', '스프린트'] },
  { id: 'dt_2', workspaceId, title: 'React 19 마이그레이션 논의', channel: 'dev', channelName: '개발', createdBy: 'u2', createdByName: '박지민', createdAt: '2026-02-21T15:00:00Z', lastMessageAt: '2026-02-22T11:45:00Z', messageCount: 8, tags: ['react', '마이그레이션'] },
  { id: 'dt_3', workspaceId, title: '새 컬러 시스템 피드백', channel: 'design', channelName: '디자인', createdBy: 'u3', createdByName: '이서연', createdAt: '2026-02-20T10:00:00Z', lastMessageAt: '2026-02-22T08:20:00Z', messageCount: 15, tags: ['UI', '디자인시스템'] },
  { id: 'dt_4', workspaceId, title: '점심 메뉴 추천 🍕', channel: 'random', channelName: '자유', createdBy: 'u1', createdByName: '김영수', createdAt: '2026-02-22T11:30:00Z', lastMessageAt: '2026-02-22T12:00:00Z', messageCount: 5 },
  { id: 'dt_5', workspaceId, title: 'CI/CD 파이프라인 개선안', channel: 'dev', channelName: '개발', createdBy: 'u4', createdByName: '최현우', createdAt: '2026-02-19T14:00:00Z', lastMessageAt: '2026-02-21T16:30:00Z', messageCount: 20, pinned: true, tags: ['CI/CD', 'DevOps'] },
  { id: 'dt_6', workspaceId, title: '2분기 OKR 초안 검토', channel: 'general', channelName: '일반', createdBy: 'u2', createdByName: '박지민', createdAt: '2026-02-18T09:00:00Z', lastMessageAt: '2026-02-20T17:00:00Z', messageCount: 25, resolved: true, tags: ['OKR', '분기계획'] },
];

const generateMockMessages = (threadId: string): DiscussionMessage[] => {
  const msgs: DiscussionMessage[] = [
    { id: `${threadId}_m1`, threadId, content: '이번 스프린트 목표에 대해 정리했습니다. 주요 포인트:\n1. API 리팩토링 완료\n2. 신규 대시보드 UI 구현\n3. 성능 최적화 (LCP < 2.5s)', authorId: 'u1', authorName: '김영수', createdAt: '2026-02-22T09:00:00Z', reactions: { '👍': ['u2', 'u3'], '🔥': ['u4'] } },
    { id: `${threadId}_m2`, threadId, content: 'API 리팩토링은 제가 담당하겠습니다. GraphQL 도입도 같이 검토하면 좋겠어요.', authorId: 'u2', authorName: '박지민', createdAt: '2026-02-22T09:15:00Z', reactions: { '👍': ['u1'] } },
    { id: `${threadId}_m3`, threadId, content: '대시보드 UI 와이어프레임은 오늘 중으로 공유할게요! 🎨', authorId: 'u3', authorName: '이서연', createdAt: '2026-02-22T09:30:00Z' },
    { id: `${threadId}_m4`, threadId, content: '성능 최적화 관련해서 Lighthouse 보고서 첨부합니다. 현재 LCP 3.2s인데, lazy loading으로 개선 가능해 보입니다.', authorId: 'u4', authorName: '최현우', createdAt: '2026-02-22T10:00:00Z', reactions: { '👀': ['u1', 'u2'] } },
    { id: `${threadId}_m5`, threadId, content: '좋은 분석이에요! 이미지 최적화도 같이 진행하면 좋을 것 같습니다. next/image 도입을 검토해 봐요.', authorId: 'u1', authorName: '김영수', createdAt: '2026-02-22T10:30:00Z' },
    { id: `${threadId}_m6`, threadId, content: '다음 주 수요일까지 각자 파트 진행 상황 업데이트해 주세요 📋', authorId: 'u2', authorName: '박지민', createdAt: '2026-02-22T14:30:00Z', reactions: { '✅': ['u1', 'u3', 'u4'] } },
  ];
  return msgs;
};

export default function DiscussionPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { currentWorkspace: workspace } = useWorkspace();

  const [threads, setThreads] = useState<DiscussionThread[]>(() =>
    workspace?.id ? generateMockThreads(workspace.id) : []
  );
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<DiscussionThread | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadChannel, setNewThreadChannel] = useState('general');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuThread, setMenuThread] = useState<DiscussionThread | null>(null);
  const [reactionAnchorEl, setReactionAnchorEl] = useState<null | HTMLElement>(null);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const dateFnsLocale = lang === 'ko' ? koLocale : enUS;

  // Reload threads when workspace changes
  useEffect(() => {
    if (workspace?.id) {
      // Use a microtask to avoid synchronous setState in effect
      queueMicrotask(() => setThreads(generateMockThreads(workspace.id)));
    }
  }, [workspace?.id]);

  // Load messages when thread is selected
  useEffect(() => {
    if (selectedThread) {
      queueMicrotask(() => setMessages(generateMockMessages(selectedThread.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredThreads = useMemo(() => {
    let result = threads;
    if (selectedChannel !== 'all') result = result.filter(th => th.channel === selectedChannel);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(th => th.title.toLowerCase().includes(q) || th.createdByName.toLowerCase().includes(q));
    }
    // Pinned first, then by last message
    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.lastMessageAt.localeCompare(a.lastMessageAt);
    });
  }, [threads, selectedChannel, searchQuery]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedThread || !user) return;
    const msg: DiscussionMessage = {
      id: `msg_${Date.now()}`, threadId: selectedThread.id,
      content: newMessage.trim(), authorId: user.uid,
      authorName: user.displayName || 'User', authorPhoto: user.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    setThreads(prev => prev.map(th => th.id === selectedThread.id
      ? { ...th, messageCount: th.messageCount + 1, lastMessageAt: msg.createdAt }
      : th
    ));
    setNewMessage('');
  }, [newMessage, selectedThread, user]);

  const handleCreateThread = useCallback(() => {
    if (!newThreadTitle.trim() || !workspace?.id || !user) return;
    const ch = CHANNELS.find(c => c.id === newThreadChannel) || CHANNELS[0];
    const thread: DiscussionThread = {
      id: `dt_${Date.now()}`, workspaceId: workspace.id,
      title: newThreadTitle.trim(), channel: newThreadChannel,
      channelName: lang === 'ko' ? ch.name : ch.nameEn,
      createdBy: user.uid, createdByName: user.displayName || 'User',
      createdByPhoto: user.photoURL || undefined,
      createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString(),
      messageCount: 0,
    };
    setThreads(prev => [thread, ...prev]);
    setNewThreadOpen(false); setNewThreadTitle(''); setNewThreadChannel('general');
    setSelectedThread(thread);
    toast.success(t(lang, 'Thread created!', '스레드가 생성되었습니다!'));
  }, [newThreadTitle, newThreadChannel, workspace?.id, user, lang]);

  const togglePin = (th: DiscussionThread) => {
    setThreads(prev => prev.map(t => t.id === th.id ? { ...t, pinned: !t.pinned } : t));
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !user) return m;
      const reactions = { ...(m.reactions || {}) };
      const existing = reactions[emoji] || [];
      if (existing.includes(user.uid)) {
        reactions[emoji] = existing.filter(uid => uid !== user.uid);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...existing, user.uid];
      }
      return { ...m, reactions };
    }));
  };

  const cardSx = {
    borderRadius: 3, border: '1px solid', borderColor: 'divider',
    transition: 'all 0.15s ease',
  };

  return (
    <Fade in timeout={400}>
      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, mx: 'auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>

        {/* ═══ HEADER ═══ */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          {selectedThread && (
            <IconButton size="small" onClick={() => setSelectedThread(null)} sx={{ display: { md: 'none' } }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <ForumIcon sx={{ color: '#6366f1', fontSize: 28 }} />
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5 }}>
            {t(lang, 'Discussions', '토론')}
          </Typography>
          <Chip label={threads.length} size="small" sx={{ fontWeight: 700, bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }} />
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setNewThreadOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {t(lang, 'New Thread', '새 스레드')}
          </Button>
        </Box>

        {/* ═══ MAIN LAYOUT ═══ */}
        <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0, overflow: 'hidden' }}>

          {/* ── Thread List (Left Panel) ── */}
          <Paper sx={{
            ...cardSx, width: { xs: selectedThread ? 0 : '100%', md: 340 }, flexShrink: 0,
            display: { xs: selectedThread ? 'none' : 'flex', md: 'flex' }, flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Channel Filter */}
            <Box sx={{ p: 1.5, display: 'flex', gap: 0.5, overflowX: 'auto', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
              <Chip label={t(lang, 'All', '전체')} size="small" onClick={() => setSelectedChannel('all')}
                variant={selectedChannel === 'all' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, cursor: 'pointer', ...(selectedChannel === 'all' && { bgcolor: '#6366f1', color: 'white' }) }} />
              {CHANNELS.map(ch => (
                <Chip key={ch.id} label={`${ch.icon} ${lang === 'ko' ? ch.name : ch.nameEn}`} size="small"
                  onClick={() => setSelectedChannel(ch.id)}
                  variant={selectedChannel === ch.id ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600, cursor: 'pointer', ...(selectedChannel === ch.id && { bgcolor: ch.color, color: 'white' }) }} />
              ))}
            </Box>
            {/* Search */}
            <Box sx={{ p: 1.5, flexShrink: 0 }}>
              <TextField fullWidth size="small" placeholder={t(lang, 'Search threads...', '스레드 검색...')}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>
                  }
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Box>
            {/* Thread List */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
              {filteredThreads.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.disabled" fontWeight={600}>
                    {t(lang, 'No threads found', '스레드가 없습니다')}
                  </Typography>
                </Box>
              ) : (
                filteredThreads.map(th => {
                  const isActive = selectedThread?.id === th.id;
                  return (
                    <Box key={th.id} onClick={() => setSelectedThread(th)}
                      sx={{
                        p: 1.5, mb: 0.5, borderRadius: 2, cursor: 'pointer',
                        bgcolor: isActive ? alpha('#6366f1', 0.08) : 'transparent',
                        border: '1px solid', borderColor: isActive ? alpha('#6366f1', 0.2) : 'transparent',
                        '&:hover': { bgcolor: isActive ? alpha('#6366f1', 0.1) : 'action.hover' },
                        transition: 'all 0.15s',
                      }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {th.pinned && <PushPinIcon sx={{ fontSize: 12, color: '#f59e0b', transform: 'rotate(45deg)' }} />}
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1, color: th.resolved ? 'text.disabled' : 'text.primary' }}>
                          {th.title}
                        </Typography>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuThread(th); }}
                          sx={{ opacity: 0.3, '&:hover': { opacity: 1 }, p: 0.3 }}>
                          <MoreVertIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`${CHANNELS.find(c => c.id === th.channel)?.icon || '#'} ${lang === 'ko' ? th.channelName : CHANNELS.find(c => c.id === th.channel)?.nameEn || th.channelName}`}
                          size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha(CHANNELS.find(c => c.id === th.channel)?.color || '#6366f1', 0.1), color: CHANNELS.find(c => c.id === th.channel)?.color || '#6366f1' }} />
                        <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
                          {th.createdByName}
                        </Typography>
                        <Badge badgeContent={th.messageCount} color="primary" max={99}
                          sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 16, height: 16, fontWeight: 700 } }}>
                          <ChatBubbleOutlineIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        </Badge>
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.5, fontSize: '0.65rem' }}>
                        <AccessTimeIcon sx={{ fontSize: 10 }} />
                        {formatDistanceToNow(new Date(th.lastMessageAt), { addSuffix: true, locale: dateFnsLocale })}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Box>
          </Paper>

          {/* ── Message View (Right Panel) ── */}
          <Paper sx={{
            ...cardSx, flex: 1, display: 'flex', flexDirection: 'column',
            ...(selectedThread ? {} : { display: { xs: 'none', md: 'flex' } }),
          }}>
            {!selectedThread ? (
              // Empty state
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <ForumIcon sx={{ fontSize: 60, color: alpha('#6366f1', 0.15) }} />
                <Typography variant="h6" fontWeight={700} color="text.secondary">
                  {t(lang, 'Select a thread to start chatting', '스레드를 선택하여 대화를 시작하세요')}
                </Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setNewThreadOpen(true)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                  {t(lang, 'Create New Thread', '새 스레드 만들기')}
                </Button>
              </Box>
            ) : (
              <>
                {/* Thread Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                  <IconButton size="small" onClick={() => setSelectedThread(null)} sx={{ display: { md: 'none' } }}>
                    <ArrowBackIcon />
                  </IconButton>
                  <TagIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>{selectedThread.title}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={`${CHANNELS.find(c => c.id === selectedThread.channel)?.icon || '#'} ${lang === 'ko' ? selectedThread.channelName : CHANNELS.find(c => c.id === selectedThread.channel)?.nameEn || selectedThread.channelName}`}
                        size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha(CHANNELS.find(c => c.id === selectedThread.channel)?.color || '#6366f1', 0.08) }} />
                      <Typography variant="caption" color="text.disabled">
                        {selectedThread.messageCount} {t(lang, 'messages', '메시지')}
                      </Typography>
                    </Box>
                  </Box>
                  <Tooltip title={selectedThread.pinned ? t(lang, 'Unpin', '고정 해제') : t(lang, 'Pin', '고정')}>
                    <IconButton size="small" onClick={() => togglePin(selectedThread)}>
                      {selectedThread.pinned ? <PushPinIcon sx={{ color: '#f59e0b' }} /> : <PushPinOutlinedIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {messages.map((msg, idx) => {
                    const isMe = msg.authorId === user?.uid;
                    const showAvatar = idx === 0 || messages[idx - 1].authorId !== msg.authorId;
                    return (
                      <Box key={msg.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                        {showAvatar ? (
                          <Avatar sx={{ width: 32, height: 32, bgcolor: isMe ? '#6366f1' : '#3b82f6', fontSize: '0.75rem', fontWeight: 700, mt: 0.5 }}>
                            {msg.authorName[0]}
                          </Avatar>
                        ) : (
                          <Box sx={{ width: 32 }} />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {showAvatar && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                              <Typography variant="body2" fontWeight={700} sx={{ color: isMe ? '#6366f1' : 'text.primary' }}>
                                {msg.authorName}
                              </Typography>
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                                {format(new Date(msg.createdAt), lang === 'ko' ? 'a h:mm' : 'h:mm a', { locale: dateFnsLocale })}
                              </Typography>
                            </Box>
                          )}
                          <Paper elevation={0} sx={{
                            p: 1.5, borderRadius: 2, bgcolor: isMe ? alpha('#6366f1', 0.06) : alpha('#f1f5f9', theme.palette.mode === 'dark' ? 0.05 : 1),
                            border: '1px solid', borderColor: isMe ? alpha('#6366f1', 0.12) : 'transparent',
                          }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {msg.content}
                            </Typography>
                          </Paper>
                          {/* Reactions */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                              {Object.entries(msg.reactions).map(([emoji, uids]) => (
                                <Chip key={emoji} label={`${emoji} ${uids.length}`} size="small"
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  variant={uids.includes(user?.uid || '') ? 'filled' : 'outlined'}
                                  sx={{
                                    height: 24, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                                    ...(uids.includes(user?.uid || '') && { bgcolor: alpha('#6366f1', 0.12), borderColor: alpha('#6366f1', 0.3) }),
                                  }} />
                              ))}
                              {/* Add reaction */}
                              <Tooltip title={t(lang, 'Add reaction', '반응 추가')}>
                                <Chip label="+" size="small" variant="outlined"
                                  onClick={(e) => {
                                    setReactionAnchorEl(e.currentTarget);
                                    setReactionMsgId(msg.id);
                                  }}
                                  sx={{ height: 24, fontSize: '0.7rem', cursor: 'pointer', opacity: 0.4, '&:hover': { opacity: 1 } }} />
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                  <Paper variant="outlined" sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5,
                    borderRadius: 3, borderColor: 'divider',
                    '&:focus-within': { borderColor: '#6366f1', boxShadow: `0 0 0 2px ${alpha('#6366f1', 0.1)}` },
                    transition: 'all 0.2s',
                  }}>
                    <IconButton size="small" sx={{ color: 'text.disabled' }}><EmojiEmotionsOutlinedIcon sx={{ fontSize: 20 }} /></IconButton>
                    <IconButton size="small" sx={{ color: 'text.disabled' }}><AttachFileIcon sx={{ fontSize: 20 }} /></IconButton>
                    <TextField fullWidth variant="standard" placeholder={t(lang, 'Type a message...', '메시지를 입력하세요...')}
                      value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      multiline maxRows={4}
                      slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.9rem' } } }} />
                    <IconButton size="small" color="primary" onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      sx={{
                        bgcolor: newMessage.trim() ? '#6366f1' : 'transparent',
                        color: newMessage.trim() ? 'white' : 'text.disabled',
                        '&:hover': { bgcolor: newMessage.trim() ? '#4f46e5' : 'action.hover' },
                        transition: 'all 0.2s',
                      }}>
                      <SendIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Paper>
                </Box>
              </>
            )}
          </Paper>
        </Box>

        {/* ═══ New Thread Dialog ═══ */}
        {newThreadOpen && (
          <Box sx={{
            position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }} onClick={() => setNewThreadOpen(false)}>
            <Paper onClick={e => e.stopPropagation()} sx={{
              p: 3, borderRadius: 4, width: '100%', maxWidth: 480,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ForumIcon sx={{ color: '#6366f1' }} />
                {t(lang, 'New Thread', '새 스레드')}
              </Typography>
              <TextField fullWidth size="small" autoFocus label={t(lang, 'Thread Title', '스레드 제목')}
                value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)}
                placeholder={t(lang, 'What do you want to discuss?', '어떤 주제로 토론하시겠어요?')}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t(lang, 'Channel', '채널')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 3, flexWrap: 'wrap' }}>
                {CHANNELS.map(ch => (
                  <Chip key={ch.id} label={`${ch.icon} ${lang === 'ko' ? ch.name : ch.nameEn}`} size="small"
                    onClick={() => setNewThreadChannel(ch.id)}
                    variant={newThreadChannel === ch.id ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, cursor: 'pointer', ...(newThreadChannel === ch.id && { bgcolor: ch.color, color: 'white' }) }} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={() => setNewThreadOpen(false)} sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}>
                  {t(lang, 'Cancel', '취소')}
                </Button>
                <Button variant="contained" onClick={handleCreateThread} disabled={!newThreadTitle.trim()}
                  sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {t(lang, 'Create', '생성')}
                </Button>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Thread Context Menu */}
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => { setMenuAnchor(null); setMenuThread(null); }}
          slotProps={{ paper: { sx: { borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } } }}>
          <MenuItem onClick={() => { if (menuThread) togglePin(menuThread); setMenuAnchor(null); }} sx={{ gap: 1, fontSize: '0.85rem' }}>
            {menuThread?.pinned ? <PushPinIcon sx={{ fontSize: 16 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 16 }} />}
            {menuThread?.pinned ? t(lang, 'Unpin', '고정 해제') : t(lang, 'Pin', '고정')}
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => {
            setThreads(prev => prev.filter(th => th.id !== menuThread?.id));
            if (selectedThread?.id === menuThread?.id) setSelectedThread(null);
            setMenuAnchor(null);
            toast.success(t(lang, 'Thread deleted', '스레드가 삭제되었습니다'));
          }} sx={{ gap: 1, fontSize: '0.85rem', color: 'error.main' }}>
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            {t(lang, 'Delete', '삭제')}
          </MenuItem>
        </Menu>

        {/* Reaction Picker Menu */}
        <Menu
          anchorEl={reactionAnchorEl}
          open={Boolean(reactionAnchorEl)}
          onClose={() => { setReactionAnchorEl(null); setReactionMsgId(null); }}
          slotProps={{ paper: { sx: { borderRadius: 3, p: 0.5, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' } } }}
          MenuListProps={{ sx: { display: 'flex', gap: 0.5, p: 0.5, flexWrap: 'wrap', maxWidth: 200 } }}
        >
          {EMOJIS.map(emoji => (
            <MenuItem
              key={emoji}
              onClick={() => {
                if (reactionMsgId) handleReaction(reactionMsgId, emoji);
                setReactionAnchorEl(null); setReactionMsgId(null);
              }}
              sx={{ minWidth: 'auto', p: 1, borderRadius: 2, fontSize: '1.25rem', '&:hover': { bgcolor: alpha('#6366f1', 0.1) } }}
            >
              {emoji}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Fade>
  );
}
