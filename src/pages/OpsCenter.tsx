// src/pages/OpsCenter.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Chip, IconButton, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, FormControl, InputLabel, FormControlLabel,
    Tooltip, Checkbox, Snackbar, Alert, LinearProgress,
    Skeleton, useTheme, alpha, ToggleButtonGroup, ToggleButton, AvatarGroup, Avatar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FlagIcon from '@mui/icons-material/Flag';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTasks } from '../hooks/useTasks';
import {
    fetchDecisions, addDecision, deleteDecision,
    fetchHandoffs, addHandoff, updateHandoff, deleteHandoff,
    fetchIssues, addIssue, deleteIssue,
    generateDailyOpsReport,
} from '../services/opsService';
import type {
    Decision, Handoff, Issue,
    HandoffType, IssueCategory, IssueScope,
} from '../types';
import {
    normalizePriority,
    HANDOFF_TYPE_CONFIG, HANDOFF_CHECKLISTS,
    ISSUE_CATEGORY_CONFIG,
    ISSUE_SCOPE_CONFIG,
} from '../types';
import { format } from 'date-fns';
import TabPanel from '../components/TabPanel';
import { AddDecisionDialog, AddHandoffDialog, AddIssueDialog, MetricCard } from './OpsCenterDialogs';

const textByLang = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

const TEAM_LABELS: Record<string, { en: string; ko: string }> = {
    Design: { en: 'Design', ko: '디자인' },
    Dev: { en: 'Dev', ko: '개발' },
    QA: { en: 'QA', ko: 'QA' },
    Marketing: { en: 'Marketing', ko: '마케팅' },
    PM: { en: 'PM', ko: 'PM' },
};

const HANDOFF_TYPE_LABELS: Record<HandoffType, { en: string; ko: string }> = {
    bug_fix: { en: 'Bug Fix', ko: '버그 수정' },
    feature: { en: 'Feature', ko: '기능 개발' },
    design_review: { en: 'Design Review', ko: '디자인 리뷰' },
    qa_review: { en: 'QA Review', ko: 'QA 리뷰' },
    deployment: { en: 'Deployment', ko: '배포' },
};

const ISSUE_CATEGORY_LABELS: Record<IssueCategory, { en: string; ko: string }> = {
    internet: { en: 'Internet', ko: '인터넷' },
    power: { en: 'Power', ko: '전원' },
    hardware: { en: 'Hardware', ko: '하드웨어' },
    software: { en: 'Software', ko: '소프트웨어' },
    ai_proficiency: { en: 'AI Proficiency', ko: 'AI 숙련도' },
    communication: { en: 'Communication', ko: '커뮤니케이션' },
    environment: { en: 'Environment', ko: '업무 환경' },
    access: { en: 'Access/Auth', ko: '접근/인증' },
    meeting: { en: 'Meeting', ko: '회의' },
    other: { en: 'Other', ko: '기타' },
};

const ISSUE_SCOPE_LABELS: Record<IssueScope, { en: string; ko: string }> = {
    individual: { en: 'Individual', ko: '개인' },
    team: { en: 'Team', ko: '팀' },
    project: { en: 'Project', ko: '프로젝트' },
    all: { en: 'All', ko: '전체' },
};

const ISSUE_STATUS_LABELS: Record<Issue['status'], { en: string; ko: string }> = {
    monitoring: { en: 'Monitoring', ko: '모니터링' },
    resolved: { en: 'Resolved', ko: '해결됨' },
    escalated: { en: 'Escalated', ko: '에스컬레이션' },
};

const HANDOFF_CHECKLIST_ITEM_LABELS: Record<string, { en: string; ko: string }> = {
    'Figma Link': { en: 'Figma Link', ko: '피그마 링크' },
    'Spec/Copy Confirmed': { en: 'Spec/Copy Confirmed', ko: '스펙/카피 확인' },
    'Assets Ready': { en: 'Assets Ready', ko: '에셋 준비 완료' },
    'Repro Steps': { en: 'Repro Steps', ko: '재현 단계' },
    'Env/Device Info': { en: 'Env/Device Info', ko: '환경/디바이스 정보' },
    'Screenshot/Video': { en: 'Screenshot/Video', ko: '스크린샷/영상' },
    'Build Deployed': { en: 'Build Deployed', ko: '빌드 배포 완료' },
    'Test Instructions': { en: 'Test Instructions', ko: '테스트 안내' },
    'Known Limitations': { en: 'Known Limitations', ko: '알려진 제한 사항' },
    'Implemented per Spec': { en: 'Implemented per Spec', ko: '스펙 기준 구현 완료' },
    'Screenshots Attached': { en: 'Screenshots Attached', ko: '스크린샷 첨부' },
};

