// src/services/opsService.ts
// OpsService — now proxied through Django REST API
// Note: generateDailyOpsReport is pure logic, no DB interaction needed

import api from './apiClient';
import { format } from 'date-fns';
import type { Decision, Handoff, Issue, Task } from '../types';
import { normalizePriority } from '../types';

// ─── Response types ──────────────────────────────────────

interface ApiDecision {
  id: number;
  workspace: number;
  decisionCode: string;
  summary: string;
  context: string;
  decidedBy: string;
  status: string;
  date: string;
  createdAt: string;
}

interface ApiHandoff {
  id: number;
  workspace: number;
  handoffCode: string;
  fromTeam: string;
  toTeam: string;
  description: string;
  status: string;
  ready: boolean;
  checklist: Record<string, boolean>;
  createdAt: string;
}

interface ApiIssue {
  id: number;
  workspace: number;
  memberName: string;
  category: string;
  description: string;
  status: string;
  reportedBy: string;
  timeLost: string;
  date: string;
  createdAt: string;
}

// ─── Mappers ─────────────────────────────────────────────

function mapDecision(d: ApiDecision): Decision {
  return { id: String(d.id), workspaceId: String(d.workspace), decisionCode: d.decisionCode, summary: d.summary, context: d.context, decider: d.decidedBy || '', deciderName: '', affectedTaskIds: [], followUpAction: '', date: d.date, createdAt: d.createdAt };
}

function mapHandoff(h: ApiHandoff): Handoff {
  return { id: String(h.id), workspaceId: String(h.workspace), handoffCode: h.handoffCode, fromTeam: h.fromTeam, toTeam: h.toTeam, notes: h.description, type: ((h as unknown) as Record<string, string>).type as Handoff['type'] || 'bug_fix', senderUid: '', senderName: '', receiverUid: '', receiverName: '', status: h.status as Handoff['status'], ready: h.ready, checklist: h.checklist || {}, createdAt: h.createdAt };
}

function mapIssue(i: ApiIssue): Issue {
  return { id: String(i.id), workspaceId: String(i.workspace), memberName: i.memberName, category: i.category as Issue['category'], scope: 'individual', description: i.description, status: i.status as Issue['status'], memberUid: i.reportedBy || '', timeLost: i.timeLost, workaround: '', date: i.date, time: '', createdAt: i.createdAt };
}

// ─── Decision Log ────────────────────────────────────────

export const fetchDecisions = async (workspaceId: string): Promise<Decision[]> => {
  const data = await api.get<{ results: ApiDecision[] }>('decisions/', { workspace_id: workspaceId });
  return (data.results || []).map(mapDecision);
};

export const addDecision = async (data: Omit<Decision, 'id' | 'createdAt'>): Promise<Decision> => {
  const result = await api.post<ApiDecision>('decisions/', { ...data, workspace: Number(data.workspaceId) });
  return mapDecision(result);
};

export const updateDecision = async (id: string, updates: Partial<Decision>): Promise<void> => {
  await api.patch(`decisions/${id}/`, updates);
};

export const deleteDecision = async (id: string): Promise<void> => {
  await api.delete(`decisions/${id}/`);
};

// ─── Handoff Tracker ─────────────────────────────────────

export const fetchHandoffs = async (workspaceId: string): Promise<Handoff[]> => {
  const data = await api.get<{ results: ApiHandoff[] }>('handoffs/', { workspace_id: workspaceId });
  return (data.results || []).map(mapHandoff);
};

export const addHandoff = async (data: Omit<Handoff, 'id' | 'createdAt'>): Promise<Handoff> => {
  const result = await api.post<ApiHandoff>('handoffs/', { ...data, workspace: Number(data.workspaceId) });
  return mapHandoff(result);
};

export const updateHandoff = async (id: string, updates: Partial<Handoff>): Promise<void> => {
  await api.patch(`handoffs/${id}/`, updates);
};

