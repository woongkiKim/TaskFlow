// Extracted dialog components from OpsCenter.tsx
import { useState } from 'react';
import {
    Box, Typography, Paper, Button,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import MemberAutocomplete from '../components/MemberAutocomplete';
import TaskAutocomplete from '../components/TaskAutocomplete';
import type {
    Task, TeamMember,
    HandoffType, IssueCategory, IssueScope,
} from '../types';
import {
    HANDOFF_TYPE_CONFIG, HANDOFF_CHECKLISTS, HANDOFF_TYPES,
    ISSUE_CATEGORY_CONFIG, ISSUE_CATEGORIES,
    ISSUE_SCOPE_CONFIG, ISSUE_SCOPES,
} from '../types';

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
const getChecklistItemLabel = (item: string, lang: 'ko' | 'en') => HANDOFF_CHECKLIST_ITEM_LABELS[item]?.[lang] || item;

// ─── Metric Card Component ──────────────────────────────
export const MetricCard = ({ icon, label, value, color, bgColor, detail }: {
    icon: React.ReactNode; label: string; value: number;
    color: string; bgColor: string; detail?: string;
}) => (
    <Paper sx={{
        p: 2, borderRadius: 3, border: '1px solid', borderColor: color + '30',
        bgcolor: bgColor, display: 'flex', alignItems: 'center', gap: 1.5,
        transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' },
    }}>
        <Box sx={{ color, fontSize: 28, display: 'flex' }}>{icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={800} color={color}>{value}</Typography>
            <Typography variant="caption" fontWeight={600} color={color} sx={{ opacity: 0.8 }}>{label}</Typography>
            {detail && <Typography variant="caption" display="block" color="text.secondary" noWrap sx={{ mt: 0.3 }}>{detail}</Typography>}
        </Box>
    </Paper>
);

// ─── Add Decision Dialog ─────────────────────────────
export const AddDecisionDialog = ({ open, onClose, onSubmit, members, tasks: allTasks }: {
    open: boolean; onClose: () => void;
    members: TeamMember[]; tasks: Task[];
    onSubmit: (d: { summary: string; context: string; decider: string; affectedTaskIds: string; followUpAction: string; referenceLink: string; mentions?: { uid: string; name: string; photo?: string }[] }) => void;
}) => {
    const { lang } = useLanguage();
    const [summary, setSummary] = useState('');
    const [context, setContext] = useState('');
    const [deciderMember, setDeciderMember] = useState<TeamMember[]>([]);
    const [affectedTasks, setAffectedTasks] = useState<Task[]>([]);
    const [mentionedMembers, setMentionedMembers] = useState<TeamMember[]>([]);
    const [followUp, setFollowUp] = useState('');
    const [link, setLink] = useState('');

    const handleSubmit = () => {
        if (!summary.trim()) return;
        const deciderName = deciderMember[0]?.displayName || '';
        const taskIds = affectedTasks.map(t => t.taskCode || t.id).join(', ');
        const mentions = mentionedMembers.map(m => ({ uid: m.uid, name: m.displayName, photo: m.photoURL }));
        onSubmit({ summary, context, decider: deciderName, affectedTaskIds: taskIds, followUpAction: followUp, referenceLink: link, mentions });
        setSummary(''); setContext(''); setDeciderMember([]); setAffectedTasks([]); setMentionedMembers([]); setFollowUp(''); setLink('');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>📋 {textByLang(lang, 'Log Decision', '의사결정 기록')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                <TextField label={textByLang(lang, 'Decision Summary (The Verdict)', '결정 요약 (결론)')} value={summary}
                    onChange={e => setSummary(e.target.value)} fullWidth required
                    placeholder={textByLang(lang, 'e.g. "Remove phone verification from Sign-up"', '예: "회원가입에서 전화번호 인증 제거"')} />
                <TextField label={textByLang(lang, 'Context / Background', '배경 / 맥락')} value={context}
                    onChange={e => setContext(e.target.value)} fullWidth multiline rows={2}
                    placeholder={textByLang(lang, 'Why was this decided?', '왜 이런 결정을 했는지 입력하세요')} />
                <MemberAutocomplete members={members} selected={deciderMember} onChange={setDeciderMember}
                    label={textByLang(lang, 'Decider', '결정자')} placeholder={textByLang(lang, '@ to search decider...', '@ 입력으로 결정자 검색...')} />
                <TaskAutocomplete tasks={allTasks} selected={affectedTasks} onChange={setAffectedTasks}
                    multiple label={textByLang(lang, 'Affected Tasks', '영향 작업')} placeholder={textByLang(lang, 'Search tasks by ID or title...', 'ID 또는 제목으로 작업 검색...')} />
                <MemberAutocomplete members={members} selected={mentionedMembers} onChange={setMentionedMembers}
                    multiple label={textByLang(lang, 'Tag Members', '관련 멤버 태그')} placeholder={textByLang(lang, '@ to mention people...', '@ 입력으로 멤버 태그...')} />
                <TextField label={textByLang(lang, 'Follow-up Action (Who/What/When)', '후속 조치 (누가/무엇을/언제)')} value={followUp}
                    onChange={e => setFollowUp(e.target.value)} fullWidth
                    placeholder={textByLang(lang, 'e.g. "Derick to remove SMS logic by Friday"', '예: "금요일까지 SMS 로직 제거"')} />
                <TextField label={textByLang(lang, 'Reference Link', '참고 링크')} value={link}
                    onChange={e => setLink(e.target.value)} fullWidth
                    placeholder={textByLang(lang, 'Meeting note URL, Slack thread, etc.', '회의록 URL, 슬랙 스레드 등')} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{textByLang(lang, 'Cancel', '취소')}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!summary.trim()}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                    {textByLang(lang, 'Log Decision', '의사결정 기록')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Add Handoff Dialog ──────────────────────────────
export const AddHandoffDialog = ({ open, onClose, onSubmit, members, tasks: allTasks }: {
    open: boolean; onClose: () => void;
    members: TeamMember[]; tasks: Task[];
    onSubmit: (d: { fromTeam: string; toTeam: string; type: HandoffType; senderName: string; receiverName: string; blockingQuestion: string; nextAction: string; relatedTaskId: string; senderUid?: string; receiverUid?: string }) => void;
}) => {
    const { lang } = useLanguage();
    const [fromTeam, setFromTeam] = useState('');
    const [toTeam, setToTeam] = useState('');
    const [type, setType] = useState<HandoffType>('bug_fix');
    const [senderMember, setSenderMember] = useState<TeamMember[]>([]);
    const [receiverMember, setReceiverMember] = useState<TeamMember[]>([]);
    const [blockQ, setBlockQ] = useState('');
    const [nextA, setNextA] = useState('');
    const [relatedTask, setRelatedTask] = useState<Task[]>([]);

    const teams = ['Design', 'Dev', 'QA', 'Marketing', 'PM'];

    const handleSubmit = () => {
        if (!fromTeam || !toTeam) return;
        onSubmit({
            fromTeam, toTeam, type,
            senderName: senderMember[0]?.displayName || '',
            receiverName: receiverMember[0]?.displayName || '',
            senderUid: senderMember[0]?.uid,
            receiverUid: receiverMember[0]?.uid,
            blockingQuestion: blockQ, nextAction: nextA,
            relatedTaskId: relatedTask[0]?.taskCode || relatedTask[0]?.id || '',
        });
        setFromTeam(''); setToTeam(''); setSenderMember([]); setReceiverMember([]); setBlockQ(''); setNextA(''); setRelatedTask([]);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>🤝 {textByLang(lang, 'New Handoff', '핸드오프 생성')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>{textByLang(lang, 'From Team', '보내는 팀')}</InputLabel>
                        <Select value={fromTeam} label={textByLang(lang, 'From Team', '보내는 팀')} onChange={e => setFromTeam(e.target.value)}>
                            {teams.map(t => <MenuItem key={t} value={t}>{getTeamLabel(t, lang)}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                        <InputLabel>{textByLang(lang, 'To Team', '받는 팀')}</InputLabel>
                        <Select value={toTeam} label={textByLang(lang, 'To Team', '받는 팀')} onChange={e => setToTeam(e.target.value)}>
                            {teams.map(t => <MenuItem key={t} value={t}>{getTeamLabel(t, lang)}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <FormControl fullWidth size="small">
                    <InputLabel>{textByLang(lang, 'Handoff Type', '핸드오프 유형')}</InputLabel>
                    <Select value={type} label={textByLang(lang, 'Handoff Type', '핸드오프 유형')} onChange={e => setType(e.target.value as HandoffType)}>
                        {HANDOFF_TYPES.map(ht => (
                            <MenuItem key={ht} value={ht}>{HANDOFF_TYPE_CONFIG[ht].icon} {getHandoffTypeLabel(ht, lang)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <MemberAutocomplete members={members} selected={senderMember} onChange={setSenderMember}
                            label={textByLang(lang, 'Sender (Owner)', '전달자 (오너)')} placeholder={textByLang(lang, '@ to search...', '@ 입력으로 검색...')} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <MemberAutocomplete members={members} selected={receiverMember} onChange={setReceiverMember}
                            label={textByLang(lang, 'Receiver', '수신자')} placeholder={textByLang(lang, '@ to search...', '@ 입력으로 검색...')} />
                    </Box>
                </Box>
                <TextField label={textByLang(lang, 'Blocking Question?', '차단 질문')} value={blockQ}
                    onChange={e => setBlockQ(e.target.value)} fullWidth size="small"
                    placeholder={textByLang(lang, 'Leave blank if none', '없으면 비워두세요')} />
                <TextField label={textByLang(lang, 'Next Action', '다음 액션')} value={nextA}
                    onChange={e => setNextA(e.target.value)} fullWidth size="small"
                    placeholder={textByLang(lang, 'e.g. "Derick to fix deployment"', '예: "배포 이슈 수정 후 공유"')} />
                <TaskAutocomplete tasks={allTasks} selected={relatedTask} onChange={setRelatedTask}
                    label={textByLang(lang, 'Related Task', '연관 작업')} placeholder={textByLang(lang, 'Search task by ID or title...', 'ID 또는 제목으로 작업 검색...')} />
                {fromTeam && toTeam && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                            {textByLang(lang, 'Checklist for', '체크리스트')} {getTeamLabel(fromTeam, lang)} → {getTeamLabel(toTeam, lang)}:
                        </Typography>
                        {(HANDOFF_CHECKLISTS[`${fromTeam} → ${toTeam}`] || [textByLang(lang, 'No predefined checklist', '정의된 체크리스트 없음')]).map(item => (
                            <Typography key={item} variant="caption" display="block" sx={{ ml: 1 }}>☐ {getChecklistItemLabel(item, lang)}</Typography>
                        ))}
                    </Paper>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{textByLang(lang, 'Cancel', '취소')}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!fromTeam || !toTeam}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                    {textByLang(lang, 'Create Handoff', '핸드오프 생성')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ─── Add Issue Dialog ────────────────────────────────
export const AddIssueDialog = ({ open, onClose, onSubmit, userName, userUid, members }: {
    open: boolean; onClose: () => void; userName: string; userUid: string;
    members: TeamMember[];
    onSubmit: (d: { memberName: string; memberUid: string; category: IssueCategory; description: string; scope: IssueScope; timeLost: string; workaround: string; taggedMembers?: { uid: string; name: string; photo?: string }[] }) => void;
}) => {
    const { lang } = useLanguage();
    const [reporterMember, setReporterMember] = useState<TeamMember[]>(() => {
        const me = members.find(m => m.uid === userUid);
        return me ? [me] : [];
    });
    const [category, setCategory] = useState<IssueCategory>('internet');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState<IssueScope>('individual');
    const [timeLost, setTimeLost] = useState('');
    const [workaround, setWorkaround] = useState('');
    const [taggedPeople, setTaggedPeople] = useState<TeamMember[]>([]);

    const handleSubmit = () => {
        if (!description.trim()) return;
        const reporter = reporterMember[0];
        const tags = taggedPeople.map(m => ({ uid: m.uid, name: m.displayName, photo: m.photoURL }));
        onSubmit({
            memberName: reporter?.displayName || userName,
            memberUid: reporter?.uid || userUid,
            category, description, scope, timeLost, workaround,
            taggedMembers: tags.length > 0 ? tags : undefined,
        });
        setDescription(''); setTimeLost(''); setWorkaround(''); setTaggedPeople([]);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>🔴 {textByLang(lang, 'Log Issue / Incident', '이슈 / 장애 기록')}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
                <MemberAutocomplete members={members} selected={reporterMember} onChange={setReporterMember}
                    label={textByLang(lang, 'Reporter', '리포터')} placeholder={textByLang(lang, '@ to search member...', '@ 입력으로 멤버 검색...')} />
                <FormControl fullWidth size="small">
                    <InputLabel>{textByLang(lang, 'Category', '분류')}</InputLabel>
                    <Select value={category} label={textByLang(lang, 'Category', '분류')} onChange={e => setCategory(e.target.value as IssueCategory)}>
                        {ISSUE_CATEGORIES.map(c => (
                            <MenuItem key={c} value={c}>{ISSUE_CATEGORY_CONFIG[c].icon} {getIssueCategoryLabel(c, lang)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField label={textByLang(lang, 'Description', '설명')} value={description}
                    onChange={e => setDescription(e.target.value)} fullWidth multiline rows={2} required
                    placeholder={textByLang(lang, 'e.g. "Video generation failed due to internet instability"', '예: "인터넷 불안정으로 영상 생성 실패"')} />
                <FormControl fullWidth size="small">
                    <InputLabel>{textByLang(lang, 'Scope', '영향 범위')}</InputLabel>
                    <Select value={scope} label={textByLang(lang, 'Scope', '영향 범위')} onChange={e => setScope(e.target.value as IssueScope)}>
                        {ISSUE_SCOPES.map(s => (
                            <MenuItem key={s} value={s}>{ISSUE_SCOPE_CONFIG[s].icon} {getIssueScopeLabel(s, lang)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <MemberAutocomplete members={members} selected={taggedPeople} onChange={setTaggedPeople}
                    multiple label={textByLang(lang, 'Tag Affected Members', '영향 멤버 태그')} placeholder={textByLang(lang, '@ to mention affected people...', '@ 입력으로 영향 멤버 태그...')} />
                <TextField label={textByLang(lang, 'Time Lost', '손실 시간')} value={timeLost}
                    onChange={e => setTimeLost(e.target.value)} fullWidth size="small"
                    placeholder={textByLang(lang, 'e.g. "From 12PM", "2 hours"', '예: "12시부터", "2시간"')} />
                <TextField label={textByLang(lang, 'Workaround / Action Taken', '임시 조치 / 대응')} value={workaround}
                    onChange={e => setWorkaround(e.target.value)} fullWidth size="small"
                    placeholder={textByLang(lang, 'e.g. "Switched to mobile hotspot"', '예: "모바일 핫스팟으로 전환"')} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{textByLang(lang, 'Cancel', '취소')}</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!description.trim()}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                    {textByLang(lang, 'Log Issue', '이슈 기록')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

