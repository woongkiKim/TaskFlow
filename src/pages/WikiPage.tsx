// src/pages/WikiPage.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Select, MenuItem, InputAdornment, Tooltip, ListItemIcon, ListItemText,
  CircularProgress, Menu, Divider, Autocomplete, alpha, Popover, Avatar, Fade,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ShareIcon from '@mui/icons-material/Share';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import LinkIcon from '@mui/icons-material/Link';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SyncIcon from '@mui/icons-material/Sync';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createNotification } from '../services/notificationService';

import { useLanguage } from '../contexts/LanguageContext';

import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import {
  createWikiDocument, updateWikiDocument, deleteWikiDocument,
  subscribeToWikiDocuments,
} from '../services/wikiService';
import { updatePresence, removePresence, subscribeToPresence } from '../services/presenceService';
import type { DocumentPresence } from '../types';
import BlockEditor from '../components/BlockEditor';
import ActivityFeed from '../components/ActivityFeed';
import { WIKI_VISIBILITY_CONFIG, type WikiVisibility } from '../types';
import type { WikiDocument, WikiComment, WikiVersion, TeamGroup } from '../types';
import {
  extractHeadings, renderMarkdown, getDisplayTitle, EMOJI_OPTIONS, FORMATTING_GUIDE,
  addRecentDocId, getRecentDocIds
} from '../utils/wikiUtils';
import { useWikiActions } from '../hooks/useWikiActions';
import { handleError } from '../utils/errorHandler';

