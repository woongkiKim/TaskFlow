// src/pages/opsConstants.ts
import type { HandoffType, IssueCategory, IssueScope, Issue } from '../types';

export const textByLang = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

export const TEAM_LABELS: Record<string, { en: string; ko: string }> = {
    Design: { en: 'Design', ko: '디자인' },
    Dev: { en: 'Dev', ko: '개발' },
    QA: { en: 'QA', ko: 'QA' },
    Marketing: { en: 'Marketing', ko: '마케팅' },
    PM: { en: 'PM', ko: 'PM' },
};

export const HANDOFF_TYPE_LABELS: Record<HandoffType, { en: string; ko: string }> = {
    bug_fix: { en: 'Bug Fix', ko: '버그 수정' },
    feature: { en: 'Feature', ko: '기능 개발' },
    design_review: { en: 'Design Review', ko: '디자인 리뷰' },
    qa_review: { en: 'QA Review', ko: 'QA 리뷰' },
    deployment: { en: 'Deployment', ko: '배포' },
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, { en: string; ko: string }> = {
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

export const ISSUE_SCOPE_LABELS: Record<IssueScope, { en: string; ko: string }> = {
    individual: { en: 'Individual', ko: '개인' },
    team: { en: 'Team', ko: '팀' },
    project: { en: 'Project', ko: '프로젝트' },
    all: { en: 'All', ko: '전체' },
};

export const ISSUE_STATUS_LABELS: Record<Issue['status'], { en: string; ko: string }> = {
    monitoring: { en: 'Monitoring', ko: '모니터링' },
    resolved: { en: 'Resolved', ko: '해결됨' },
    escalated: { en: 'Escalated', ko: '에스컬레이션' },
};

export const HANDOFF_CHECKLIST_ITEM_LABELS: Record<string, { en: string; ko: string }> = {
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

export const getTeamLabel = (team: string, lang: 'ko' | 'en') => TEAM_LABELS[team]?.[lang] || team;
export const getHandoffTypeLabel = (type: HandoffType, lang: 'ko' | 'en') => HANDOFF_TYPE_LABELS[type][lang];
export const getIssueCategoryLabel = (category: IssueCategory, lang: 'ko' | 'en') => ISSUE_CATEGORY_LABELS[category][lang];
export const getIssueScopeLabel = (scope: IssueScope, lang: 'ko' | 'en') => ISSUE_SCOPE_LABELS[scope][lang];
export const getIssueStatusLabel = (status: Issue['status'], lang: 'ko' | 'en') => ISSUE_STATUS_LABELS[status][lang];
export const getChecklistItemLabel = (item: string, lang: 'ko' | 'en') => HANDOFF_CHECKLIST_ITEM_LABELS[item]?.[lang] || item;

// ─── Shared Table Styles ───────────────────────────────────────
export const thSx = { fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: '0.03em', color: 'text.secondary', py: 1.2 };
export const tdSx = { fontSize: '0.8rem', py: 1 };
