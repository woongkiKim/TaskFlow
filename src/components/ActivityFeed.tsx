// src/components/ActivityFeed.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Avatar, Chip, CircularProgress, alpha, Divider, Button,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import CreateIcon from '@mui/icons-material/Create';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FlagIcon from '@mui/icons-material/Flag';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { fetchActivities } from '../services/activityService';
import type { ActivityEntry, ActivityAction, ActivityEntityType } from '../types';

// ─── Action Config ───────────────────────────────────
const ACTION_CONFIG: Record<ActivityAction, { icon: React.ReactNode; color: string; labelKo: string; labelEn: string }> = {
  created:          { icon: <AddIcon sx={{ fontSize: 16 }} />,              color: '#10b981', labelKo: '생성', labelEn: 'created' },
  updated:          { icon: <CreateIcon sx={{ fontSize: 16 }} />,           color: '#6366f1', labelKo: '수정', labelEn: 'updated' },
  deleted:          { icon: <DeleteOutlineIcon sx={{ fontSize: 16 }} />,    color: '#ef4444', labelKo: '삭제', labelEn: 'deleted' },
  commented:        { icon: <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />,color: '#3b82f6', labelKo: '댓글', labelEn: 'commented' },
  assigned:         { icon: <PersonAddIcon sx={{ fontSize: 16 }} />,        color: '#8b5cf6', labelKo: '담당자 지정', labelEn: 'assigned' },
  unassigned:       { icon: <PersonAddIcon sx={{ fontSize: 16 }} />,        color: '#94a3b8', labelKo: '담당자 해제', labelEn: 'unassigned' },
  status_changed:   { icon: <SwapHorizIcon sx={{ fontSize: 16 }} />,        color: '#f59e0b', labelKo: '상태 변경', labelEn: 'changed status' },
  priority_changed: { icon: <FlagIcon sx={{ fontSize: 16 }} />,             color: '#ea580c', labelKo: '우선순위 변경', labelEn: 'changed priority' },
  moved:            { icon: <SwapHorizIcon sx={{ fontSize: 16 }} />,        color: '#06b6d4', labelKo: '이동', labelEn: 'moved' },
  pinned:           { icon: <PushPinIcon sx={{ fontSize: 16 }} />,          color: '#6366f1', labelKo: '고정', labelEn: 'pinned' },
  unpinned:         { icon: <PushPinIcon sx={{ fontSize: 16 }} />,          color: '#94a3b8', labelKo: '고정 해제', labelEn: 'unpinned' },
  favorited:        { icon: <StarIcon sx={{ fontSize: 16 }} />,             color: '#f59e0b', labelKo: '즐겨찾기', labelEn: 'favorited' },
  unfavorited:      { icon: <StarIcon sx={{ fontSize: 16 }} />,             color: '#94a3b8', labelKo: '즐겨찾기 해제', labelEn: 'unfavorited' },
  completed:        { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,      color: '#10b981', labelKo: '완료', labelEn: 'completed' },
  reopened:         { icon: <SwapHorizIcon sx={{ fontSize: 16 }} />,        color: '#f59e0b', labelKo: '재오픈', labelEn: 'reopened' },
  archived:         { icon: <ArchiveOutlinedIcon sx={{ fontSize: 16 }} />,  color: '#6b7280', labelKo: '보관', labelEn: 'archived' },
};

const ENTITY_LABEL: Record<ActivityEntityType, { ko: string; en: string; emoji: string }> = {
  task:    { ko: '태스크', en: 'task', emoji: '📋' },
  wiki:    { ko: '문서', en: 'document', emoji: '📄' },
  project: { ko: '프로젝트', en: 'project', emoji: '📁' },
  sprint:  { ko: '스프린트', en: 'sprint', emoji: '🏃' },
  okr:     { ko: 'OKR', en: 'OKR', emoji: '🎯' },
  member:  { ko: '멤버', en: 'member', emoji: '👤' },
};

