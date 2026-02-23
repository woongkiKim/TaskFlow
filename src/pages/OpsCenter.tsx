// src/pages/OpsCenter.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Chip, IconButton, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Select, MenuItem, FormControl, InputLabel, FormControlLabel,
    Tooltip, Checkbox, Snackbar, Alert,
    Skeleton, useTheme, alpha, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';

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
import { AddDecisionDialog, AddHandoffDialog, AddIssueDialog, SprintRolloverDialog } from './OpsCenterDialogs';
import TaskDetailDialog from '../components/TaskDetailDialog';
import { rolloverSprintTasks } from '../services/taskService';
import type { Task } from '../types';

import {
    textByLang,
    getTeamLabel, getHandoffTypeLabel, getIssueCategoryLabel, getIssueScopeLabel,
    getIssueStatusLabel, getChecklistItemLabel,
    thSx, tdSx,
} from './opsConstants';
import CommandCenterTab from '../components/ops/CommandCenterTab';

// ─── Main Component ──────────────────────────────────────
const OpsCenter = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const { lang } = useLanguage();
    const { currentWorkspace, currentMembers, sprints, currentSprint, teamGroups } = useWorkspace();
    const wsId = currentWorkspace?.id || '';

    const [tab, setTab] = useState(0);
    const [sprintFilter, setSprintFilter] = useState<string>('all');
    const [myTasksOnly, setMyTasksOnly] = useState(false);

    // Data
    const { tasks, loading: tasksLoading, reload: reloadTasks } = useTasks();
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [handoffs, setHandoffs] = useState<Handoff[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [opsDataReady, setOpsDataReady] = useState(false);

    // Dialogs
    const [addDecisionOpen, setAddDecisionOpen] = useState(false);
    const [addHandoffOpen, setAddHandoffOpen] = useState(false);
    const [addIssueOpen, setAddIssueOpen] = useState(false);
    const [snackMsg, setSnackMsg] = useState('');
    const [detailTask, setDetailTask] = useState<Task | null>(null);
    const [rolloverOpen, setRolloverOpen] = useState(false);

    const handleUpdateTask = useCallback(() => {
        setDetailTask(null);
        reloadTasks();
    }, [reloadTasks]);

    // Load ops-specific data
    const loadOpsData = useCallback(async () => {
        if (!wsId) return;
        try {
            const [d, h, i] = await Promise.all([
                fetchDecisions(wsId),
                fetchHandoffs(wsId),
                fetchIssues(wsId),
            ]);
            setDecisions(d); setHandoffs(h); setIssues(i);
        } catch (e) { console.error('OpsCenter load error:', e); }
        finally { setOpsDataReady(true); }
    }, [wsId]);

    useEffect(() => { loadOpsData(); }, [loadOpsData]);

    const isInitialLoading = !wsId || !opsDataReady || tasksLoading;

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
    const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
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

    // ═══ SPRINT ROLLOVER HANDLER ═══════════════════════════
    const handleSprintRollover = async (targetSprintId: string) => {
        if (!currentSprint) return;
        try {
            const count = await rolloverSprintTasks(currentSprint.id, targetSprintId);
            setSnackMsg(textByLang(lang,
                `Successfully rolled over ${count} tasks to the next sprint.`,
                `${count}개의 작업을 다음 스프린트로 이월했습니다.`
            ));
            reloadTasks();
            setRolloverOpen(false);
        } catch (error) {
            console.error('Error rolling over sprint tasks:', error);
            setSnackMsg(textByLang(lang, 'Failed to roll over sprint tasks.', '스프린트 작업 이월에 실패했습니다.'));
        }
    };

    // ═══ INITIAL LOADING ═══
    if (isInitialLoading) {
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
                <CommandCenterTab
                    lang={lang}
                    filteredTasks={filteredTasks}
                    openP0={openP0}
                    blockedItems={blockedItems}
                    dueIn48h={dueIn48h}
                    overdueTasks={overdueTasks}
                    inProgressCount={inProgressCount}
                    reviewNeeded={reviewNeeded}
                    handoffs={handoffs}
                    issues={issues}
                    teamGroups={teamGroups}
                    currentMembers={currentMembers}
                    sprintProgress={sprintProgress}
                    reportText={reportText}
                    today={today}
                    onCopyReport={handleCopyReport}
                    onTaskClick={setDetailTask}
                    onTabChange={setTab}
                    onRolloverOpen={() => setRolloverOpen(true)}
                />
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
            <AddDecisionDialog open={addDecisionOpen} onClose={() => setAddDecisionOpen(false)}
                onSubmit={handleAddDecision} members={currentMembers} tasks={tasks} />
            <AddHandoffDialog open={addHandoffOpen} onClose={() => setAddHandoffOpen(false)}
                onSubmit={handleAddHandoff} members={currentMembers} tasks={tasks} />
            <AddIssueDialog open={addIssueOpen} onClose={() => setAddIssueOpen(false)}
                onSubmit={handleAddIssue} userName={user?.displayName || textByLang(lang, 'User', '사용자')}
                userUid={user?.uid || ''} members={currentMembers} />
            {currentSprint && (
                <SprintRolloverDialog
                    open={rolloverOpen}
                    onClose={() => setRolloverOpen(false)}
                    onSubmit={handleSprintRollover}
                    currentSprint={currentSprint}
                    allSprints={sprints}
                />
            )}

            <Snackbar open={!!snackMsg} autoHideDuration={4000} onClose={() => setSnackMsg('')}>
                <Alert onClose={() => setSnackMsg('')} severity="success" sx={{ width: '100%', borderRadius: 3 }}>
                    {snackMsg}
                </Alert>
            </Snackbar>

            <TaskDetailDialog
                open={!!detailTask}
                task={detailTask}
                allTasks={tasks}
                onClose={() => setDetailTask(null)}
                onUpdate={handleUpdateTask}
            />
        </Box>
    );
};

export default OpsCenter;
