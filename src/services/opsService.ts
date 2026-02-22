// src/services/opsService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { Decision, Handoff, Issue } from '../types';

// --- Decisions ---
export const fetchDecisions = async (workspaceId: string): Promise<Decision[]> => {
    const res = await apiGet<PaginatedResponse<Decision>>('decisions/', { workspace_id: workspaceId });
    return res.results;
};

export const createDecision = async (data: Omit<Decision, 'id' | 'createdAt'>): Promise<Decision> => {
    return apiPost<Decision>('decisions/', {
        decision_code: data.decisionCode,
        date: data.date,
        summary: data.summary,
        context: data.context,
        decider_name: data.deciderName,
        affected_task_ids: data.affectedTaskIds,
        follow_up_action: data.followUpAction,
        reference_link: data.referenceLink || '',
        mentions: data.mentions || [],
        workspace: data.workspaceId,
        project: data.projectId,
        notes: data.notes || '',
    });
};

export const updateDecision = async (id: string, data: Partial<Decision>): Promise<void> => {
    await apiPatch(`decisions/${id}/`, data);
};

export const deleteDecision = async (id: string): Promise<void> => {
    await apiDelete(`decisions/${id}/`);
};

// --- Handoffs ---
export const fetchHandoffs = async (workspaceId: string): Promise<Handoff[]> => {
    const res = await apiGet<PaginatedResponse<Handoff>>('handoffs/', { workspace_id: workspaceId });
    return res.results;
};

export const createHandoff = async (data: Omit<Handoff, 'id' | 'createdAt'>): Promise<Handoff> => {
    return apiPost<Handoff>('handoffs/', {
        handoff_code: data.handoffCode,
        from_team: data.fromTeam,
        to_team: data.toTeam,
        type: data.type,
        ready: data.ready,
        sender: data.senderUid,
        sender_name: data.senderName,
        receiver: data.receiverUid,
        receiver_name: data.receiverName,
        checklist: data.checklist,
        blocking_question: data.blockingQuestion || '',
        next_action: data.nextAction || '',
        related_task: data.relatedTaskId,
        notes: data.notes || '',
        workspace: data.workspaceId,
        project: data.projectId,
        status: data.status,
    });
};

export const updateHandoff = async (id: string, data: Partial<Handoff>): Promise<void> => {
    await apiPatch(`handoffs/${id}/`, data);
};

export const deleteHandoff = async (id: string): Promise<void> => {
    await apiDelete(`handoffs/${id}/`);
};

// --- Issues ---
export const fetchIssues = async (workspaceId: string): Promise<Issue[]> => {
    const res = await apiGet<PaginatedResponse<Issue>>('issues/', { workspace_id: workspaceId });
    return res.results;
};

export const createIssue = async (data: Omit<Issue, 'id' | 'createdAt'>): Promise<Issue> => {
    return apiPost<Issue>('issues/', {
        date: data.date,
        time: data.time,
        member_name: data.memberName,
        category: data.category,
        description: data.description,
        scope: data.scope,
        time_lost: data.timeLost,
        workaround: data.workaround || '',
        status: data.status,
        tagged_members: data.taggedMembers || [],
        workspace: data.workspaceId,
    });
};

export const updateIssue = async (id: string, data: Partial<Issue>): Promise<void> => {
    await apiPatch(`issues/${id}/`, data);
};

export const deleteIssue = async (id: string): Promise<void> => {
    await apiDelete(`issues/${id}/`);
};

// --- Legacy aliases used by existing components ---
export const addDecision = createDecision;
export const addHandoff = createHandoff;
export const addIssue = createIssue;

/** Client-side daily ops report generator */
export const generateDailyOpsReport = (
    tasks: { text: string; status?: string; priority?: string; dueDate?: string; blockerStatus?: string; completed?: boolean }[],
    decisions: Decision[],
    handoffs: Handoff[],
    issues: Issue[],
    lang: 'ko' | 'en' = 'en',
): string => {
    const isKo = lang === 'ko';
    const today = new Date().toISOString().split('T')[0];
    const lines: string[] = [];

    lines.push(isKo ? `📋 일일 Ops 리포트 — ${today}` : `📋 Daily Ops Report — ${today}`);
    lines.push('');

    const open = tasks.filter(t => !t.completed);
    const p0 = open.filter(t => t.priority === 'P0' || t.priority === 'p0');
    const blocked = open.filter(t => t.blockerStatus === 'blocked');
    const overdue = open.filter(t => t.dueDate && t.dueDate < today);

    lines.push(isKo ? '📊 요약' : '📊 Summary');
    lines.push(`  ${isKo ? '전체 작업' : 'Total tasks'}: ${tasks.length}`);
    lines.push(`  ${isKo ? '미완료' : 'Open'}: ${open.length}  |  P0: ${p0.length}  |  ${isKo ? '차단' : 'Blocked'}: ${blocked.length}  |  ${isKo ? '지연' : 'Overdue'}: ${overdue.length}`);
    lines.push('');

    if (p0.length > 0) {
        lines.push(isKo ? '🔴 P0 작업' : '🔴 P0 Tasks');
        p0.forEach(t => lines.push(`  • ${t.text}`));
        lines.push('');
    }
    if (blocked.length > 0) {
        lines.push(isKo ? '🚫 차단된 작업' : '🚫 Blocked Tasks');
        blocked.forEach(t => lines.push(`  • ${t.text}`));
        lines.push('');
    }
    if (decisions.length > 0) {
        lines.push(isKo ? `📋 의사결정 (${decisions.length})` : `📋 Decisions (${decisions.length})`);
        decisions.slice(0, 5).forEach(d => lines.push(`  • [${d.decisionCode}] ${d.summary}`));
        lines.push('');
    }
    if (handoffs.filter(h => h.status === 'pending').length > 0) {
        const pending = handoffs.filter(h => h.status === 'pending');
        lines.push(isKo ? `🤝 대기 핸드오프 (${pending.length})` : `🤝 Pending Handoffs (${pending.length})`);
        pending.forEach(h => lines.push(`  • [${h.handoffCode}] ${h.fromTeam} → ${h.toTeam}`));
        lines.push('');
    }
    if (issues.filter(i => i.status === 'monitoring').length > 0) {
        const active = issues.filter(i => i.status === 'monitoring');
        lines.push(isKo ? `⚠️ 활성 이슈 (${active.length})` : `⚠️ Active Issues (${active.length})`);
        active.forEach(i => lines.push(`  • ${i.description} (${i.memberName})`));
        lines.push('');
    }

    return lines.join('\n');
};
