// src/components/wiki/AuthorProfileCard.tsx
import React, { useMemo } from 'react';
import {
  Popover, Box, Typography, Avatar, Chip, Divider, TextField, IconButton, Button, CircularProgress, Fade,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { getDisplayTitle } from '../../utils/wikiUtils';
import type { WikiDocument, TeamGroup } from '../../types';

interface AuthorProfileCardProps {
  lang: string;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  authorUid: string | null;
  currentMembers: Array<{ uid: string; displayName: string; email: string; photoURL?: string; role?: string }>;
  teamGroups: TeamGroup[];
  docs: WikiDocument[];
  messageText: string;
  setMessageText: (t: string) => void;
  sendingMessage: boolean;
  onSendMessage: () => void;
  onFilterByAuthor: (uid: string) => void;
  onNavigateToTasks: () => void;
  onSelectDoc: (doc: WikiDocument) => void;
}

const AuthorProfileCard: React.FC<AuthorProfileCardProps> = ({
  lang, anchorEl, onClose, authorUid, currentMembers, teamGroups, docs,
  messageText, setMessageText, sendingMessage, onSendMessage,
  onFilterByAuthor, onNavigateToTasks, onSelectDoc,
}) => {
  const authorMember = useMemo(() => {
    if (!authorUid || !currentMembers) return null;
    return currentMembers.find(m => m.uid === authorUid) || null;
  }, [authorUid, currentMembers]);

  const authorTeamGroup = useMemo(() => {
    if (!authorUid || !teamGroups) return null;
    return teamGroups.find(tg => tg.memberIds?.includes(authorUid)) || null;
  }, [authorUid, teamGroups]);

  const authorDocs = useMemo(() => {
    if (!authorUid) return [];
    return docs.filter(d => d.createdBy === authorUid && !d.isFolder).slice(0, 5);
  }, [authorUid, docs]);

  if (!authorMember) return null;

  return (
    <Popover
      open={!!anchorEl}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      TransitionComponent={Fade}
      PaperProps={{ sx: { borderRadius: 4, width: 360, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' } }}
    >
      <Box>
        {/* Profile Header */}
        <Box sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', p: 2.5, pb: 4, position: 'relative' }}>
          <Avatar src={authorMember.photoURL || ''} sx={{ width: 56, height: 56, border: '3px solid white', fontSize: '1.3rem', fontWeight: 700, bgcolor: alpha('#fff', 0.25), color: '#fff' }}>
            {(authorMember.displayName || '?')[0]}
          </Avatar>
          <Typography variant="h6" fontWeight={800} sx={{ color: 'white', mt: 1, lineHeight: 1.2 }}>{authorMember.displayName}</Typography>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.8) }}>{authorMember.email}</Typography>
        </Box>

        {/* Badges Row */}
        <Box sx={{ display: 'flex', gap: 0.8, px: 2.5, mt: -1.5, flexWrap: 'wrap' }}>
          <Chip
            label={authorMember.role === 'admin' || authorMember.role === 'owner' ? '👑 Admin' : authorMember.role === 'maintainer' ? '🔧 Maintainer' : authorMember.role === 'member' ? '👤 Member' : '👀 Viewer'}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid', borderColor: authorMember.role === 'admin' ? '#f59e0b' : '#e2e8f0', color: authorMember.role === 'admin' ? '#d97706' : 'text.primary' }}
          />
          {authorTeamGroup && (
            <Chip label={`🏢 ${authorTeamGroup.name}`} size="small"
              sx={{ fontWeight: 600, fontSize: '0.7rem', height: 24, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid', borderColor: authorTeamGroup.color || '#e2e8f0', color: authorTeamGroup.color || 'text.secondary' }} />
          )}
        </Box>

        {/* Quick Stats */}
        <Box sx={{ px: 2.5, mt: 2, display: 'flex', gap: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={800} color="primary">{docs.filter(d => d.createdBy === authorUid && !d.isFolder).length}</Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>{lang === 'ko' ? '작성 문서' : 'Documents'}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#10b981' }}>{docs.filter(d => d.updatedBy === authorUid && !d.isFolder).length}</Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>{lang === 'ko' ? '수정 참여' : 'Edits'}</Typography>
          </Box>
        </Box>

        {/* Recent Documents */}
        {authorDocs.length > 0 && (
          <Box sx={{ px: 2.5, mt: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.8, display: 'block', letterSpacing: 0.5 }}>
              📄 {lang === 'ko' ? '최근 작성 문서' : 'Recent Documents'}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {authorDocs.map(ad => (
                <Box key={ad.id} onClick={() => { onClose(); onSelectDoc(ad); }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1, borderRadius: 1.5, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: alpha('#6366f1', 0.06) } }}>
                  <Typography sx={{ fontSize: '0.9rem' }}>{ad.icon || '📄'}</Typography>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, fontSize: '0.82rem' }}>{getDisplayTitle(ad.title, ad.icon)}</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', flexShrink: 0 }}>{ad.createdAt?.slice(0, 10)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ mt: 2, mb: 0 }} />

        {/* Quick Message */}
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.8, display: 'block', letterSpacing: 0.5 }}>
            💬 {lang === 'ko' ? '빠른 메시지' : 'Quick Message'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.8 }}>
            <TextField size="small" fullWidth placeholder={lang === 'ko' ? '메시지를 입력하세요...' : 'Type a message...'} value={messageText} onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(); } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }} />
            <IconButton size="small" onClick={onSendMessage} disabled={!messageText.trim() || sendingMessage}
              sx={{ bgcolor: '#6366f1', color: 'white', borderRadius: 2, '&:hover': { bgcolor: '#4f46e5' }, '&.Mui-disabled': { bgcolor: alpha('#6366f1', 0.3), color: alpha('#fff', 0.5) }, width: 36, height: 36 }}>
              {sendingMessage ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Box>
        </Box>

        <Divider />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 0, px: 0.5, py: 0.5 }}>
          <Button size="small" fullWidth startIcon={<ArticleOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => onFilterByAuthor(authorMember.uid)}
            sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.78rem', py: 1, color: '#6366f1' }}>{lang === 'ko' ? '문서 보기' : 'View Docs'}</Button>
          <Button size="small" fullWidth startIcon={<EmailOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => { if (authorMember.email) window.open(`mailto:${authorMember.email}`, '_blank'); }}
            sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.78rem', py: 1, color: '#3b82f6' }}>{lang === 'ko' ? '이메일' : 'Email'}</Button>
          <Button size="small" fullWidth startIcon={<AssignmentOutlinedIcon sx={{ fontSize: 16 }} />} onClick={() => { onClose(); onNavigateToTasks(); }}
            sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.78rem', py: 1, color: '#10b981' }}>{lang === 'ko' ? '업무 할당' : 'Assign Task'}</Button>
        </Box>
      </Box>
    </Popover>
  );
};

export default AuthorProfileCard;