export const deleteHandoff = async (id: string): Promise<void> => {
  await api.delete(`handoffs/${id}/`);
};

// ─── Issue / Incident Log ────────────────────────────────

export const fetchIssues = async (workspaceId: string): Promise<Issue[]> => {
  const data = await api.get<{ results: ApiIssue[] }>('issues/', { workspace_id: workspaceId });
  return (data.results || []).map(mapIssue);
};

export const addIssue = async (data: Omit<Issue, 'id' | 'createdAt'>): Promise<Issue> => {
  const result = await api.post<ApiIssue>('issues/', { ...data, workspace: Number(data.workspaceId) });
  return mapIssue(result);
};

export const updateIssue = async (id: string, updates: Partial<Issue>): Promise<void> => {
  await api.patch(`issues/${id}/`, updates);
};

export const deleteIssue = async (id: string): Promise<void> => {
  await api.delete(`issues/${id}/`);
};

// ─── Daily Ops Report Generator (Pure Logic — No DB) ─────

const reportTextByLang = (lang: 'ko' | 'en', en: string, ko: string) => (lang === 'ko' ? ko : en);

const ISSUE_CATEGORY_REPORT_LABELS: Record<Issue['category'], { en: string; ko: string }> = {
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

const TASK_STATUS_REPORT_LABELS: Record<string, { en: string; ko: string }> = {
  todo: { en: 'To Do', ko: '할 일' },
  inprogress: { en: 'In Progress', ko: '진행 중' },
  'in-review': { en: 'In Review', ko: '리뷰 중' },
  done: { en: 'Done', ko: '완료' },
  completed: { en: 'Completed', ko: '완료' },
  blocked: { en: 'Blocked', ko: '차단됨' },
};

const getTaskStatusReportLabel = (status: string | undefined, lang: 'ko' | 'en') => {
  const key = status || 'todo';
  return TASK_STATUS_REPORT_LABELS[key]?.[lang] || key;
};

export const generateDailyOpsReport = (
  tasks: Task[], decisions: Decision[], handoffs: Handoff[], issues: Issue[],
  lang: 'ko' | 'en' = 'en',
): string => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'yyyy-MM-dd (EEE)');
  const tr = (en: string, ko: string) => reportTextByLang(lang, en, ko);

  const openP0 = tasks.filter(t => !t.completed && normalizePriority(t.priority) === 'P0');
  const blockedP0P1 = tasks.filter(t =>
    !t.completed && t.blockerStatus === 'blocked' &&
    ['P0', 'P1'].includes(normalizePriority(t.priority) || '')
  );
  const in48h = (() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const cutoffStr = format(cutoff, 'yyyy-MM-dd');
    return tasks.filter(t => !t.completed && t.dueDate && t.dueDate <= cutoffStr && t.dueDate >= today);
  })();
  const top3 = tasks
    .filter(t => !t.completed && ['P0', 'P1'].includes(normalizePriority(t.priority) || ''))
    .sort((a, b) => (normalizePriority(a.priority) || 'P3').localeCompare(normalizePriority(b.priority) || 'P3'))
    .slice(0, 3);
  const blocked = tasks.filter(t => !t.completed && t.blockerStatus === 'blocked');
  const pendingHandoffs = handoffs.filter(h => h.status === 'pending');
  const recentDecisions = decisions.filter(d => d.date === today);
  const activeIssues = issues.filter(i => i.status === 'monitoring');

  let report = `[${tr('DAILY OPS UPDATE', '일일 OPS 업데이트')} | ${todayDisplay}]\n`;
  report += `${tr('Tracker', '트래커')}: TaskFlow (SSOT)\n\n`;

  report += `1) ${tr("Today's Top 3", '오늘의 Top 3')}\n`;
  if (top3.length === 0) {
    report += `   (${tr('No P0/P1 items', 'P0/P1 항목 없음')})\n`;
  } else {
    top3.forEach(t => {
      const p = normalizePriority(t.priority) || '?';
      const owner = t.owners?.[0]?.name || t.assigneeName || reportTextByLang(lang, 'Unassigned', '미배정');
      const due = t.dueDate || reportTextByLang(lang, 'No due date', '마감일 없음');
      const status = getTaskStatusReportLabel(t.status, lang);
      report += `   - [${t.taskCode || t.id.slice(0, 6)}] (${p}) ${t.text} / ${tr('Owner', '담당')}: ${owner} / ${tr('Due', '마감')}: ${due} / ${tr('Status', '상태')}: ${status}\n`;
    });
  }

  report += `\n2) ${tr('Blocked', '차단됨')}\n`;
  if (blocked.length === 0) {
    report += `   ${tr('None', '없음')}\n`;
  } else {
    blocked.forEach(t => {
      const owner = t.owners?.[0]?.name || t.assigneeName || reportTextByLang(lang, 'Unassigned', '미배정');
      report += `   - [${t.taskCode || t.id.slice(0, 6)}] ${t.text} / ${tr('Owner', '담당')}: ${owner}\n`;
      if (t.blockerDetail) report += `     ${tr('Need', '필요 사항')}: ${t.blockerDetail}\n`;
      if (t.nextAction) report += `     ${tr('Next action', '다음 액션')}: ${t.nextAction}\n`;
    });
  }

  report += `\n3) ${tr('Due Soon (within 48h)', '마감 임박 (48시간 이내)')}\n`;
  if (in48h.length === 0) {
    report += `   ${tr('None', '없음')}\n`;
  } else {
    in48h.forEach(t => {
      const owner = t.owners?.[0]?.name || t.assigneeName || reportTextByLang(lang, 'Unassigned', '미배정');
      report += `   - [${t.taskCode || t.id.slice(0, 6)}] ${t.text} / ${tr('Owner', '담당')}: ${owner} / ${tr('Due', '마감')}: ${t.dueDate}\n`;
    });
  }

  report += `\n4) ${tr('Handoff Alerts', '핸드오프 알림')}\n`;
  if (pendingHandoffs.length === 0) {
    report += `   ${tr('None', '없음')}\n`;
  } else {
    pendingHandoffs.forEach(h => {
      const missing = Object.entries(h.checklist).filter(([, v]) => !v).map(([k]) => k);
      report += `   - [${h.handoffCode}] ${h.fromTeam} → ${h.toTeam} ${tr('Ready?', '준비?')} ${h.ready ? 'Y' : 'N'}`;
      if (missing.length > 0) report += ` / ${tr('Missing', '누락')}: ${missing.join(', ')}`;
      report += `\n`;
    });
  }

  if (activeIssues.length > 0) {
    report += `\n5) ${tr('Active Issues', '활성 이슈')}\n`;
    activeIssues.forEach(i => {
      const category = ISSUE_CATEGORY_REPORT_LABELS[i.category]?.[lang] || i.category;
      report += `   - ${i.memberName} (${category}): ${i.description} / ${tr('Time lost', '손실 시간')}: ${i.timeLost || '-'}\n`;
    });
  }

  report += `\n--- ${tr('Metrics', '지표')} ---\n`;
  report += `🚨 ${tr('Open P0', '미해결 P0')}: ${openP0.length}\n`;
  report += `🛑 ${tr('Blocked P0/P1', '차단된 P0/P1')}: ${blockedP0P1.length}\n`;
  report += `⚠️ ${tr('Due in 48h', '48시간 내 마감')}: ${in48h.length}\n`;
  if (activeIssues.length > 0) report += `🔴 ${tr('Active Issues', '활성 이슈')}: ${activeIssues.length}\n`;

  if (recentDecisions.length > 0) {
    report += `\n--- ${tr("Today's Decisions", '오늘의 의사결정')} ---\n`;
    recentDecisions.forEach(d => {
      report += `   ${d.decisionCode}: ${d.summary}\n`;
    });
  }

  report += `\n${tr('End.', '끝.')}`;
  return report;
};
