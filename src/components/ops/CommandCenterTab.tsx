// src/components/ops/CommandCenterTab.tsx
import { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, LinearProgress, Collapse, AvatarGroup, Avatar, alpha, useTheme,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FlagIcon from '@mui/icons-material/Flag';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

import { normalizePriority } from '../../types';
import type { Handoff, Issue } from '../../types';
import type { Task } from '../../types';
import { MetricCard } from '../../pages/OpsCenterDialogs';
import { textByLang, thSx, tdSx } from '../../pages/opsConstants';

interface TeamGroup {
  id: string;
  name: string;
  color: string;
  memberIds?: string[];
}

interface Member {
  uid: string;
  displayName: string;
  photoURL?: string;
}

interface SprintProgress {
  name: string;
  total: number;
  done: number;
  pct: number;
}

interface CommandCenterTabProps {
  lang: 'ko' | 'en';
  filteredTasks: Task[];
  openP0: Task[];
  blockedItems: Task[];
  dueIn48h: Task[];
  overdueTasks: Task[];
  inProgressCount: number;
  reviewNeeded: number;
  handoffs: Handoff[];
  issues: Issue[];
  teamGroups: TeamGroup[];
  currentMembers: Member[];
  sprintProgress: SprintProgress | null;
  reportText: string;
  today: string;
  onCopyReport: () => void;
  onTaskClick: (task: Task) => void;
  onTabChange: (tabIndex: number) => void;
  onRolloverOpen: () => void;
}

const CommandCenterTab = ({
  lang, filteredTasks,
  openP0, blockedItems, dueIn48h, overdueTasks,
  inProgressCount, reviewNeeded, handoffs, issues,
  teamGroups, currentMembers, sprintProgress,
  reportText, today,
  onCopyReport, onTaskClick, onTabChange, onRolloverOpen,
}: CommandCenterTabProps) => {
  const theme = useTheme();
  const [drillDown, setDrillDown] = useState<'p0' | 'blocked' | 'due48h' | 'overdue' | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  return (
    <>
      {/* Metric Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        <MetricCard icon={<FlagIcon />} label={textByLang(lang, 'Open P0', '미해결 P0')} value={openP0.length}
          color="#dc2626" bgColor="#fef2f2" detail={openP0.slice(0, 2).map(t => t.text).join(', ')}
          onClick={() => setDrillDown(prev => prev === 'p0' ? null : 'p0')} />
        <MetricCard icon={<BlockIcon />} label={textByLang(lang, 'Blocked', '차단됨')} value={blockedItems.length}
          color="#ea580c" bgColor="#fff7ed" detail={blockedItems.slice(0, 2).map(t => t.text).join(', ')}
          onClick={() => setDrillDown(prev => prev === 'blocked' ? null : 'blocked')} />
        <MetricCard icon={<WarningAmberIcon />} label={textByLang(lang, 'Due in 48h', '48시간 내 마감')} value={dueIn48h.length}
          color="#ca8a04" bgColor="#fefce8" detail={dueIn48h.slice(0, 2).map(t => `${t.text} (${t.dueDate})`).join(', ')}
          onClick={() => setDrillDown(prev => prev === 'due48h' ? null : 'due48h')} />
        <MetricCard icon={<ScheduleIcon />} label={textByLang(lang, 'Overdue', '기한 초과')} value={overdueTasks.length}
          color="#9333ea" bgColor="#faf5ff" detail={overdueTasks.slice(0, 2).map(t => t.text).join(', ')}
          onClick={() => setDrillDown(prev => prev === 'overdue' ? null : 'overdue')} />
        {sprintProgress && (
          <Paper sx={{
            p: 2, borderRadius: 3, border: '1px solid', borderColor: '#6366f1' + '30',
            bgcolor: '#eef2ff', display: 'flex', flexDirection: 'column', gap: 1,
            transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RocketLaunchIcon sx={{ color: '#6366f1', fontSize: 24 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight={600} color="#6366f1" sx={{ opacity: 0.8 }}>
                  {textByLang(lang, 'Sprint', '스프린트')}
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap>{sprintProgress.name}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress variant="determinate" value={sprintProgress.pct}
                sx={{
                  flex: 1, height: 8, borderRadius: 4, bgcolor: alpha('#6366f1', 0.15),
                  '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#6366f1' }
                }} />
              <Typography variant="caption" fontWeight={700} color="#6366f1">{sprintProgress.pct}%</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {sprintProgress.done}/{sprintProgress.total} {textByLang(lang, 'tasks done', '작업 완료')}
            </Typography>
            {sprintProgress.total > sprintProgress.done && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => { e.stopPropagation(); onRolloverOpen(); }}
                sx={{ mt: 1, textTransform: 'none', py: 0, fontSize: '0.7rem' }}
              >
                {textByLang(lang, 'Rollover Incomplete', '미완료 작업 이월')}
              </Button>
            )}
          </Paper>
        )}
      </Box>

      {/* ═══ DRILL-DOWN PANEL ═══ */}
      <Collapse in={drillDown !== null} timeout={300}>
        {(() => {
          const drillDownConfig: Record<string, { title: string; items: typeof openP0; color: string }> = {
            p0: { title: textByLang(lang, 'Open P0 Tasks', '미해결 P0 작업'), items: openP0, color: '#dc2626' },
            blocked: { title: textByLang(lang, 'Blocked Tasks', '차단된 작업'), items: blockedItems, color: '#ea580c' },
            due48h: { title: textByLang(lang, 'Due Within 48 Hours', '48시간 내 마감 작업'), items: dueIn48h, color: '#ca8a04' },
            overdue: { title: textByLang(lang, 'Overdue Tasks', '기한 초과 작업'), items: overdueTasks, color: '#9333ea' },
          };
          const cfg = drillDown ? drillDownConfig[drillDown] : null;
          if (!cfg || cfg.items.length === 0) return (
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {textByLang(lang, 'No items to display', '표시할 항목이 없습니다')}
              </Typography>
            </Paper>
          );
          return (
            <Paper sx={{ mb: 3, borderRadius: 3, border: '2px solid', borderColor: cfg.color + '30', overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: cfg.color + '08', borderBottom: '1px solid', borderColor: cfg.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight={700} color={cfg.color}>
                  {cfg.title} ({cfg.items.length})
                </Typography>
                <Button size="small" onClick={() => setDrillDown(null)} sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                  {textByLang(lang, 'Close', '닫기')}
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(cfg.color, 0.04) }}>
                      <TableCell sx={thSx}>ID</TableCell>
                      <TableCell sx={thSx}>{textByLang(lang, 'Task', '작업')}</TableCell>
                      <TableCell sx={thSx}>{textByLang(lang, 'Priority', '우선순위')}</TableCell>
                      <TableCell sx={thSx}>{textByLang(lang, 'Due Date', '마감일')}</TableCell>
                      <TableCell sx={thSx}>{textByLang(lang, 'Status', '상태')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cfg.items.map(task => (
                      <TableRow key={task.id} hover onClick={() => onTaskClick(task)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(cfg.color, 0.06) } }}>
                        <TableCell>
                          <Chip label={task.taskCode || task.id.slice(0, 6)} size="small"
                            sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22 }} />
                        </TableCell>
                        <TableCell sx={{ ...tdSx, fontWeight: 600, maxWidth: 300 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {task.text}
                            <LinkIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 0.5 }} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={task.priority || '-'} size="small"
                            sx={{
                              height: 20, fontSize: '0.65rem', fontWeight: 700,
                              bgcolor: normalizePriority(task.priority) === 'P0' ? '#fef2f2' :
                                normalizePriority(task.priority) === 'P1' ? '#fff7ed' : '#f8fafc',
                              color: normalizePriority(task.priority) === 'P0' ? '#dc2626' :
                                normalizePriority(task.priority) === 'P1' ? '#ea580c' : '#64748b',
                            }} />
                        </TableCell>
                        <TableCell sx={{ ...tdSx, color: task.dueDate && task.dueDate < today ? '#dc2626' : 'text.secondary', fontWeight: task.dueDate && task.dueDate < today ? 600 : 400 }}>
                          {task.dueDate || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip label={task.status || 'todo'} size="small"
                            sx={{
                              height: 20, fontSize: '0.6rem', fontWeight: 600,
                              bgcolor: task.status === 'inprogress' ? '#dbeafe' : task.status === 'in-review' ? '#fae8ff' : '#f1f5f9',
                              color: task.status === 'inprogress' ? '#2563eb' : task.status === 'in-review' ? '#a855f7' : '#64748b',
                            }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          );
        })()}
      </Collapse>

      {/* ═══ TEAM STATUS DASHBOARD ═══ */}
      {teamGroups.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            👥 {textByLang(lang, 'Team Status Dashboard', '팀 상태 대시보드')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
            {teamGroups.map(tg => {
              const tgMemberIds = tg.memberIds || [];
              const tgMembers = currentMembers.filter(m => tgMemberIds.includes(m.uid));
              const tgTasks = filteredTasks.filter(t =>
                tgMemberIds.includes(t.assigneeId || '') || t.owners?.some(o => tgMemberIds.includes(o.uid))
              );
              const tgDone = tgTasks.filter(t => t.completed).length;
              const tgTotal = tgTasks.length;
              const tgP0 = tgTasks.filter(t => !t.completed && normalizePriority(t.priority) === 'P0').length;
              const tgBlocked = tgTasks.filter(t => !t.completed && t.blockerStatus === 'blocked').length;
              const tgOverdue = tgTasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
              const tgIssues = issues.filter(i => tgMemberIds.includes(i.memberUid) && i.status === 'monitoring').length;
              const tgHandoffsIn = handoffs.filter(h => tgMemberIds.includes(h.receiverUid || '') && h.status === 'pending').length;
              const tgPct = tgTotal > 0 ? Math.round((tgDone / tgTotal) * 100) : 0;

              return (
                <Paper key={tg.id} onClick={() => setExpandedTeamId(prev => prev === tg.id ? null : tg.id)} sx={{
                  p: 2, borderRadius: 3, border: '2px solid',
                  borderColor: expandedTeamId === tg.id ? tg.color : tg.color + '30',
                  cursor: 'pointer',
                  transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tg.color }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>{tg.name}</Typography>
                    {tgMembers.length > 0 && (
                      <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.6rem' } }}>
                        {tgMembers.map(m => (
                          <Tooltip key={m.uid} title={m.displayName}>
                            <Avatar src={m.photoURL} sx={{ bgcolor: tg.color }}>{m.displayName.charAt(0)}</Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LinearProgress variant="determinate" value={tgPct}
                      sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: alpha(tg.color, 0.12), '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: tg.color } }} />
                    <Typography variant="caption" fontWeight={700} color={tg.color}>{tgPct}%</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    📊 {tgDone}/{tgTotal} {textByLang(lang, 'tasks done', '작업 완료')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {tgP0 > 0 && <Chip label={`🔴 P0: ${tgP0}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#fef2f2', color: '#dc2626' }} />}
                    {tgBlocked > 0 && <Chip label={`🚫 ${textByLang(lang, 'Blocked', '차단')}: ${tgBlocked}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#fff7ed', color: '#ea580c' }} />}
                    {tgOverdue > 0 && <Chip label={`⏰ ${textByLang(lang, 'Overdue', '지연')}: ${tgOverdue}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#faf5ff', color: '#9333ea' }} />}
                    {tgIssues > 0 && <Chip label={`⚠️ ${textByLang(lang, 'Issues', '이슈')}: ${tgIssues}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#fef2f2', color: '#ef4444' }} />}
                    {tgHandoffsIn > 0 && <Chip label={`📥 ${textByLang(lang, 'Incoming', '수신')}: ${tgHandoffsIn}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#ecfeff', color: '#06b6d4' }} />}
                    {tgP0 === 0 && tgBlocked === 0 && tgOverdue === 0 && tgIssues === 0 && tgHandoffsIn === 0 && (
                      <Chip label={`✅ ${textByLang(lang, 'All Clear', '이상 없음')}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, bgcolor: '#f0fdf4', color: '#16a34a' }} />
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
          {/* Full-Width Team Drill-Down */}
          {expandedTeamId && (() => {
            const tg = teamGroups.find(g => g.id === expandedTeamId);
            if (!tg) return null;
            const tgMemberIds = tg.memberIds || [];
            const tgTasks = filteredTasks.filter(t =>
              tgMemberIds.includes(t.assigneeId || '') || t.owners?.some(o => tgMemberIds.includes(o.uid))
            ).filter(t => !t.completed);
            return (
              <Collapse in timeout={300}>
                <Paper variant="outlined" sx={{ mt: 2, borderRadius: 3, overflow: 'hidden', borderColor: tg.color + '40', border: '2px solid' }}>
                  <Box sx={{ px: 2.5, py: 1.5, bgcolor: alpha(tg.color, 0.06), borderBottom: '1px solid', borderColor: tg.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tg.color }} />
                      <Typography variant="subtitle2" fontWeight={700} color={tg.color}>
                        {tg.name} — {textByLang(lang, 'Active Tasks', '진행 중 작업')} ({tgTasks.length})
                      </Typography>
                    </Box>
                    <Button size="small" onClick={(e) => { e.stopPropagation(); setExpandedTeamId(null); }}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}>
                      {textByLang(lang, 'Close', '닫기')}
                    </Button>
                  </Box>
                  {tgTasks.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {textByLang(lang, 'No active tasks', '진행 중인 작업이 없습니다')}
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(tg.color, 0.04) }}>
                            <TableCell sx={{ ...thSx, width: 70 }}>ID</TableCell>
                            <TableCell sx={thSx}>{textByLang(lang, 'Task', '작업')}</TableCell>
                            <TableCell sx={{ ...thSx, width: 80 }}>{textByLang(lang, 'Priority', '우선순위')}</TableCell>
                            <TableCell sx={{ ...thSx, width: 90 }}>{textByLang(lang, 'Due Date', '마감일')}</TableCell>
                            <TableCell sx={{ ...thSx, width: 90 }}>{textByLang(lang, 'Status', '상태')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {tgTasks.slice(0, 15).map(task => (
                            <TableRow key={task.id} hover onClick={() => onTaskClick(task)}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(tg.color, 0.04) } }}>
                              <TableCell>
                                <Chip label={task.taskCode || task.id.slice(0, 6)} size="small"
                                  sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22, fontSize: '0.7rem' }} />
                              </TableCell>
                              <TableCell sx={{ ...tdSx, fontWeight: 600 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {task.text}
                                  <LinkIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip label={task.priority || '-'} size="small"
                                  sx={{
                                    height: 20, fontSize: '0.65rem', fontWeight: 700,
                                    bgcolor: normalizePriority(task.priority) === 'P0' ? '#fef2f2' :
                                      normalizePriority(task.priority) === 'P1' ? '#fff7ed' : '#f8fafc',
                                    color: normalizePriority(task.priority) === 'P0' ? '#dc2626' :
                                      normalizePriority(task.priority) === 'P1' ? '#ea580c' : '#64748b',
                                  }} />
                              </TableCell>
                              <TableCell sx={{ ...tdSx, color: task.dueDate && task.dueDate < today ? '#dc2626' : 'text.secondary', fontWeight: task.dueDate && task.dueDate < today ? 600 : 400 }}>
                                {task.dueDate || '-'}
                              </TableCell>
                              <TableCell>
                                <Chip label={task.status || 'todo'} size="small"
                                  sx={{
                                    height: 20, fontSize: '0.6rem', fontWeight: 600,
                                    bgcolor: task.status === 'inprogress' ? '#dbeafe' : task.status === 'in-review' ? '#fae8ff' : '#f1f5f9',
                                    color: task.status === 'inprogress' ? '#2563eb' : task.status === 'in-review' ? '#a855f7' : '#64748b',
                                  }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Collapse>
            );
          })()}
        </Box>
      )}

      {/* ═══ CROSS-TEAM FLOW ═══ */}
      {teamGroups.length > 1 && handoffs.length > 0 && (() => {
        const getMemberTeamName = (uid: string) => {
          const tg = teamGroups.find(g => g.memberIds?.includes(uid));
          return tg ? tg.name : textByLang(lang, 'Unassigned', '미배정');
        };
        const getMemberTeamColor = (uid: string) => {
          const tg = teamGroups.find(g => g.memberIds?.includes(uid));
          return tg ? tg.color : '#9ca3af';
        };
        const flows: Record<string, { from: string; to: string; fromColor: string; toColor: string; count: number; pending: number }> = {};
        handoffs.forEach(h => {
          const from = getMemberTeamName(h.senderUid || '');
          const to = getMemberTeamName(h.receiverUid || '');
          if (from === to) return;
          const key = `${from}→${to}`;
          if (!flows[key]) flows[key] = { from, to, fromColor: getMemberTeamColor(h.senderUid || ''), toColor: getMemberTeamColor(h.receiverUid || ''), count: 0, pending: 0 };
          flows[key].count++;
          if (h.status === 'pending') flows[key].pending++;
        });
        const flowList = Object.values(flows);
        if (flowList.length === 0) return null;
        return (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
              🔄 {textByLang(lang, 'Cross-Team Flow', '팀 간 전달 흐름')}
            </Typography>
            <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {flowList.map((f, i) => (
                  <Box key={i} onClick={() => onTabChange(2)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
                      bgcolor: 'grey.50', borderRadius: 2, cursor: 'pointer',
                      transition: 'all 0.15s',
                      '&:hover': { bgcolor: alpha(f.fromColor, 0.08), transform: 'translateY(-1px)' },
                    }}>
                    <Chip label={f.from} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: f.fromColor + '20', color: f.fromColor }} />
                    <Typography variant="body2" fontWeight={700} sx={{ color: 'text.secondary' }}>→</Typography>
                    <Chip label={f.to} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: f.toColor + '20', color: f.toColor }} />
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      {f.count} {f.pending > 0 ? `(${f.pending} ${textByLang(lang, 'pending', '대기')})` : ''}
                    </Typography>
                    <LinkIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 'auto' }} />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>
        );
      })()}

      {/* Status Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip label={`${textByLang(lang, 'In Progress', '진행 중')}: ${inProgressCount}`} sx={{ fontWeight: 600, bgcolor: alpha('#2563eb', 0.1), color: '#2563eb' }} />
        <Chip label={`${textByLang(lang, 'Review Needed', '리뷰 필요')}: ${reviewNeeded}`} sx={{ fontWeight: 600, bgcolor: alpha('#d97706', 0.1), color: '#d97706' }} />
        <Chip label={`${textByLang(lang, 'Pending Handoffs', '대기 핸드오프')}: ${handoffs.filter(h => h.status === 'pending').length}`} sx={{ fontWeight: 600, bgcolor: alpha('#06b6d4', 0.1), color: '#06b6d4' }} />
        <Chip label={`${textByLang(lang, 'Active Issues', '활성 이슈')}: ${issues.filter(i => i.status === 'monitoring').length}`} sx={{ fontWeight: 600, bgcolor: alpha('#ef4444', 0.1), color: '#ef4444' }} />
      </Box>

      {/* Daily Ops Report */}
      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            📋 {textByLang(lang, 'Auto-Generated Daily Ops Report', '자동 생성 일일 Ops 리포트')}
          </Typography>
          <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={onCopyReport}
            size="small" sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: 'none'
            }}>
            {textByLang(lang, 'Copy Report', '리포트 복사')}
          </Button>
        </Box>
        <Paper variant="outlined" sx={{
          p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.02),
          fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: 1.8,
          whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto',
        }}>
          {reportText}
        </Paper>
      </Paper>
    </>
  );
};

export default CommandCenterTab;