const getTeamLabel = (team: string, lang: 'ko' | 'en') => TEAM_LABELS[team]?.[lang] || team;
const getHandoffTypeLabel = (type: HandoffType, lang: 'ko' | 'en') => HANDOFF_TYPE_LABELS[type][lang];
const getIssueCategoryLabel = (category: IssueCategory, lang: 'ko' | 'en') => ISSUE_CATEGORY_LABELS[category][lang];
const getIssueScopeLabel = (scope: IssueScope, lang: 'ko' | 'en') => ISSUE_SCOPE_LABELS[scope][lang];
const getIssueStatusLabel = (status: Issue['status'], lang: 'ko' | 'en') => ISSUE_STATUS_LABELS[status][lang];
const getChecklistItemLabel = (item: string, lang: 'ko' | 'en') => HANDOFF_CHECKLIST_ITEM_LABELS[item]?.[lang] || item;



// ─── Main Component ──────────────────────────────────────
const OpsCenter = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const { lang } = useLanguage();
    const { currentWorkspace, currentMembers, sprints, currentSprint, teamGroups } = useWorkspace();
    const wsId = currentWorkspace?.id || '';

    const [tab, setTab] = useState(0);
    const [opsLoading, setOpsLoading] = useState(true);
    const [sprintFilter, setSprintFilter] = useState<string>('all');
    const [myTasksOnly, setMyTasksOnly] = useState(false);

    // Data
    const { tasks, loading: tasksLoading, reload: reloadTasks } = useTasks();
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [handoffs, setHandoffs] = useState<Handoff[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);

    // Dialogs
    const [addDecisionOpen, setAddDecisionOpen] = useState(false);
    const [addHandoffOpen, setAddHandoffOpen] = useState(false);
    const [addIssueOpen, setAddIssueOpen] = useState(false);
    const [snackMsg, setSnackMsg] = useState('');

    // Load ops-specific data
    const loadOpsData = useCallback(async () => {
        if (!wsId) return;
        setOpsLoading(true);
        try {
            const [d, h, i] = await Promise.all([
                fetchDecisions(wsId),
                fetchHandoffs(wsId),
                fetchIssues(wsId),
            ]);
            setDecisions(d); setHandoffs(h); setIssues(i);
        } catch (e) { console.error('OpsCenter load error:', e); }
        finally { setOpsLoading(false); }
    }, [wsId]);

    useEffect(() => { loadOpsData(); }, [loadOpsData]);

    const loading = tasksLoading || opsLoading;

    const filteredTasks = useMemo(() => {
        let result = tasks;
        if (sprintFilter !== 'all') result = result.filter(t => t.sprintId === sprintFilter);
        if (myTasksOnly && user) result = result.filter(t =>
            t.assigneeId === user.uid || t.owners?.some(o => o.uid === user.uid)
        );
        return result;
    }, [tasks, sprintFilter, myTasksOnly, user]);

    // ═══ SPRINT PROGRESS ══════════════════════════════════════
    const sprintProgress = useMemo(() => {
        const sp = currentSprint;
        if (!sp) return null;
        const spTasks = tasks.filter(t => t.sprintId === sp.id);
        const done = spTasks.filter(t => t.completed).length;
        const total = spTasks.length;
        return { name: sp.name, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    }, [tasks, currentSprint]);

    // ═══ METRICS ═══════════════════════════════════════════
    const today = format(new Date(), 'yyyy-MM-dd');
    const openP0 = useMemo(() => filteredTasks.filter(t => !t.completed && normalizePriority(t.priority) === 'P0'), [filteredTasks]);
    const blockedItems = useMemo(() => filteredTasks.filter(t => !t.completed && t.blockerStatus === 'blocked'), [filteredTasks]);
    const dueIn48h = useMemo(() => {
        const cutoff = format(new Date(Date.now() + 48 * 3600000), 'yyyy-MM-dd');
        return filteredTasks.filter(t => !t.completed && t.dueDate && t.dueDate <= cutoff && t.dueDate >= today);
    }, [filteredTasks, today]);
    const overdueTasks = useMemo(() => filteredTasks.filter(t => !t.completed && t.dueDate && t.dueDate < today), [filteredTasks, today]);
    const inProgressCount = useMemo(() => filteredTasks.filter(t => t.status === 'inprogress' && !t.completed).length, [filteredTasks]);
    const reviewNeeded = useMemo(() => filteredTasks.filter(t => t.status === 'in-review' && !t.completed).length, [filteredTasks]);

    // ═══ REPORT ════════════════════════════════════════════
    const reportText = useMemo(() =>
        generateDailyOpsReport(tasks, decisions, handoffs, issues, lang),
        [tasks, decisions, handoffs, issues, lang]
    );

    const handleCopyReport = () => {
        navigator.clipboard.writeText(reportText);
        setSnackMsg(textByLang(lang, 'Report copied to clipboard!', '리포트가 클립보드에 복사되었습니다!'));
    };

    // ═══ DECISION HANDLERS ═════════════════════════════════
    const handleAddDecision = async (data: {
        summary: string; context: string; decider: string;
        affectedTaskIds: string; followUpAction: string; referenceLink: string;
        mentions?: { uid: string; name: string; photo?: string }[];
    }) => {
        if (!user || !wsId) return;
        const code = `D-${String(decisions.length + 1).padStart(3, '0')}`;
        const d = await addDecision({
            decisionCode: code, date: today, summary: data.summary,
            context: data.context, decider: user.uid, deciderName: data.decider,
            affectedTaskIds: data.affectedTaskIds.split(',').map(s => s.trim()).filter(Boolean),
            followUpAction: data.followUpAction, referenceLink: data.referenceLink || undefined,
            mentions: data.mentions,
            workspaceId: wsId,
        });
        setDecisions(prev => [d, ...prev]);
        setAddDecisionOpen(false);
        setSnackMsg(textByLang(lang, 'Decision logged', '의사결정이 기록되었습니다'));
    };

    // ═══ HANDOFF HANDLERS ══════════════════════════════════
    const handleAddHandoff = async (data: {
        fromTeam: string; toTeam: string; type: HandoffType;
        senderName: string; receiverName: string;
        blockingQuestion: string; nextAction: string; relatedTaskId: string;
        senderUid?: string; receiverUid?: string;
    }) => {
        if (!user || !wsId) return;
        const code = `H-${String(handoffs.length + 1).padStart(3, '0')}`;
        const direction = `${data.fromTeam} → ${data.toTeam}`;
        const checklistKeys = HANDOFF_CHECKLISTS[direction] || [];
        const checklist: Record<string, boolean> = {};
        checklistKeys.forEach(k => { checklist[k] = false; });
        const h = await addHandoff({
            handoffCode: code, fromTeam: data.fromTeam, toTeam: data.toTeam,
            type: data.type, ready: false,
            senderUid: data.senderUid || user.uid, senderName: data.senderName,
            receiverUid: data.receiverUid || '', receiverName: data.receiverName,
            checklist, blockingQuestion: data.blockingQuestion || undefined,
            nextAction: data.nextAction || undefined, relatedTaskId: data.relatedTaskId || undefined,
            workspaceId: wsId, status: 'pending',
        });
        setHandoffs(prev => [h, ...prev]);
        setAddHandoffOpen(false);
        setSnackMsg(textByLang(lang, 'Handoff created', '핸드오프가 생성되었습니다'));
    };

    const handleToggleChecklist = async (handoffId: string, key: string, val: boolean) => {
        const h = handoffs.find(x => x.id === handoffId);
        if (!h) return;
        const newChecklist = { ...h.checklist, [key]: val };
        const allReady = Object.values(newChecklist).every(v => v);
        await updateHandoff(handoffId, { checklist: newChecklist, ready: allReady, status: allReady ? 'ready' : 'pending' });
        setHandoffs(prev => prev.map(x => x.id === handoffId
            ? { ...x, checklist: newChecklist, ready: allReady, status: allReady ? 'ready' : 'pending' }
            : x));
    };

    // ═══ ISSUE HANDLERS ════════════════════════════════════
    const handleAddIssue = async (data: {
        memberName: string; memberUid: string; category: IssueCategory; description: string;
        scope: IssueScope; timeLost: string; workaround: string;
        taggedMembers?: { uid: string; name: string; photo?: string }[];
    }) => {
        if (!user || !wsId) return;
        const now = new Date();
        const i = await addIssue({
            date: format(now, 'yyyy-MM-dd'), time: format(now, 'HH:mm'),
            memberUid: data.memberUid, memberName: data.memberName,
            category: data.category, description: data.description,
            scope: data.scope, timeLost: data.timeLost, workaround: data.workaround,
            taggedMembers: data.taggedMembers,
            status: 'monitoring', workspaceId: wsId,
        });
        setIssues(prev => [i, ...prev]);
        setAddIssueOpen(false);
        setSnackMsg(textByLang(lang, 'Issue logged', '이슈가 기록되었습니다'));
    };

    // ═══ LOADING STATE ═════════════════════════════════════
    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="text" width={200} height={40} />
                <Skeleton variant="rectangular" height={52} sx={{ mt: 1, borderRadius: 2 }} />
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" width="25%" height={100} sx={{ borderRadius: 3 }} />)}
                </Box>
                <Skeleton variant="rectangular" height={300} sx={{ mt: 3, borderRadius: 3 }} />
            </Box>
        );
    }

    // ═══ RENDER ════════════════════════════════════════════
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h5" fontWeight={800} sx={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                    🎯 {textByLang(lang, 'Ops Center', 'Ops 센터')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ToggleButtonGroup
                        value={myTasksOnly ? 'mine' : 'all'}
                        exclusive
                        onChange={(_, v) => v && setMyTasksOnly(v === 'mine')}
                        size="small"
                        sx={{ height: 32, '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', px: 1.5 } }}
                    >
                        <ToggleButton value="all">🔘 {textByLang(lang, 'All Tasks', '전체 작업')}</ToggleButton>
                        <ToggleButton value="mine">👤 {textByLang(lang, 'My Tasks', '내 작업')}</ToggleButton>
                    </ToggleButtonGroup>
                    {sprints.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>{textByLang(lang, 'Sprint', '스프린트')}</InputLabel>
                            <Select value={sprintFilter} label={textByLang(lang, 'Sprint', '스프린트')} onChange={e => setSprintFilter(e.target.value)}>
                                <MenuItem value="all">{textByLang(lang, 'All Tasks', '전체 작업')}</MenuItem>
                                {sprints.map(s => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.status === 'active' ? '🟢 ' : ''}{s.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <Tooltip title={textByLang(lang, 'Refresh data', '데이터 새로고침')}>
                        <IconButton onClick={() => { reloadTasks(); loadOpsData(); }} size="small"><RefreshIcon /></IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)}
                sx={{
                    borderBottom: 1, borderColor: 'divider', minHeight: 40,
                    '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' },
                }}>
                <Tab label={`📊 ${textByLang(lang, 'Command Center', '상황판')}`} />
                <Tab label={`📋 ${textByLang(lang, 'Decisions', '의사결정')} (${decisions.length})`} />
                <Tab label={`🤝 ${textByLang(lang, 'Handoffs', '핸드오프')} (${handoffs.length})`} />
                <Tab label={`🔴 ${textByLang(lang, 'Issues', '이슈')} (${issues.length})`} />
            </Tabs>

            {/* ═══ TAB 0: COMMAND CENTER ═══ */}
            <TabPanel value={tab} index={0}>
                {/* Metric Cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
                    <MetricCard icon={<FlagIcon />} label={textByLang(lang, 'Open P0', '미해결 P0')} value={openP0.length}
                        color="#dc2626" bgColor="#fef2f2" detail={openP0.slice(0, 2).map(t => t.text).join(', ')} />
                    <MetricCard icon={<BlockIcon />} label={textByLang(lang, 'Blocked', '차단됨')} value={blockedItems.length}
                        color="#ea580c" bgColor="#fff7ed" detail={blockedItems.slice(0, 2).map(t => t.text).join(', ')} />
                    <MetricCard icon={<WarningAmberIcon />} label={textByLang(lang, 'Due in 48h', '48시간 내 마감')} value={dueIn48h.length}
                        color="#ca8a04" bgColor="#fefce8" detail={dueIn48h.slice(0, 2).map(t => `${t.text} (${t.dueDate})`).join(', ')} />
                    <MetricCard icon={<ScheduleIcon />} label={textByLang(lang, 'Overdue', '기한 초과')} value={overdueTasks.length}
                        color="#9333ea" bgColor="#faf5ff" detail={overdueTasks.slice(0, 2).map(t => t.text).join(', ')} />
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
                        </Paper>
                    )}
                </Box>

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
                                    <Paper key={tg.id} sx={{
                                        p: 2, borderRadius: 3, border: '2px solid', borderColor: tg.color + '30',
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

                                        {/* Progress bar */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <LinearProgress variant="determinate" value={tgPct}
                                                sx={{
                                                    flex: 1, height: 6, borderRadius: 3, bgcolor: alpha(tg.color, 0.12),
                                                    '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: tg.color }
                                                }} />
                                            <Typography variant="caption" fontWeight={700} color={tg.color}>{tgPct}%</Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                            📊 {tgDone}/{tgTotal} {textByLang(lang, 'tasks done', '작업 완료')}
                                        </Typography>

                                        {/* Quick stats */}
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

                    // Aggregate flows: { from→to: count }
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
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, bgcolor: 'grey.50', borderRadius: 2 }}>
                                            <Chip label={f.from} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: f.fromColor + '20', color: f.fromColor }} />
                                            <Typography variant="body2" fontWeight={700} sx={{ color: 'text.secondary' }}>→</Typography>
                                            <Chip label={f.to} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: f.toColor + '20', color: f.toColor }} />
                                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                                                {f.count} {f.pending > 0 ? `(${f.pending} ${textByLang(lang, 'pending', '대기')})` : ''}
                                            </Typography>
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
                        <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopyReport}
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
            </TabPanel>

            {/* ═══ TAB 1: DECISION LOG ═══ */}
            <TabPanel value={tab} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{textByLang(lang, 'Decision Log', '의사결정 로그')}</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDecisionOpen(true)}
                        size="small" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
                        {textByLang(lang, 'Log Decision', '의사결정 기록')}
                    </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                <TableCell sx={thSx}>ID</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Date', '일자')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Decision Summary', '결정 요약')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Context', '배경')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Decider', '결정자')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Affected IDs', '영향 작업 ID')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Follow-up', '후속 조치')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Link', '링크')}</TableCell>
                                <TableCell sx={thSx} align="center">⋮</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {decisions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                        {textByLang(lang, 'No decisions logged yet', '기록된 의사결정이 없습니다')}
                                    </TableCell>
                                </TableRow>
                            ) : decisions.map(d => (
                                <TableRow key={d.id} hover>
                                    <TableCell><Chip label={d.decisionCode} size="small" sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22 }} /></TableCell>
                                    <TableCell sx={tdSx}>{d.date}</TableCell>
                                    <TableCell sx={{ ...tdSx, fontWeight: 600, maxWidth: 200 }}>{d.summary}</TableCell>
                                    <TableCell sx={{ ...tdSx, maxWidth: 200, color: 'text.secondary' }}>{d.context}</TableCell>
                                    <TableCell sx={tdSx}>{d.deciderName}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                            {d.affectedTaskIds.map(tid => <Chip key={tid} label={tid} size="small" sx={{ height: 20, fontSize: '0.65rem', fontFamily: 'monospace' }} />)}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ ...tdSx, maxWidth: 200 }}>{d.followUpAction}</TableCell>
                                    <TableCell>
                                        {d.referenceLink && (
                                            <IconButton size="small" href={d.referenceLink} target="_blank" rel="noopener"><LinkIcon sx={{ fontSize: 16 }} /></IconButton>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => { deleteDecision(d.id); setDecisions(prev => prev.filter(x => x.id !== d.id)); }}>
                                            <DeleteIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </TabPanel>

            {/* ═══ TAB 2: HANDOFF TRACKER ═══ */}
            <TabPanel value={tab} index={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{textByLang(lang, 'Handoff Tracker', '핸드오프 트래커')}</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddHandoffOpen(true)}
                        size="small" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
                        {textByLang(lang, 'New Handoff', '핸드오프 생성')}
                    </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                <TableCell sx={thSx}>ID</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'From → To', '전달 방향')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Type', '유형')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Ready?', '준비 여부')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Sender', '전달자')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Receiver', '수신자')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Checklist', '체크리스트')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Blocking Q?', '차단 질문')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Next Action', '다음 액션')}</TableCell>
                                <TableCell sx={thSx} align="center">⋮</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {handoffs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                        {textByLang(lang, 'No handoffs yet', '생성된 핸드오프가 없습니다')}
                                    </TableCell>
                                </TableRow>
                            ) : handoffs.map(h => {
                                const cfg = HANDOFF_TYPE_CONFIG[h.type];
                                const checkEntries = Object.entries(h.checklist);
                                const doneCount = checkEntries.filter(([, v]) => v).length;
                                return (
                                    <TableRow key={h.id} hover sx={{ bgcolor: h.status === 'ready' ? alpha('#10b981', 0.05) : undefined }}>
                                        <TableCell><Chip label={h.handoffCode} size="small" sx={{ fontWeight: 700, fontFamily: 'monospace', height: 22 }} /></TableCell>
                                        <TableCell sx={{ ...tdSx, fontWeight: 600 }}>
                                            {getTeamLabel(h.fromTeam, lang)} → {getTeamLabel(h.toTeam, lang)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={`${cfg.icon} ${getHandoffTypeLabel(h.type, lang)}`} size="small"
                                                sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, bgcolor: cfg.color + '15', color: cfg.color }} />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={h.ready ? textByLang(lang, 'Yes', '예') : textByLang(lang, 'No', '아니오')} size="small"
                                                sx={{ height: 22, fontWeight: 700, bgcolor: h.ready ? '#dcfce7' : '#fef2f2', color: h.ready ? '#16a34a' : '#dc2626' }} />
                                        </TableCell>
                                        <TableCell sx={tdSx}>{h.senderName}</TableCell>
                                        <TableCell sx={tdSx}>{h.receiverName}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                                {checkEntries.map(([key, val]) => (
                                                    <FormControlLabel key={key} sx={{ mx: 0, '& .MuiFormControlLabel-label': { fontSize: '0.7rem' } }}
                                                        control={<Checkbox size="small" checked={val} onChange={(_, checked) => handleToggleChecklist(h.id, key, checked)}
                                                            sx={{ p: 0.3, '& .MuiSvgIcon-root': { fontSize: 14 } }} />}
                                                        label={getChecklistItemLabel(key, lang)} />
                                                ))}
                                                <Typography variant="caption" color="text.disabled">{doneCount}/{checkEntries.length}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ ...tdSx, color: h.blockingQuestion ? '#dc2626' : 'text.disabled', fontWeight: h.blockingQuestion ? 600 : 400 }}>
                                            {h.blockingQuestion || textByLang(lang, 'None', '없음')}
                                        </TableCell>
                                        <TableCell sx={tdSx}>{h.nextAction || '-'}</TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" onClick={() => { deleteHandoff(h.id); setHandoffs(prev => prev.filter(x => x.id !== h.id)); }}>
                                                <DeleteIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </TabPanel>

            {/* ═══ TAB 3: ISSUE LOG ═══ */}
            <TabPanel value={tab} index={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{textByLang(lang, 'Issue / Incident Log', '이슈 / 장애 로그')}</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddIssueOpen(true)}
                        size="small" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}>
                        {textByLang(lang, 'Log Issue', '이슈 기록')}
                    </Button>
                </Box>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                                <TableCell sx={thSx}>{textByLang(lang, 'Date', '일자')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Time', '시간')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Member', '담당자')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Category', '분류')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Description', '설명')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Scope', '영향 범위')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Time Lost', '손실 시간')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Workaround', '임시 조치')}</TableCell>
                                <TableCell sx={thSx}>{textByLang(lang, 'Status', '상태')}</TableCell>
                                <TableCell sx={thSx} align="center">⋮</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {issues.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                                        {textByLang(lang, 'No issues logged yet', '기록된 이슈가 없습니다')}
                                    </TableCell>
                                </TableRow>
                            ) : issues.map(iss => {
                                const cat = ISSUE_CATEGORY_CONFIG[iss.category];
                                return (
                                    <TableRow key={iss.id} hover>
                                        <TableCell sx={tdSx}>{iss.date}</TableCell>
                                        <TableCell sx={tdSx}>{iss.time}</TableCell>
                                        <TableCell sx={tdSx}>{iss.memberName}</TableCell>
                                        <TableCell>
                                            <Chip label={`${cat.icon} ${getIssueCategoryLabel(iss.category, lang)}`} size="small"
                                                sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, bgcolor: cat.color + '15', color: cat.color }} />
                                        </TableCell>
                                        <TableCell sx={{ ...tdSx, maxWidth: 250 }}>{iss.description}</TableCell>
                                        <TableCell>
                                            {(() => {
                                                const sc = ISSUE_SCOPE_CONFIG[iss.scope]; return sc ? (
                                                    <Chip label={`${sc.icon} ${getIssueScopeLabel(iss.scope, lang)}`} size="small"
                                                        sx={{ height: 22, fontSize: '0.6rem', fontWeight: 600, bgcolor: sc.color + '15', color: sc.color }} />
                                                ) : <Chip label={iss.scope} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />;
                                            })()}
                                        </TableCell>
                                        <TableCell sx={{ ...tdSx, color: '#dc2626', fontWeight: 600 }}>{iss.timeLost}</TableCell>
                                        <TableCell sx={{ ...tdSx, maxWidth: 200 }}>{iss.workaround || '-'}</TableCell>
                                        <TableCell>
                                            <Chip label={getIssueStatusLabel(iss.status, lang)} size="small"
                                                sx={{
                                                    height: 22, fontSize: '0.6rem', fontWeight: 700,
                                                    bgcolor: iss.status === 'resolved' ? '#dcfce7' : iss.status === 'escalated' ? '#fef2f2' : '#fefce8',
                                                    color: iss.status === 'resolved' ? '#16a34a' : iss.status === 'escalated' ? '#dc2626' : '#ca8a04',
                                                }} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" onClick={() => { deleteIssue(iss.id); setIssues(prev => prev.filter(x => x.id !== iss.id)); }}>
                                                <DeleteIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </TabPanel>

            {/* ═══ DIALOGS ══════════════════════════════════════ */}

            {/* Add Decision Dialog */}
            <AddDecisionDialog open={addDecisionOpen} onClose={() => setAddDecisionOpen(false)}
                onSubmit={handleAddDecision} members={currentMembers} tasks={tasks} />

            {/* Add Handoff Dialog */}
            <AddHandoffDialog open={addHandoffOpen} onClose={() => setAddHandoffOpen(false)}
                onSubmit={handleAddHandoff} members={currentMembers} tasks={tasks} />

            {/* Add Issue Dialog */}
            <AddIssueDialog open={addIssueOpen} onClose={() => setAddIssueOpen(false)}
                onSubmit={handleAddIssue} userName={user?.displayName || textByLang(lang, 'User', '사용자')}
                userUid={user?.uid || ''} members={currentMembers} />

            <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="success" variant="filled" sx={{ fontWeight: 600 }}>{snackMsg}</Alert>
            </Snackbar>
        </Box>
    );
};

// ─── Shared Styles ───────────────────────────────────────
const thSx = { fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.03em', color: 'text.secondary', py: 1.2 };
const tdSx = { fontSize: '0.8rem', py: 1 };


export default OpsCenter;