const WikiPage = () => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const { currentWorkspace: workspace, currentMembers, teamGroups, projects } = useWorkspace();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<WikiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<WikiDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const editorContentRef = useRef('');
  const [editingDoc, setEditingDoc] = useState<Partial<WikiDocument>>({});
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createAnchor, setCreateAnchor] = useState<HTMLElement | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [helpAnchor, setHelpAnchor] = useState<HTMLElement | null>(null);
  // Folder creation dialog (replaces browser prompt())
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  // Author profile popover
  const [authorAnchor, setAuthorAnchor] = useState<HTMLElement | null>(null);
  const [authorUid, setAuthorUid] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  // Feature 1: Share
  // Feature 2: Recently viewed
  const [recentDocIds, setRecentDocIds] = useState<string[]>([]);
  // Feature 3: TOC
  const [showToc, setShowToc] = useState(true);
  // Feature 5: Version history
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  // Feature 6: Comments
  const [commentText, setCommentText] = useState('');
  const [wikiViewMode, setWikiViewMode] = useState<'card' | 'list'>(() => {
    try {
      return (localStorage.getItem('taskflow_wiki_view') as 'card' | 'list') || 'card';
    } catch {
      return 'card';
    }
  });
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<DocTemplate | null>(null);
  // Feature 8: Sort & Filter
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  // Feature 9: Read by popover
  const [readByAnchor, setReadByAnchor] = useState<HTMLElement | null>(null);
  // Feature 10: Presence
  const [activeViewers, setActiveViewers] = useState<DocumentPresence[]>([]);

  useEffect(() => {
    try { localStorage.setItem('taskflow_wiki_view', wikiViewMode); } catch { /* ignore */ }
  }, [wikiViewMode]);

  const {
    handleDelete: deleteDoc, handleToggleFavorite, handleTogglePin,
    handleSaveWithVersion: saveDoc, handleAddComment: addComment,
    handleMarkAsRead, handleConfirmFolder: createFolder
  } = useWikiActions({ workspaceId: workspace?.id, user, lang, docs });

  const textByLang = useCallback((en: string, ko: string) => lang === 'ko' ? ko : en, [lang]);

  useEffect(() => {
    if (!workspace?.id) return;

    setLoading(true);

    // Safety timeout: if Firestore takes too long, stop showing spinner
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = subscribeToWikiDocuments(workspace.id, (updatedDocs) => {
      setDocs(updatedDocs);
      setLoading(false);
      clearTimeout(timer);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [workspace?.id]);

  // Handle Presence reporting
  useEffect(() => {
    if (!selectedDoc || !user?.uid) return;

    // Initial report
    updatePresence(selectedDoc.id, user.uid, user.displayName || 'Unknown', user.photoURL || undefined);

    // Heartbeat every 45 seconds
    const interval = setInterval(() => {
      updatePresence(selectedDoc.id, user.uid, user.displayName || 'Unknown', user.photoURL || undefined);
    }, 45000);

    return () => {
      clearInterval(interval);
      removePresence(selectedDoc.id, user.uid);
    };
  }, [selectedDoc?.id, user?.uid, user?.displayName, user?.photoURL, selectedDoc]);

  // Handle Presence subscription
  useEffect(() => {
    if (!selectedDoc) {
      setActiveViewers([]);
      return;
    }
    const unsubscribe = subscribeToPresence(selectedDoc.id, (presence) => {
      setActiveViewers(presence.filter(p => p.userId !== user?.uid)); // Don't show self
    });
    return () => unsubscribe();
  }, [selectedDoc?.id, user?.uid, selectedDoc]);

  const currentDocs = useMemo(() => {
    let list = docs.filter(d => (currentFolderId ? d.parentId === currentFolderId : !d.parentId));
    if (search) {
      const q = search.toLowerCase();
      list = docs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.content?.toLowerCase().includes(q) ||
        d.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (showFavorites) list = list.filter(d => d.favoritedBy?.includes(user?.uid || ''));
    if (filterTag) list = list.filter(d => d.tags?.includes(filterTag));
    return list.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'created') return (b.createdAt).localeCompare(a.createdAt);
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    });
  }, [docs, currentFolderId, search, showFavorites, user?.uid, filterTag, sortBy]);

  const breadcrumbs = useMemo(() => {
    const trail: WikiDocument[] = [];
    let fId = currentFolderId;
    while (fId) {
      const folder = docs.find(d => d.id === fId);
      if (!folder) break;
      trail.unshift(folder);
      fId = folder.parentId || null;
    }
    return trail;
  }, [currentFolderId, docs]);

  const handleNewDoc = () => {
    editorContentRef.current = '';
    setEditingDoc({ title: '', content: '', icon: '📄', tags: [], pinned: false, visibility: 'workspace', parentId: currentFolderId || undefined });
    setDialogOpen(true);
  };

  const handleNewFromTemplate = (tpl: DocTemplate) => {
    editorContentRef.current = tpl.content;
    setEditingDoc({
      title: lang === 'ko' ? tpl.nameKo : tpl.nameEn,
      content: tpl.content, icon: tpl.icon, tags: tpl.tags,
      pinned: false, visibility: 'workspace', parentId: currentFolderId || undefined,
    });
    setTemplateDialogOpen(false);
    setDialogOpen(true);
  };

  const handleNewFolder = () => {
    if (!workspace?.id || !user?.uid) return;
    setFolderName('');
    setFolderDialogOpen(true);
  };

  const handleConfirmFolder = () => {
    setCreatingFolder(true);
    createFolder(folderName, currentFolderId, () => setFolderDialogOpen(false), () => setCreatingFolder(false));
  };

  const handleEdit = (doc: WikiDocument) => {
    editorContentRef.current = doc.content || '';
    setEditingDoc({ ...doc });
    setDialogOpen(true);
  };


  const handleDelete = (id: string) => deleteDoc(id, () => {
    setDeleteConfirmId(null);
    if (selectedDoc?.id === id) setSelectedDoc(null);
  });

  // ─── Author Profile Popover ───
  const handleAuthorClick = (e: React.MouseEvent<HTMLElement>, uid: string) => {
    e.stopPropagation();
    setAuthorUid(uid);
    setAuthorAnchor(e.currentTarget);
    setMessageText('');
  };

  const closeAuthorCard = () => {
    setAuthorAnchor(null);
    setAuthorUid(null);
    setMessageText('');
  };

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

  const handleSendMessage = async () => {
    if (!messageText.trim() || !authorUid || !user?.uid || !workspace?.id) return;
    setSendingMessage(true);
    try {
      await createNotification({
        type: 'task_mentioned',
        title: lang === 'ko' ? `${user.displayName || ''}님이 메시지를 보냈습니다` : `${user.displayName || ''} sent you a message`,
        body: messageText.trim(),
        actorUid: user.uid,
        actorName: user.displayName || '',
        actorPhoto: user.photoURL || undefined,
        recipientUid: authorUid,
        workspaceId: workspace.id,
      });
      toast.success(lang === 'ko' ? '메시지를 보냈습니다' : 'Message sent');
      setMessageText('');
      closeAuthorCard();
    } catch (err) {
      handleError(err, { fallbackMessage: lang === 'ko' ? '메시지 전송 실패' : 'Failed to send message' });
    }
    setSendingMessage(false);
  };

  const handleFilterByAuthor = (uid: string) => {
    const member = currentMembers?.find(m => m.uid === uid);
    if (member) {
      setSearch(member.displayName || member.email);
      closeAuthorCard();
      setSelectedDoc(null);
    }
  };

  // ─── Feature 1: Copy / Share Link ───
  const handleCopyLink = (docId: string) => {
    const url = `${window.location.origin}/wiki?doc=${docId}`;
    navigator.clipboard.writeText(url);
    toast.success(lang === 'ko' ? '링크가 복사되었습니다' : 'Link copied!');
  };

  // ─── Feature 2: Recently viewed ───
  useEffect(() => {
    if (workspace?.id) setRecentDocIds(getRecentDocIds(workspace.id));
  }, [workspace?.id]);

  const trackRecentDoc = useCallback((doc: WikiDocument) => {
    if (!workspace?.id || doc.isFolder) return;
    addRecentDocId(workspace.id, doc.id);
    setRecentDocIds(getRecentDocIds(workspace.id));
  }, [workspace?.id]);

  const recentDocs = useMemo(() => {
    return recentDocIds.map(id => docs.find(d => d.id === id)).filter(Boolean).slice(0, 5) as WikiDocument[];
  }, [recentDocIds, docs]);

  // ─── Feature 3: TOC ───
  const tocItems = useMemo(() => {
    if (!selectedDoc) return [];
    const doc = docs.find(d => d.id === selectedDoc.id);
    return doc?.content ? extractHeadings(doc.content) : [];
  }, [selectedDoc, docs]);

  // ─── Feature 4: Export Markdown ───
  const handleExportMarkdown = (doc: WikiDocument) => {
    const blob = new Blob([`# ${doc.title}\n\n${doc.content || ''}`], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${doc.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(lang === 'ko' ? '다운로드 완료' : 'Downloaded');
  };

  // ─── Feature 5: Version History (save snapshot on edit) ───
  const handleSaveWithVersion = () => {
    setSaving(true);
    saveDoc(editingDoc, editorContentRef.current || editingDoc.content || '', () => {
      setDialogOpen(false);
      setEditingDoc({});
    }, () => setSaving(false));
  };

  // ─── Feature 6: Comments ───
  const handleAddComment = (docId: string) => addComment(docId, commentText, () => setCommentText(''));

  // ─── Feature 7: Linked docs ───
  const getLinkedDocs = useCallback((linkedIds?: string[]) => {
    if (!linkedIds?.length) return [];
    return linkedIds.map(id => docs.find(d => d.id === id)).filter(Boolean) as WikiDocument[];
  }, [docs]);

  // ─── Feature 8: All tags for filter ───
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    docs.forEach(d => d.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [docs]);



  useEffect(() => {
    if (selectedDoc && workspace?.id) {
      const docId = selectedDoc.id;
      const docObj = docs.find(d => d.id === docId) || selectedDoc;
      if (docObj) {
        // Use requestAnimationFrame or similar to avoid synchronous setState warning
        const timer = setTimeout(() => {
          trackRecentDoc(docObj);
        }, 0);
        handleMarkAsRead(docId);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedDoc?.id, workspace?.id, trackRecentDoc, handleMarkAsRead, docs, selectedDoc]);

  const associatedProject = useMemo(() => {
    if (!selectedDoc) return null;
    return (projects || []).find(p => p.id === selectedDoc.projectId);
  }, [selectedDoc, projects]);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 4 } }}>
      {selectedDoc ? (
        <Box>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setSelectedDoc(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>
              {textByLang('Back', '돌아가기')}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Tooltip title={textByLang('Copy link', '링크 복사')}>
              <IconButton onClick={() => handleCopyLink(selectedDoc.id)}>
                <ShareIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={textByLang('Export Markdown', '마크다운 내보내기')}>
              <IconButton onClick={() => handleExportMarkdown(selectedDoc)}>
                <DownloadOutlinedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            {selectedDoc.versions && selectedDoc.versions.length > 0 && (
              <Tooltip title={textByLang('Version history', '버전 히스토리')}>
                <IconButton onClick={() => setVersionDialogOpen(true)}>
                  <HistoryIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={textByLang(`Read by ${selectedDoc.readBy?.length || 0} people`, `${selectedDoc.readBy?.length || 0}명이 읽음`)}>
              <IconButton onClick={e => setReadByAnchor(e.currentTarget)}>
                <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={selectedDoc.favoritedBy?.includes(user?.uid || '') ? textByLang('Unfavorite', '즐겨찾기 해제') : textByLang('Favorite', '즐겨찾기')}>
              <IconButton onClick={() => handleToggleFavorite(selectedDoc)}>
                {selectedDoc.favoritedBy?.includes(user?.uid || '') ? <StarIcon sx={{ color: '#f59e0b' }} /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={selectedDoc.pinned ? textByLang('Unpin', '고정 해제') : textByLang('Pin', '고정')}>
              <IconButton onClick={() => handleTogglePin(selectedDoc)}>{selectedDoc.pinned ? <PushPinIcon color="primary" /> : <PushPinOutlinedIcon />}</IconButton>
            </Tooltip>
            <Button startIcon={<EditIcon />} variant="outlined" onClick={() => handleEdit(selectedDoc)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('edit') as string}</Button>
            <IconButton color="error" onClick={() => setDeleteConfirmId(selectedDoc.id)}><DeleteOutlineIcon /></IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, mb: 3 }}>
                {associatedProject && (
                  <Chip icon={<AccountTreeOutlinedIcon sx={{ fontSize: 14 }} />} label={associatedProject.name} size="small"
                    sx={{ mb: 2, fontWeight: 600, fontSize: '0.75rem', bgcolor: alpha(associatedProject.color, 0.1), color: associatedProject.color, border: `1px solid ${alpha(associatedProject.color, 0.2)}` }} />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography sx={{ fontSize: '2rem' }}>{selectedDoc.icon || '📄'}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ flex: 1 }}>{getDisplayTitle(selectedDoc.title, selectedDoc.icon)}</Typography>
                  {activeViewers.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', '& .MuiAvatar-root': { width: 28, height: 28, border: '2px solid #fff', ml: -1 }, pl: 1 }}>
                      {activeViewers.map(v => (
                        <Tooltip key={v.userId} title={`${v.userName} ${lang === 'ko' ? '보는 중' : 'viewing'}`}>
                          <Avatar src={v.userPhoto || ''}>{v.userName[0]}</Avatar>
                        </Tooltip>
                      ))}
                    </Box>
                  )}
                </Box>
                {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                    {selectedDoc.tags.map(tag => (<Chip key={tag} label={tag} size="small" sx={{ fontWeight: 600, fontSize: '0.75rem', bgcolor: alpha('#6366f1', 0.08), color: '#6366f1' }} />))}
                  </Box>
                )}
                {selectedDoc.visibility && (
                  <Chip label={`${WIKI_VISIBILITY_CONFIG[selectedDoc.visibility].icon} ${lang === 'ko' ? WIKI_VISIBILITY_CONFIG[selectedDoc.visibility].labelKo : WIKI_VISIBILITY_CONFIG[selectedDoc.visibility].label}`}
                    size="small" sx={{ mb: 2, fontWeight: 600, bgcolor: alpha(WIKI_VISIBILITY_CONFIG[selectedDoc.visibility].color, 0.08), color: WIKI_VISIBILITY_CONFIG[selectedDoc.visibility].color }} />
                )}
                {getLinkedDocs(selectedDoc.linkedDocIds).length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <LinkIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />
                    {getLinkedDocs(selectedDoc.linkedDocIds).map(ld => (
                      <Chip key={ld.id} label={`${ld.icon || '📄'} ${ld.title}`} size="small" clickable
                        onClick={() => setSelectedDoc(ld)}
                        sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: alpha('#3b82f6', 0.08), color: '#3b82f6' }} />
                    ))}
                  </Box>
                )}
                <Box sx={{ '& h1, & h2, & h3': { color: 'text.primary' }, '& table': { borderCollapse: 'collapse' }, '& pre': { background: '#f1f5f9', p: 2, borderRadius: 2, overflow: 'auto', fontSize: '0.85rem' }, lineHeight: 1.8, fontSize: '0.95rem' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.content || '') }} />
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {(() => {
                    const member = currentMembers?.find(m => m.uid === selectedDoc.createdBy);
                    return (
                      <Box onClick={(e) => handleAuthorClick(e, selectedDoc.createdBy)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer', py: 0.8, px: 1.5, borderRadius: 2.5, transition: 'all 0.2s', '&:hover': { bgcolor: alpha('#6366f1', 0.06) } }}>
                        <Avatar src={member?.photoURL || ''} sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: '0.8rem', fontWeight: 700 }}>
                          {(member?.displayName || selectedDoc.createdByName || '?')[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2, color: 'text.primary' }}>{member?.displayName || selectedDoc.createdByName}</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: 11 }} />{selectedDoc.updatedAt?.slice(0, 16) || selectedDoc.createdAt?.slice(0, 16)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })()}
                </Box>
              </Paper>

              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} /> {textByLang('Comments', '댓글')}
                  <Chip label={selectedDoc.comments?.length || 0} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                  <HelpTooltip title={textByLang('Comments', '댓글')} description={textByLang('Collaborate with your team by adding comments to document. Everyone in the workspace can see and reply.', '팀원들과 댓글로 소통하세요. 워크스페이스의 모든 멤버가 확인하고 답글을 달 수 있습니다.')} />
                </Typography>
                {(selectedDoc.comments || []).map(c => (
                  <Box key={c.id} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Avatar src={c.authorPhoto} sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: '#6366f1' }}>{c.authorName[0]}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.82rem' }}>{c.authorName}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>{c.createdAt.slice(0, 16)}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 0.3, lineHeight: 1.5, fontSize: '0.88rem' }}>{c.body}</Typography>
                    </Box>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField size="small" fullWidth placeholder={textByLang('Write a comment...', '댓글 입력...')}
                    value={commentText} onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(selectedDoc.id); } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }} />
                  <IconButton onClick={() => handleAddComment(selectedDoc.id)} disabled={!commentText.trim()}
                    sx={{ bgcolor: '#6366f1', color: 'white', borderRadius: 2, width: 36, height: 36, '&:hover': { bgcolor: '#4f46e5' }, '&.Mui-disabled': { bgcolor: alpha('#6366f1', 0.3), color: alpha('#fff', 0.5) } }}>
                    <SendIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Paper>

              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <ActivityFeed entityType="wiki" entityId={selectedDoc.id} limit={20} />
              </Paper>
            </Box>

            {showToc && tocItems.length > 0 && (
              <Paper sx={{ width: 220, flexShrink: 0, p: 2, borderRadius: 3, position: 'sticky', top: 80, alignSelf: 'flex-start', maxHeight: '70vh', overflow: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                    <ListAltIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    {textByLang('Contents', '목차')}
                  </Typography>
                  <IconButton size="small" onClick={() => setShowToc(false)} sx={{ p: 0.3 }}>
                    <ArrowBackIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                {tocItems.map(item => (
                  <Typography key={item.id} variant="caption" sx={{
                    display: 'block', pl: (item.level - 1) * 1.5, py: 0.4, cursor: 'pointer', fontWeight: item.level === 1 ? 700 : 500,
                    fontSize: item.level === 1 ? '0.78rem' : '0.72rem', color: 'text.secondary',
                    borderRadius: 1, transition: 'all 0.15s', '&:hover': { color: '#6366f1', bgcolor: alpha('#6366f1', 0.06) },
                  }}>{item.text}</Typography>
                ))}
              </Paper>
            )}
          </Box>

          <Dialog open={versionDialogOpen} onClose={() => setVersionDialogOpen(false)} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: 4 } }}>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon /> {textByLang('Version History', '버전 히스토리')}
            </DialogTitle>
            <DialogContent>
              {(selectedDoc.versions || []).length === 0 ? (
                <Typography color="text.disabled" sx={{ py: 3, textAlign: 'center' }}>{textByLang('No versions yet', '버전 히스토리가 없습니다')}</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {(selectedDoc.versions || []).map((v, i) => (
                    <Paper key={v.id} variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: i === 0 ? 'primary.main' : 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>{v.title}</Typography>
                        {i === 0 && <Chip label={textByLang('Latest', '최신')} size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {v.editedByName} · {v.editedAt.slice(0, 16)}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                        {v.content.slice(0, 100)}{v.content.length > 100 ? '...' : ''}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setVersionDialogOpen(false)} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('cancel') as string}</Button>
            </DialogActions>
          </Dialog>

          {/* Read By Popover */}
          <Popover open={!!readByAnchor} anchorEl={readByAnchor} onClose={() => setReadByAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            PaperProps={{ sx: { borderRadius: 3, p: 2, minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              👁️ {textByLang(`Read by (${selectedDoc.readBy?.length || 0})`, `읽은 사람 (${selectedDoc.readBy?.length || 0})`)}
            </Typography>
            {(selectedDoc.readBy || []).length === 0 ? (
              <Typography variant="caption" color="text.disabled">{textByLang('No one yet', '아직 없습니다')}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {(selectedDoc.readBy || []).map(uid => {
                  const m = currentMembers?.find(mm => mm.uid === uid);
                  return m ? (
                    <Box key={uid} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={m.photoURL || ''} sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: '#6366f1' }}>{(m.displayName || '?')[0]}</Avatar>
                      <Typography variant="caption" fontWeight={600}>{m.displayName}</Typography>
                    </Box>
                  ) : null;
                })}
              </Box>
            )}
          </Popover>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h5" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📚 {textByLang('Wiki', '위키')}
              </Typography>
            </Box>
            <TextField
              size="small" placeholder={textByLang('Search documents...', '문서 검색...')}
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20 }} /></InputAdornment> }}
              sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Button variant={showFavorites ? 'contained' : 'outlined'} size="small"
              startIcon={showFavorites ? <StarIcon /> : <StarBorderIcon />}
              onClick={() => setShowFavorites(!showFavorites)} sx={{ borderRadius: 2, fontWeight: 600 }}>
              {textByLang('Favorites', '즐겨찾기')}
            </Button>
            {/* View toggle */}
            <Box sx={{ display: 'flex', bgcolor: alpha('#6366f1', 0.04), p: 0.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
              <Tooltip title={textByLang('Card view', '카드 보기')}>
                <IconButton size="small" onClick={() => setWikiViewMode('card')}
                  sx={{ borderRadius: 2, px: 1.2, py: 0.6, bgcolor: wikiViewMode === 'card' ? 'white' : 'transparent', color: wikiViewMode === 'card' ? 'primary.main' : 'text.secondary', boxShadow: wikiViewMode === 'card' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', '&:hover': { bgcolor: wikiViewMode === 'card' ? 'white' : alpha('#6366f1', 0.08) } }}>
                  <ViewModuleIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={textByLang('List view', '목록 보기')}>
                <IconButton size="small" onClick={() => setWikiViewMode('list')}
                  sx={{ borderRadius: 2, px: 1.2, py: 0.6, bgcolor: wikiViewMode === 'list' ? 'white' : 'transparent', color: wikiViewMode === 'list' ? 'primary.main' : 'text.secondary', boxShadow: wikiViewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', '&:hover': { bgcolor: wikiViewMode === 'list' ? 'white' : alpha('#6366f1', 0.08) } }}>
                  <ViewListIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box>
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={e => setCreateAnchor(e.currentTarget)}
                sx={{ borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {textByLang('Create', '만들기')}
              </Button>
              <Menu anchorEl={createAnchor} open={!!createAnchor} onClose={() => setCreateAnchor(null)}
                PaperProps={{ sx: { borderRadius: 2, minWidth: 200 } }}>
                <MenuItem onClick={() => { setCreateAnchor(null); handleNewDoc(); }} sx={{ py: 1.2, gap: 1.5 }}>
                  <ListItemIcon><NoteAddOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={lang === 'ko' ? '새 문서' : 'New Document'} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
                </MenuItem>
                <MenuItem onClick={() => { setCreateAnchor(null); handleNewFolder(); }} sx={{ py: 1.2, gap: 1.5 }}>
                  <ListItemIcon><CreateNewFolderOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={lang === 'ko' ? '새 폴더' : 'New Folder'} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => { setCreateAnchor(null); setTemplateDialogOpen(true); }} sx={{ py: 1.2, gap: 1.5 }}>
                  <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={lang === 'ko' ? '템플릿에서 만들기' : 'From Template'} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
                </MenuItem>
              </Menu>
            </Box>
            <HelpTooltip title={textByLang('Wiki Workspace', '위키 워크스페이스')} description={textByLang('This is your team\'s knowledge base. Organize documents into folders, use templates, and link documents to projects.', '팀의 지식 베이스입니다. 문서를 폴더로 구성하고, 템플릿을 사용하며, 프로젝트와 연결하세요.')} />
          </Box>

          {/* Feature 8: Sort & Filter controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <SortIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <Select size="small" value={sortBy} onChange={e => setSortBy(e.target.value as 'updated' | 'title' | 'created')}
              sx={{ minWidth: 130, borderRadius: 2, height: 32, fontSize: '0.8rem' }}>
              <MenuItem value="updated">{textByLang('Last updated', '최근 수정')}</MenuItem>
              <MenuItem value="created">{textByLang('Date created', '생성일')}</MenuItem>
              <MenuItem value="title">{textByLang('Title A-Z', '제목순')}</MenuItem>
            </Select>
            {allTags.length > 0 && (
              <>
                <FilterListIcon sx={{ fontSize: 18, color: 'text.disabled', ml: 1 }} />
                <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                  {filterTag && (
                    <Chip label={textByLang('All', '전체')} size="small" clickable onClick={() => setFilterTag(null)}
                      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600 }} />
                  )}
                  {allTags.slice(0, 8).map(tag => (
                    <Chip key={tag} label={tag} size="small" clickable onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                      variant={filterTag === tag ? 'filled' : 'outlined'}
                      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, ...(filterTag === tag ? { bgcolor: '#6366f1', color: 'white' } : {}) }} />
                  ))}
                </Box>
              </>
            )}
          </Box>

          {/* Feature 2: Recently viewed docs */}
          {recentDocs.length > 0 && !search && !showFavorites && !currentFolderId && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block', letterSpacing: 0.5 }}>
                🕐 {textByLang('Recently Viewed', '최근 본 문서')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                {recentDocs.map(rd => (
                  <Paper key={rd.id} onClick={() => setSelectedDoc(rd)}
                    sx={{ p: 1.5, borderRadius: 2, cursor: 'pointer', minWidth: 160, maxWidth: 200, flexShrink: 0, border: '1px solid', borderColor: 'divider', transition: 'all 0.15s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.3 }}>
                      <Typography sx={{ fontSize: '1rem' }}>{rd.icon || '📄'}</Typography>
                      <Typography variant="caption" fontWeight={700} noWrap>{getDisplayTitle(rd.title, rd.icon)}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>{(rd.updatedAt || rd.createdAt)?.slice(0, 10)}</Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {(currentFolderId || breadcrumbs.length > 0) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
              <Button size="small" onClick={() => setCurrentFolderId(null)} sx={{ borderRadius: 2, fontWeight: 600, minWidth: 0 }}>
                {textByLang('Root', '루트')}
              </Button>
              {breadcrumbs.map((bc, idx) => (
                <Box key={bc.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography color="text.disabled">/</Typography>
                  <Button size="small" onClick={() => setCurrentFolderId(bc.id)}
                    sx={{ borderRadius: 2, fontWeight: idx === breadcrumbs.length - 1 ? 700 : 500, color: idx === breadcrumbs.length - 1 ? 'primary.main' : 'text.secondary', minWidth: 0 }}>
                    {bc.icon} {getDisplayTitle(bc.title, bc.icon)}
                  </Button>
                </Box>
              ))}
            </Box>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12, gap: 3 }}>
              <CircularProgress size={40} thickness={4} sx={{ color: '#6366f1' }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" fontWeight={700} color="text.secondary">
                  {textByLang('Fetching your documents...', '문서를 불러오는 중입니다...')}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {textByLang('It will only take a moment.', '잠시만 기다려주세요.')}
                </Typography>
              </Box>
            </Box>
          ) : currentDocs.length === 0 ? (
            <Paper sx={{
              p: { xs: 4, md: 8 }, textAlign: 'center', borderRadius: 4,
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
              backdropFilter: 'blur(10px)',
              border: '1px solid', borderColor: 'divider',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              position: 'relative', overflow: 'hidden'
            }}>
              <Box sx={{
                position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(139,92,246,0.05))'
              }} />
              <Box sx={{
                width: 80, height: 80, borderRadius: 3,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
                boxShadow: '0 12px 24px rgba(99,102,241,0.25)',
                transform: 'rotate(-5deg)'
              }}>
                <DescriptionOutlinedIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" color="text.primary" fontWeight={800} sx={{ mb: 1.5, letterSpacing: -0.5 }}>
                {textByLang('Your Knowledge Space is Empty', '지식 공간이 비어 있습니다')}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 460, mx: 'auto', lineHeight: 1.6 }}>
                {textByLang(
                  'Document your findings, create guides, or organize team notes. Start by creating a document or organization folder.',
                  '발견한 내용을 기록하거나 가이드를 만들고 팀 노트를 정리해보세요. 문서나 폴더를 만들어 시작할 수 있습니다.'
                )}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleNewDoc()}
                  sx={{ borderRadius: 3, px: 4, py: 1.2, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 20px rgba(99,102,241,0.3)' }}
                >
                  {textByLang('New Document', '새 문서 작성')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolderOutlinedIcon />}
                  onClick={() => handleNewFolder()}
                  sx={{ borderRadius: 3, px: 3, py: 1.2, fontWeight: 700 }}
                >
                  {textByLang('New Folder', '새 폴더')}
                </Button>
              </Box>
            </Paper>
          ) : wikiViewMode === 'card' ? (
            /* ─── Card (Grid) View ─── */
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
              {currentDocs.map(doc => {
                const isFav = doc.favoritedBy?.includes(user?.uid || '');
                return (
                  <Paper key={doc.id} onClick={() => doc.isFolder ? setCurrentFolderId(doc.id) : setSelectedDoc(doc)}
                    sx={{
                      p: 2.5, borderRadius: 3, cursor: 'pointer', border: '1.5px solid', borderColor: doc.pinned ? 'primary.main' : 'divider',
                      transition: 'all 0.2s ease', position: 'relative',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(99,102,241,0.1)' },
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{doc.icon || (doc.isFolder ? '📂' : '📄')}</Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>{getDisplayTitle(doc.title, doc.icon)}</Typography>
                        {!doc.isFolder && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, mt: 0.3 }}>
                            {doc.content?.replace(/[#*\-|>[\]`]/g, '').slice(0, 100)}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.3, flexShrink: 0 }}>
                        <IconButton size="small" onClick={e => { e.stopPropagation(); handleToggleFavorite(doc); }}>
                          {isFav ? <StarIcon sx={{ fontSize: 18, color: '#f59e0b' }} /> : <StarBorderIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                        {!doc.isFolder && (
                          <IconButton size="small" onClick={e => { e.stopPropagation(); handleEdit(doc); }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                        )}
                        <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); setDeleteConfirmId(doc.id); }}>
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                    {doc.tags && doc.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 1 }}>
                        {doc.tags.slice(0, 3).map(tag => (
                          <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: alpha('#6366f1', 0.06), color: '#6366f1' }} />
                        ))}
                        {doc.tags.length > 3 && <Chip label={`+${doc.tags.length - 3}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />}
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, color: 'text.disabled' }}>
                      {(() => {
                        const member = (currentMembers || []).find(m => m.uid === doc.createdBy);
                        return (
                          <Box
                            onClick={(e) => { e.stopPropagation(); handleAuthorClick(e, doc.createdBy); }}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
                              borderRadius: 1, px: 0.3, py: 0.1,
                              transition: 'all 0.15s',
                              '&:hover': { bgcolor: alpha('#6366f1', 0.06), color: '#6366f1' },
                            }}
                          >
                            <Avatar
                              src={member?.photoURL || ''}
                              sx={{ width: 16, height: 16, bgcolor: '#6366f1', fontSize: '0.5rem', fontWeight: 700 }}
                            >
                              {(member?.displayName || doc.createdByName || '?')[0]}
                            </Avatar>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                              {member?.displayName || doc.createdByName}
                            </Typography>
                          </Box>
                        );
                      })()}
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', mx: 0.3 }}>·</Typography>
                      <AccessTimeIcon sx={{ fontSize: 11 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{(doc.updatedAt || doc.createdAt)?.slice(0, 10)}</Typography>
                      {doc.pinned && <PushPinIcon sx={{ fontSize: 12, ml: 'auto', color: 'primary.main' }} />}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            /* ─── List (Compact) View ─── */
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
              {currentDocs.map((doc, idx) => {
                const isFav = doc.favoritedBy?.includes(user?.uid || '');
                const member = (currentMembers || []).find(m => m.uid === doc.createdBy);
                return (
                  <Box key={doc.id}
                    onClick={() => doc.isFolder ? setCurrentFolderId(doc.id) : setSelectedDoc(doc)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.5,
                      cursor: 'pointer', transition: 'all 0.15s',
                      borderBottom: idx < currentDocs.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                      bgcolor: doc.pinned ? alpha('#6366f1', 0.02) : 'transparent',
                      '&:hover': { bgcolor: alpha('#6366f1', 0.04) },
                    }}>
                    {/* Icon */}
                    <Typography sx={{ fontSize: '1.3rem', lineHeight: 1, flexShrink: 0 }}>
                      {doc.icon || (doc.isFolder ? '📂' : '📄')}
                    </Typography>
                    {/* Title + preview */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.9rem' }}>{getDisplayTitle(doc.title, doc.icon)}</Typography>
                        {doc.pinned && <PushPinIcon sx={{ fontSize: 12, color: 'primary.main', flexShrink: 0 }} />}
                      </Box>
                      {!doc.isFolder && doc.content && (
                        <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: '0.75rem', mt: 0.1, display: 'block' }}>
                          {doc.content.replace(/[#*\-|>[\]`]/g, '').slice(0, 120)}
                        </Typography>
                      )}
                    </Box>
                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.3, flexShrink: 0, mr: 1 }}>
                        {doc.tags.slice(0, 2).map(tag => (
                          <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600, bgcolor: alpha('#6366f1', 0.06), color: '#6366f1' }} />
                        ))}
                      </Box>
                    )}
                    {/* Feature 10: Project association */}
                    {(() => {
                      const proj = (projects || []).find(p => p.id === doc.projectId);
                      if (!proj) return null;
                      return (
                        <Chip
                          label={proj.name}
                          size="small"
                          sx={{
                            mx: 1, height: 20, fontSize: '0.65rem', fontWeight: 700,
                            bgcolor: alpha(proj.color || '#6366f1', 0.08), color: proj.color || '#6366f1',
                            border: `1px solid ${alpha(proj.color || '#6366f1', 0.2)}`,
                            maxWidth: 100
                          }}
                        />
                      );
                    })()}
                    {/* Author */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, width: 90 }}>
                      <Avatar src={member?.photoURL || ''} sx={{ width: 18, height: 18, bgcolor: '#6366f1', fontSize: '0.5rem' }}>
                        {(member?.displayName || doc.createdByName || '?')[0]}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                        {member?.displayName || doc.createdByName}
                      </Typography>
                    </Box>
                    {/* Date */}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                      {(doc.updatedAt || doc.createdAt)?.slice(0, 10)}
                    </Typography>
                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 0.2, flexShrink: 0, opacity: 0.4, '&:hover': { opacity: 1 }, transition: 'opacity 0.15s' }}>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); handleToggleFavorite(doc); }}>
                        {isFav ? <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                      {!doc.isFolder && (
                        <IconButton size="small" onClick={e => { e.stopPropagation(); handleEdit(doc); }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                      )}
                      <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); setDeleteConfirmId(doc.id); }}>
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          )}

          {/* Workspace Activity Feed on Landing Page */}
          {!selectedDoc && !currentFolderId && !search && !showFavorites && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, letterSpacing: 0.5 }}>
                <SyncIcon sx={{ fontSize: 16 }} />
                {textByLang('Workspace Activity', '워크스페이스 활동')}
                <HelpTooltip title={textByLang('Activity Feed', '활동 피드')} description={textByLang('See recent changes across all documents and synced GitHub events.', '모든 문서의 변경 사항과 동기화된 GitHub 이벤트를 확인하세요.')} />
              </Typography>
              <Paper sx={{ p: 2, borderRadius: 3, bgcolor: alpha('#f8fafc', 0.5) }}>
                <ActivityFeed limit={10} />
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* ─── Create / Edit Dialog ──────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', height: '85vh', maxHeight: 800, display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          {editingDoc.id ? t('editDocument') as string : (lang === 'ko' ? '새 문서' : 'New Document')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto', flex: 1, pt: '8px !important' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Select size="small" value={editingDoc.icon || '📄'}
              onChange={e => setEditingDoc(prev => ({ ...prev, icon: e.target.value }))}
              sx={{ width: 56, borderRadius: 2, '& .MuiSelect-select': { py: 0.8, fontSize: '1.5rem' } }}>
              {EMOJI_OPTIONS.map(e => (<MenuItem key={e} value={e} sx={{ fontSize: '1.3rem', justifyContent: 'center' }}>{e}</MenuItem>))}
            </Select>
            <TextField fullWidth size="small" autoFocus label={t('docTitle') as string}
              value={editingDoc.title || ''} onChange={e => setEditingDoc(prev => ({ ...prev, title: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontWeight: 600 } }} />
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Autocomplete multiple freeSolo size="small" options={[]} value={editingDoc.tags || []}
              onChange={(_, v) => setEditingDoc(prev => ({ ...prev, tags: v.map(item => typeof item === 'string' ? item : item) }))}
              renderInput={(params) => (
                <TextField {...params} label={t('docTags') as string}
                  placeholder={lang === 'ko' ? '태그 입력 후 Enter' : 'Type tag & press Enter'} variant="outlined"
                  slotProps={{ inputLabel: { shrink: true } }} />
              )}
              sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <Select size="small" value={editingDoc.visibility || 'workspace'}
              onChange={e => setEditingDoc(prev => ({ ...prev, visibility: e.target.value as WikiVisibility }))}
              sx={{ minWidth: 150, borderRadius: 2, height: 40 }}
              renderValue={(val) => {
                const cfg = WIKI_VISIBILITY_CONFIG[val as WikiVisibility];
                return (<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}><span>{cfg.icon}</span><Typography variant="body2" fontWeight={600}>{lang === 'ko' ? cfg.labelKo : cfg.label}</Typography></Box>);
              }}>
              {(Object.entries(WIKI_VISIBILITY_CONFIG) as [WikiVisibility, typeof WIKI_VISIBILITY_CONFIG[WikiVisibility]][]).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><span>{cfg.icon}</span><Typography variant="body2" fontWeight={600}>{lang === 'ko' ? cfg.labelKo : cfg.label}</Typography></Box>
                </MenuItem>
              ))}
            </Select>
            <Select size="small" displayEmpty value={editingDoc.parentId || ''}
              onChange={e => setEditingDoc(prev => ({ ...prev, parentId: e.target.value || undefined }))}
              sx={{ minWidth: 140, borderRadius: 2, height: 40 }}
              renderValue={(val) => {
                if (!val) return (<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: 'text.secondary' }}><FolderOutlinedIcon sx={{ fontSize: 18 }} /><Typography variant="body2">{lang === 'ko' ? '폴더 없음' : 'No folder'}</Typography></Box>);
                const folder = docs.find(d => d.id === val);
                return (<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}><Typography variant="body2" fontWeight={600}>{folder?.icon || '📂'} {getDisplayTitle(folder?.title || val, folder?.icon)}</Typography></Box>);
              }}>
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FolderOutlinedIcon sx={{ fontSize: 18 }} /><Typography variant="body2">{lang === 'ko' ? '최상위 (폴더 없음)' : 'Root (no folder)'}</Typography></Box>
              </MenuItem>
              {docs.filter(d => d.isFolder && d.id !== editingDoc.id).map(folder => (
                <MenuItem key={folder.id} value={folder.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography variant="body2" fontWeight={600}>{folder.icon || '📂'} {getDisplayTitle(folder.title, folder.icon)}</Typography></Box>
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Team picker */}
          {editingDoc.visibility === 'team' && (
            <Autocomplete multiple size="small" options={teamGroups || []}
              getOptionLabel={(opt: TeamGroup) => opt.name}
              value={(teamGroups || []).filter(tg => editingDoc.allowedTeamIds?.includes(tg.id))}
              onChange={(_, selected) => setEditingDoc(prev => ({ ...prev, allowedTeamIds: selected.map(s => s.id), allowedTeamNames: selected.map(s => s.name) }))}
              renderInput={(params) => (<TextField {...params} label={lang === 'ko' ? '🏢 공개할 팀 선택' : '🏢 Select teams'} placeholder={lang === 'ko' ? '팀 검색...' : 'Search teams...'} variant="outlined" />)}
              renderOption={(props, option) => (
                <li {...props}><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: option.color || '#6366f1' }} /><Typography variant="body2" fontWeight={600}>{option.name}</Typography></Box></li>
              )}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          )}

          {/* Member picker */}
          {editingDoc.visibility === 'members' && (
            <Autocomplete multiple size="small" options={currentMembers || []}
              getOptionLabel={(opt) => opt.displayName || opt.email || opt.uid}
              value={(currentMembers || []).filter(m => editingDoc.allowedMemberIds?.includes(m.uid))}
              onChange={(_, selected) => setEditingDoc(prev => ({ ...prev, allowedMemberIds: selected.map(s => s.uid), allowedMemberNames: selected.map(s => s.displayName || s.email || s.uid) }))}
              renderInput={(params) => (<TextField {...params} label={lang === 'ko' ? '👤 공개할 멤버 선택' : '👤 Select members'} placeholder={lang === 'ko' ? '멤버 검색...' : 'Search members...'} variant="outlined" />)}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.photoURL
                      ? <Box component="img" src={option.photoURL} sx={{ width: 24, height: 24, borderRadius: '50%' }} />
                      : <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{(option.displayName || '?')[0]}</Box>
                    }
                    <Typography variant="body2" fontWeight={600}>{option.displayName || option.email}</Typography>
                  </Box>
                </li>
              )}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          )}

          {/* Block Editor with info button */}
          <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Tooltip title={lang === 'ko' ? '서식 가이드' : 'Formatting guide'}>
              <IconButton size="small" onClick={(e) => setHelpAnchor(e.currentTarget)}
                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10, bgcolor: alpha('#6366f1', 0.06), '&:hover': { bgcolor: alpha('#6366f1', 0.12) } }}>
                <InfoOutlinedIcon sx={{ fontSize: 18, color: '#6366f1' }} />
              </IconButton>
            </Tooltip>
            <Paper variant="outlined" sx={{
              borderRadius: 2, flex: 1, overflow: 'auto', px: 1.5, py: 0.5, border: '1px solid', borderColor: 'divider',
              '&:focus-within': { borderColor: 'primary.main', boxShadow: '0 0 0 2px rgba(99,102,241,0.08)' },
              transition: 'border-color 0.2s, box-shadow 0.2s', minHeight: 200,
            }}>
              <BlockEditor key={editingDoc.id || 'new'} initialContent={editingDoc.content || ''} onChange={(md) => { editorContentRef.current = md; }} minHeight={280} />
            </Paper>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexShrink: 0, flexWrap: 'wrap' }}>
            <Button variant={editingDoc.pinned ? 'contained' : 'outlined'} size="small"
              startIcon={editingDoc.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
              onClick={() => setEditingDoc(prev => ({ ...prev, pinned: !prev.pinned }))} sx={{ borderRadius: 2, fontWeight: 600 }}>
              {editingDoc.pinned ? t('unpinDoc') as string : t('pinDoc') as string}
            </Button>
            {/* Feature 10: Project selector */}
            <Select size="small" displayEmpty
              value={editingDoc.projectId || ''}
              onChange={e => setEditingDoc(prev => ({ ...prev, projectId: e.target.value || undefined }))}
              sx={{ minWidth: 140, borderRadius: 2, height: 32, fontSize: '0.8rem' }}
              renderValue={(val) => {
                if (!val) return <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}><AccountTreeOutlinedIcon sx={{ fontSize: 16 }} /><Typography variant="caption">{lang === 'ko' ? '프로젝트 없음' : 'No project'}</Typography></Box>;
                const proj = projects.find(p => p.id === val);
                return <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: proj?.color || '#6366f1' }} /><Typography variant="caption" fontWeight={600}>{proj?.name || val}</Typography></Box>;
              }}>
              <MenuItem value=""><Typography variant="body2">{lang === 'ko' ? '프로젝트 없음' : 'No project'}</Typography></MenuItem>
              {projects.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} /><Typography variant="body2" fontWeight={600}>{p.name}</Typography></Box>
                </MenuItem>
              ))}
            </Select>
            {/* Feature 7: Linked docs selector */}
            <Autocomplete multiple size="small"
              options={docs.filter(d => !d.isFolder && d.id !== editingDoc.id)}
              getOptionLabel={opt => `${opt.icon || '📄'} ${getDisplayTitle(opt.title, opt.icon)}`}
              value={docs.filter(d => editingDoc.linkedDocIds?.includes(d.id))}
              onChange={(_, sel) => setEditingDoc(prev => ({ ...prev, linkedDocIds: sel.map(s => s.id) }))}
              renderInput={params => <TextField {...params} label={lang === 'ko' ? '🔗 연결 문서' : '🔗 Linked docs'} variant="outlined" />}
              sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            {editingDoc.updatedAt && (
              <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: 14 }} />
                {lang === 'ko' ? '마지막 수정: ' : 'Last edit: '}{editingDoc.updatedByName || ''} · {editingDoc.updatedAt?.slice(0, 16)}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ borderRadius: 2, fontWeight: 600 }}>{t('cancel') as string}</Button>
          <Button variant="contained" onClick={handleSaveWithVersion} disabled={saving || !editingDoc.title?.trim()}
            sx={{ borderRadius: 2, fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : t('save') as string}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Formatting Guide Popover ─────── */}
      <Popover open={!!helpAnchor} anchorEl={helpAnchor} onClose={() => setHelpAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 3, p: 2, maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
          📖 {lang === 'ko' ? '서식 가이드' : 'Formatting Guide'}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          {FORMATTING_GUIDE.map((item, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, bgcolor: alpha('#6366f1', 0.06), color: '#6366f1', px: 1, py: 0.3, borderRadius: 1, minWidth: 100, whiteSpace: 'pre' }}>
                {item.syntax}
              </Box>
              <Typography variant="caption" color="text.secondary">{lang === 'ko' ? item.desc : item.descEn}</Typography>
            </Box>
          ))}
        </Box>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.6 }}>
          💡 {lang === 'ko' ? '에디터에서 / 를 입력하면 블록 타입을 바꿀 수 있습니다' : 'Type / in the editor to change block types'}
        </Typography>
      </Popover>

      {/* ─── Author Profile Popover ──────── */}
      <Popover
        open={!!authorAnchor}
        anchorEl={authorAnchor}
        onClose={closeAuthorCard}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: 4, width: 360, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          },
        }}
      >
        {authorMember && (
          <Box>
            {/* Profile Header */}
            <Box sx={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              p: 2.5, pb: 4, position: 'relative',
            }}>
              <Avatar
                src={authorMember.photoURL || ''}
                sx={{
                  width: 56, height: 56, border: '3px solid white',
                  fontSize: '1.3rem', fontWeight: 700,
                  bgcolor: alpha('#fff', 0.25), color: '#fff',
                }}
              >
                {(authorMember.displayName || '?')[0]}
              </Avatar>
              <Typography variant="h6" fontWeight={800} sx={{ color: 'white', mt: 1, lineHeight: 1.2 }}>
                {authorMember.displayName}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.8) }}>
                {authorMember.email}
              </Typography>
            </Box>

            {/* Badges Row */}
            <Box sx={{ display: 'flex', gap: 0.8, px: 2.5, mt: -1.5, flexWrap: 'wrap' }}>
              <Chip
                label={authorMember.role === 'admin' || authorMember.role === 'owner' ? '👑 Admin' : authorMember.role === 'maintainer' ? '🔧 Maintainer' : authorMember.role === 'member' ? '👤 Member' : '👀 Viewer'}
                size="small"
                sx={{
                  fontWeight: 700, fontSize: '0.7rem', height: 24,
                  bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: '1px solid',
                  borderColor: authorMember.role === 'admin' ? '#f59e0b' : '#e2e8f0',
                  color: authorMember.role === 'admin' ? '#d97706' : 'text.primary',
                }}
              />
              {authorTeamGroup && (
                <Chip
                  label={`🏢 ${authorTeamGroup.name}`}
                  size="small"
                  sx={{
                    fontWeight: 600, fontSize: '0.7rem', height: 24,
                    bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: authorTeamGroup.color || '#e2e8f0',
                    color: authorTeamGroup.color || 'text.secondary',
                  }}
                />
              )}
            </Box>

            {/* Quick Stats */}
            <Box sx={{ px: 2.5, mt: 2, display: 'flex', gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} color="primary">
                  {docs.filter(d => d.createdBy === authorUid && !d.isFolder).length}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                  {lang === 'ko' ? '작성 문서' : 'Documents'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#10b981' }}>
                  {docs.filter(d => d.updatedBy === authorUid && !d.isFolder).length}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                  {lang === 'ko' ? '수정 참여' : 'Edits'}
                </Typography>
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
                    <Box
                      key={ad.id}
                      onClick={() => { closeAuthorCard(); setSelectedDoc(ad); }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        py: 0.6, px: 1, borderRadius: 1.5, cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: alpha('#6366f1', 0.06) },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.9rem' }}>{ad.icon || '📄'}</Typography>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, fontSize: '0.82rem' }}>
                        {getDisplayTitle(ad.title, ad.icon)}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
                        {ad.createdAt?.slice(0, 10)}
                      </Typography>
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
                <TextField
                  size="small" fullWidth
                  placeholder={lang === 'ko' ? '메시지를 입력하세요...' : 'Type a message...'}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.85rem' } }}
                />
                <IconButton
                  size="small"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendingMessage}
                  sx={{
                    bgcolor: '#6366f1', color: 'white', borderRadius: 2,
                    '&:hover': { bgcolor: '#4f46e5' },
                    '&.Mui-disabled': { bgcolor: alpha('#6366f1', 0.3), color: alpha('#fff', 0.5) },
                    width: 36, height: 36,
                  }}
                >
                  {sendingMessage ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Box>
            </Box>

            <Divider />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 0, px: 0.5, py: 0.5 }}>
              <Button
                size="small" fullWidth
                startIcon={<ArticleOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleFilterByAuthor(authorMember.uid)}
                sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.78rem', py: 1, color: '#6366f1' }}
              >
                {lang === 'ko' ? '문서 보기' : 'View Docs'}
              </Button>
              <Button
                size="small" fullWidth
                startIcon={<EmailOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  if (authorMember.email) {
                    window.open(`mailto:${authorMember.email}`, '_blank');
                  }
                }}
                sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.78rem', py: 1, color: '#3b82f6' }}
              >
                {lang === 'ko' ? '이메일' : 'Email'}
              </Button>
              <Button
                size="small" fullWidth
                startIcon={<AssignmentOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => { closeAuthorCard(); navigate('/tasks'); }}
                sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.78rem', py: 1, color: '#10b981' }}
              >
                {lang === 'ko' ? '업무 할당' : 'Assign Task'}
              </Button>
            </Box>
          </Box>
        )}
      </Popover>

      {/* ─── Folder Creation Dialog ────────────── */}
      <Dialog
        open={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, minWidth: 360 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {lang === 'ko' ? '📂 새 폴더' : '📂 New Folder'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth size="small"
            label={lang === 'ko' ? '폴더 이름' : 'Folder name'}
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && folderName.trim()) handleConfirmFolder(); }}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialogOpen(false)} sx={{ borderRadius: 2 }}>
            {lang === 'ko' ? '취소' : 'Cancel'}
          </Button>
          <Button
            variant="contained" onClick={handleConfirmFolder}
            disabled={!folderName.trim() || creatingFolder}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {creatingFolder
              ? <CircularProgress size={16} color="inherit" />
              : (lang === 'ko' ? '만들기' : 'Create')
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirm ──────────── */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('deleteDocument') as string}</DialogTitle>
        <DialogContent><Typography>{t('deleteDocumentConfirm') as string}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} sx={{ borderRadius: 2 }}>{t('cancel') as string}</Button>
          <Button variant="contained" color="error" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} sx={{ borderRadius: 2, fontWeight: 700 }}>
            {t('deleteDocument') as string}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Template Picker Dialog ─────── */}
      <Dialog open={templateDialogOpen} onClose={() => { setTemplateDialogOpen(false); setPreviewTemplate(null); }} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', height: '80vh' } }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Main List Sidebar */}
          <Box sx={{ width: previewTemplate ? '40%' : '100%', borderRight: previewTemplate ? '1px solid' : 'none', borderColor: 'divider', display: 'flex', flexDirection: 'column', transition: 'width 0.3s' }}>
            <DialogTitle sx={{ fontWeight: 800, fontSize: '1.3rem', pb: 1, pt: 3, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" />
                {lang === 'ko' ? '문서 템플릿' : 'Document Templates'}
              </Box>
              <IconButton onClick={() => setTemplateDialogOpen(false)} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <Box sx={{ px: 3, pb: 2 }}>
              <TextField
                fullWidth size="small"
                placeholder={lang === 'ko' ? '템플릿 검색...' : 'Search templates...'}
                value={templateSearchQuery}
                onChange={e => setTemplateSearchQuery(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} />, sx: { borderRadius: 2.5 } }}
              />
            </Box>
            <DialogContent sx={{ p: 0, overflow: 'auto' }}>
              {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([catKey, catInfo]) => {
                const filteredTemplates = DOC_TEMPLATES.filter(tp =>
                  tp.category === catKey &&
                  (tp.nameKo.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                    tp.nameEn.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                    tp.tags.some(t => t.toLowerCase().includes(templateSearchQuery.toLowerCase())))
                );
                if (filteredTemplates.length === 0) return null;
                return (
                  <Box key={catKey} sx={{ px: 3, mb: 3 }}>
                    <Typography variant="caption" fontWeight={800} sx={{ color: catInfo.color, letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 1, opacity: 0.8 }}>
                      {lang === 'ko' ? catInfo.ko : catInfo.en}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {filteredTemplates.map(tpl => (
                        <Paper key={tpl.id}
                          onClick={() => setPreviewTemplate(tpl)}
                          onDoubleClick={() => handleNewFromTemplate(tpl)}
                          sx={{
                            p: 1.5, borderRadius: 2.5, cursor: 'pointer', border: '1.5px solid',
                            borderColor: previewTemplate?.id === tpl.id ? catInfo.color : 'divider',
                            bgcolor: previewTemplate?.id === tpl.id ? alpha(catInfo.color, 0.04) : 'transparent',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: alpha(catInfo.color, 0.02), transform: 'translateX(4px)' },
                          }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography sx={{ fontSize: '1.2rem' }}>{tpl.icon}</Typography>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>{lang === 'ko' ? tpl.nameKo : tpl.nameEn}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{lang === 'ko' ? tpl.descKo : tpl.descEn}</Typography>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </DialogContent>
          </Box>

          {/* Preview Panel */}
          {previewTemplate && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: alpha('#f8fafc', 0.5), animation: 'fadeIn 0.3s' }}>
              <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '1.8rem' }}>{previewTemplate.icon}</Typography>
                  <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>{lang === 'ko' ? previewTemplate.nameKo : previewTemplate.nameEn}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      {previewTemplate.tags.map(t => <Chip key={t} label={t} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />)}
                    </Box>
                  </Box>
                </Box>
                <Button variant="contained" onClick={() => handleNewFromTemplate(previewTemplate)}
                  sx={{ borderRadius: 2, fontWeight: 700, px: 3, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {lang === 'ko' ? '이 템플릿 사용' : 'Use Template'}
                </Button>
              </Box>
              <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                <Typography variant="caption" color="text.disabled" fontWeight={700} sx={{ display: 'block', mb: 2, textTransform: 'uppercase' }}>Preview</Typography>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'white', minHeight: '100%' }}>
                  <Box sx={{ '& h1, & h2, & h3': { color: 'text.primary', mt: 2, mb: 1 }, '& table': { borderCollapse: 'collapse', my: 2 }, '& pre': { background: '#f8fafc', p: 2, borderRadius: 2, fontSize: '0.8rem' }, lineHeight: 1.6, fontSize: '0.85rem' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(previewTemplate.content) }} />
                </Paper>
              </Box>
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default WikiPage;
