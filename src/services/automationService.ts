// src/services/automationService.ts
// AutomationService — now proxied through Django REST API

import api from './apiClient';
import type { AutomationRule, AutomationAction } from '../types';

// ─── Response type ───────────────────────────────────────

interface ApiAutomationRule {
  id: number;
  name: string;
  workspace: number;
  trigger: {
    type: string;
    from?: string;
    to?: string;
  };
  actions: AutomationAction[];
  isEnabled: boolean;
  createdBy: number;
  createdAt: string;
}

// ─── Mapper ──────────────────────────────────────────────

function mapRule(r: ApiAutomationRule): AutomationRule {
  return {
    id: String(r.id),
    name: r.name,
    workspaceId: String(r.workspace),
    trigger: r.trigger as unknown as AutomationRule['trigger'],
    actions: r.actions || [],
    isEnabled: r.isEnabled,
    createdBy: String(r.createdBy),
    createdAt: r.createdAt,
  };
}

// ─── CRUD ────────────────────────────────────────────────

export const fetchAutomationRules = async (workspaceId: string): Promise<AutomationRule[]> => {
  try {
    const data = await api.get<{ results: ApiAutomationRule[] }>('automation-rules/', { workspace_id: workspaceId });
    return (data.results || []).map(mapRule);
  } catch (e) {
    console.error("Error fetching automation rules:", e);
    return [];
  }
};

export const createAutomationRule = async (
  rule: Omit<AutomationRule, 'id'>
): Promise<AutomationRule> => {
  const body: Record<string, unknown> = {
    name: rule.name,
    workspace: Number(rule.workspaceId),
    trigger: rule.trigger,
    actions: rule.actions,
    isEnabled: rule.isEnabled,
  };
  const data = await api.post<ApiAutomationRule>('automation-rules/', body);
  return mapRule(data);
};

export const deleteAutomationRule = async (ruleId: string): Promise<void> => {
  await api.delete(`automation-rules/${ruleId}/`);
};

export const toggleAutomationRule = async (ruleId: string, isEnabled: boolean): Promise<void> => {
  await api.patch(`automation-rules/${ruleId}/`, { isEnabled });
};

// ─── Trigger Engine ──────────────────────────────────────

/**
 * Evaluate automation rules against a task update and apply matching actions.
 * Now delegates to the backend where automations should ideally run.
 * For now, we still do client-side evaluation as a stopgap.
 */
export const triggerAutomations = async (
  workspaceId: string,
  taskId: string,
  newStatus: string,
  oldStatus?: string,
): Promise<void> => {
  try {
    const rules = await fetchAutomationRules(workspaceId);
    const enabledRules = rules.filter(r => r.isEnabled);

    for (const rule of enabledRules) {
      if (rule.trigger.type !== 'status_change') continue;
      if (rule.trigger.to !== newStatus) continue;
      if (rule.trigger.from && oldStatus && rule.trigger.from !== oldStatus) continue;

      // Rule matches — apply all actions
      await applyActions(taskId, rule.actions);
    }
  } catch (e) {
    console.error("Error triggering automations:", e);
    // Don't throw — automations are best-effort
  }
};

// ─── Action Executor ─────────────────────────────────────

const applyActions = async (taskId: string, actions: AutomationAction[]): Promise<void> => {
  const updates: Record<string, unknown> = {};

  for (const action of actions) {
    switch (action.type) {
      case 'assign_user':
        if (action.userId) updates.assignee = action.userId;
        if (action.userName) updates.assigneeName = action.userName;
        if (action.userPhoto) updates.assigneePhoto = action.userPhoto;
        break;
      case 'set_priority':
        updates.priority = action.priority;
        break;
      case 'add_label':
        // Labels need to be appended; for now we just set them
        // TODO: Backend should handle array append
        break;
    }
  }

  if (Object.keys(updates).length > 0) {
    await api.patch(`tasks/${taskId}/`, updates);
  }
};
