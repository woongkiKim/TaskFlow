// src/services/automationService.ts
import { toast } from 'sonner';
import { createNotification } from './notificationService';
import api from './apiClient';
import type { Task } from '../types';

export type AutomationTrigger = 'status_change' | 'task_created' | 'due_date' | 'tag_added';
export type AutomationAction = 'assign_user' | 'set_status' | 'add_comment' | 'send_notification';

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  triggerParams: Record<string, unknown>;
  action: AutomationAction;
  actionParams: Record<string, unknown>;
  active: boolean;
  projectId?: string;
  workspaceId: string;
}

// ─── localStorage-backed CRUD ───────────────────────────

const STORAGE_KEY = 'taskflow_automation_rules';

export const loadRules = (): AutomationRule[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveRules = (rules: AutomationRule[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
};

export const addRule = (rule: AutomationRule): void => {
  const rules = loadRules();
  rules.unshift(rule);
  saveRules(rules);
};

export const removeRule = (id: string): void => {
  const rules = loadRules().filter(r => r.id !== id);
  saveRules(rules);
};

export const toggleRuleActive = (id: string): void => {
  const rules = loadRules().map(r => r.id === id ? { ...r, active: !r.active } : r);
  saveRules(rules);
};

// ─── Execution Engine ───────────────────────────────────

/**
 * Check and execute automations for a task event
 */
export const checkAutomations = async (
  task: Task,
  eventType: AutomationTrigger,
  _context?: { prevTask?: Task; actor?: { uid: string; name: string } }
) => {
  const rules = loadRules().filter(r => r.active);
  if (rules.length === 0) return;

  console.log(`[Automation] Checking ${eventType} for task ${task.id} — ${rules.length} active rule(s)`);

  for (const rule of rules) {
    // Check trigger match
    let triggerMatch = false;

    if (rule.trigger === 'status_change' && eventType === 'status_change') {
      // triggerParams.status stores the status label from the UI (e.g. 'Done')
      // Normalize both to lowercase for comparison
      const target = String(rule.triggerParams.status || '').toLowerCase();
      const actual = (task.status || '').toLowerCase();
      if (target && actual === target) triggerMatch = true;
      // Also match common aliases
      if (target === 'done' && actual === 'done') triggerMatch = true;
    } else if (rule.trigger === 'task_created' && eventType === 'task_created') {
      triggerMatch = true;
    } else if (rule.trigger === 'tag_added' && eventType === 'tag_added') {
      const targetTag = String(rule.triggerParams.tag || '').toLowerCase();
      if (task.tags?.some(t => t.toLowerCase() === targetTag)) triggerMatch = true;
    }

    if (!triggerMatch) continue;

    console.log(`[Automation] ✅ Triggered rule: "${rule.name}"`);
    await executeAction(rule, task);
  }
};

const executeAction = async (rule: AutomationRule, task: Task) => {
  try {
    switch (rule.action) {
      case 'send_notification':
        if (task.assigneeId) {
          await createNotification({
            type: 'task_status_changed',
            title: `[Automation] ${rule.name}`,
            body: (rule.actionParams.message as string) || `Rule "${rule.name}" triggered for: ${task.text}`,
            actorUid: 'system',
            actorName: 'TaskFlow Automation',
            recipientUid: task.assigneeId,
            workspaceId: task.workspaceId || '',
            taskId: task.id,
            taskText: task.text,
          });
          toast.success(`⚡ [Automation] Notification sent`);
        }
        break;

      case 'set_status':
        if (rule.actionParams.status) {
          await api.patch(`tasks/${task.id}/`, { status: rule.actionParams.status });
          toast.success(`⚡ [Automation] Status → ${rule.actionParams.status}`);
        }
        break;

      case 'assign_user':
        if (rule.actionParams.userId) {
          await api.patch(`tasks/${task.id}/`, { assignee: rule.actionParams.userId });
          toast.success(`⚡ [Automation] Task auto-assigned`);
        }
        break;

      case 'add_comment':
        toast.info(`⚡ [Automation] Comment: "${rule.actionParams.comment || ''}"`);
        break;

      default:
        console.warn(`[Automation] Unknown action: ${rule.action}`);
    }
  } catch (err) {
    console.error(`[Automation] Action failed:`, err);
  }
};
