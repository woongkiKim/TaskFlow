// src/services/automationService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { AutomationRule } from '../types';

export const fetchAutomationRules = async (workspaceId: string): Promise<AutomationRule[]> => {
    const res = await apiGet<PaginatedResponse<AutomationRule>>('automation-rules/', { workspace_id: workspaceId });
    return res.results;
};

export const createAutomationRule = async (rule: Omit<AutomationRule, 'id' | 'createdAt'>): Promise<AutomationRule> => {
    return apiPost<AutomationRule>('automation-rules/', {
        workspace: rule.workspaceId,
        name: rule.name,
        trigger: rule.trigger,
        actions: rule.actions,
        is_enabled: rule.isEnabled,
    });
};

export const deleteAutomationRule = async (ruleId: string): Promise<void> => {
    await apiDelete(`automation-rules/${ruleId}/`);
};

export const toggleAutomationRule = async (ruleId: string, isEnabled: boolean): Promise<void> => {
    await apiPatch(`automation-rules/${ruleId}/`, { is_enabled: isEnabled });
};

/**
 * Trigger automations when a task's status changes.
 * The backend handles this logic; this is a lightweight client-side trigger.
 */
export const triggerAutomations = async (
    workspaceId: string,
    taskId: string,
    newStatus: string,
    _oldStatus?: string,
): Promise<void> => {
    // In the Django version, automations can be handled server-side
    // via signals or a dedicated endpoint. For now, we keep this as a no-op
    // placeholder since the backend ViewSet handles status updates atomically.
    console.debug(`[Automation] Status change: task=${taskId}, status=${newStatus}, workspace=${workspaceId}`);
};