// ─── Relative Time ───────────────────────────────────
const relativeTime = (ts: string, isKo: boolean): string => {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return isKo ? '방금 전' : 'just now';
  if (mins < 60) return isKo ? `${mins}분 전` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isKo ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return isKo ? `${days}일 전` : `${days}d ago`;
  return new Date(ts).toLocaleDateString(isKo ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
};

// ─── Group by date ───────────────────────────────────
const groupByDate = (entries: ActivityEntry[], isKo: boolean): { label: string; entries: ActivityEntry[] }[] => {
  const groups: Record<string, ActivityEntry[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const entry of entries) {
    const d = new Date(entry.timestamp).toDateString();
    let label: string;
    if (d === today) label = isKo ? '오늘' : 'Today';
    else if (d === yesterday) label = isKo ? '어제' : 'Yesterday';
    else label = new Date(entry.timestamp).toLocaleDateString(isKo ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }
  return Object.entries(groups).map(([label, entries]) => ({ label, entries }));
};

// ─── Component ───────────────────────────────────────
interface ActivityFeedProps {
  entityType?: ActivityEntityType;
  entityId?: string;
  limit?: number;
  compact?: boolean;
  title?: string;
}

const ActivityFeed = ({ entityType, entityId, limit = 30, compact = false, title }: ActivityFeedProps) => {
  const { lang } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const isKo = lang === 'ko';

  const load = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    try {
      setLoading(true);
      const result = await fetchActivities(currentWorkspace.id, { entityType, entityId, limit });
      setActivities(result);
    } catch (e) {
      console.error('Failed to fetch activities:', e);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, entityType, entityId, limit]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const displayActivities = showAll ? activities : activities.slice(0, compact ? 5 : 10);
  const dateGroups = groupByDate(displayActivities, isKo);

  return (
    <Box>
      {/* Header */}
      {title !== undefined ? (
        title && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <HistoryIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
            <Chip label={activities.length} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
          </Box>
        )
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <HistoryIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="subtitle2" fontWeight={700}>
            {isKo ? '활동 로그' : 'Activity Log'}
          </Typography>
          <Chip label={activities.length} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
        </Box>
      )}

      {activities.length === 0 ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
          {isKo ? '활동 기록이 없습니다' : 'No activity yet'}
        </Typography>
      ) : (
        <>
          {dateGroups.map(group => (
            <Box key={group.label} sx={{ mb: 2 }}>
              {!compact && (
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ display: 'block', mb: 1, pl: 0.5, letterSpacing: 0.5 }}>
                  {group.label}
                </Typography>
              )}
              {group.entries.map((entry, idx) => {
                const cfg = ACTION_CONFIG[entry.action];
                const entityCfg = ENTITY_LABEL[entry.entityType];
                return (
                  <Box key={entry.id} sx={{ display: 'flex', gap: 1.5, mb: 0, position: 'relative' }}>
                    {/* Timeline line */}
                    {!compact && idx < group.entries.length - 1 && (
                      <Box sx={{
                        position: 'absolute', left: 15, top: 32, bottom: -4,
                        width: 2, bgcolor: 'divider', borderRadius: 1,
                      }} />
                    )}

                    {/* Icon dot */}
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(cfg.color, 0.12), color: cfg.color,
                      zIndex: 1,
                    }}>
                      {cfg.icon}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, py: 0.5, pb: 1.5, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                          <Box component="span" sx={{ fontWeight: 700 }}>{entry.userName}</Box>
                          {' '}
                          <Box component="span" sx={{ color: 'text.secondary' }}>
                            {isKo ? entityCfg.ko : entityCfg.en}
                          </Box>
                          {' '}
                          <Box component="span" sx={{ fontWeight: 600, color: cfg.color }}>
                            {entityCfg.emoji} {entry.entityTitle}
                          </Box>
                          {'을(를) '}
                          <Box component="span" sx={{ fontWeight: 600 }}>
                            {isKo ? cfg.labelKo : cfg.labelEn}
                          </Box>
                        </Typography>
                      </Box>

                      {/* Field changes */}
                      {entry.changes && entry.changes.length > 0 && (
                        <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                          {entry.changes.map((change, ci) => (
                            <Box key={ci} sx={{
                              display: 'flex', alignItems: 'center', gap: 0.5,
                              fontSize: '0.75rem', color: 'text.secondary',
                              bgcolor: alpha('#6366f1', 0.04), borderRadius: 1, px: 1, py: 0.3,
                            }}>
                              <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary', minWidth: 50 }}>
                                {change.displayField || change.field}
                              </Typography>
                              {change.from && (
                                <>
                                  <Box sx={{
                                    px: 0.8, py: 0.1, borderRadius: 0.5, fontSize: '0.7rem',
                                    bgcolor: alpha('#ef4444', 0.08), color: '#ef4444',
                                    textDecoration: 'line-through', maxWidth: 120,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {change.from}
                                  </Box>
                                  <Typography variant="caption" color="text.disabled">→</Typography>
                                </>
                              )}
                              {change.to && (
                                <Box sx={{
                                  px: 0.8, py: 0.1, borderRadius: 0.5, fontSize: '0.7rem',
                                  bgcolor: alpha('#10b981', 0.08), color: '#10b981',
                                  fontWeight: 600, maxWidth: 120,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {change.to}
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}

                      {/* Description */}
                      {entry.description && (
                        <Typography variant="caption" color="text.secondary" sx={{
                          mt: 0.5, display: 'block', fontStyle: 'italic',
                          pl: 1, borderLeft: '2px solid', borderColor: 'divider',
                        }}>
                          {entry.description}
                        </Typography>
                      )}

                      {/* Timestamp */}
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: 'block', fontSize: '0.68rem' }}>
                        {relativeTime(entry.timestamp, isKo)}
                      </Typography>
                    </Box>

                    {/* User avatar (non-compact) */}
                    {!compact && (
                      <Avatar src={entry.userPhoto} sx={{ width: 24, height: 24, fontSize: 11, flexShrink: 0, mt: 0.5 }}>
                        {entry.userName?.charAt(0)}
                      </Avatar>
                    )}
                  </Box>
                );
              })}
              {!compact && <Divider sx={{ my: 1 }} />}
            </Box>
          ))}

          {/* Show more */}
          {!showAll && activities.length > (compact ? 5 : 10) && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button size="small" onClick={() => setShowAll(true)}
                sx={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'none', color: 'primary.main' }}>
                {isKo ? `전체 ${activities.length}개 보기` : `Show all ${activities.length}`}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ActivityFeed;
