// src/services/backlogService.ts
// BacklogService — now proxied through Django REST API
// Settings remain in localStorage (client-side preferences).

import api from './apiClient';
import { fetchTasksAllPages } from './taskService';

export interface BacklogSettings {
  autoArchiveEnabled: boolean;
  archiveDaysThreshold: number;      // 기본 90일
  staleNotificationDays: number;     // 30/60/90
  sprintRolloverEnabled: boolean;
}

const DEFAULT_SETTINGS: BacklogSettings = {
  autoArchiveEnabled: false,
  archiveDaysThreshold: 90,
  staleNotificationDays: 60,
  sprintRolloverEnabled: true,
};

/** Load backlog settings from localStorage */
export const getBacklogSettings = (workspaceId: string): BacklogSettings => {
  try {
    const raw = localStorage.getItem(`backlog_settings_${workspaceId}`);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* fallback */ }
  return { ...DEFAULT_SETTINGS };
};

/** Save backlog settings to localStorage */
export const saveBacklogSettings = (workspaceId: string, settings: BacklogSettings): void => {
  localStorage.setItem(`backlog_settings_${workspaceId}`, JSON.stringify(settings));
};

/** Auto-archive stale todo tasks older than N days. Returns number of archived tasks. */
export const autoArchiveStaleBacklog = async (
  workspaceId: string,
  daysThreshold: number,
): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const staleTasks = await fetchTasksAllPages('tasks/', {
    workspace_id: workspaceId,
    status: 'todo',
    archived: 'false',
  });

  const tasksToArchive = staleTasks.filter(t => {
    const created = t.createdAt || '';
    return created && created < cutoffStr;
  });

  if (tasksToArchive.length === 0) return 0;

  // Archive each stale task
  for (const task of tasksToArchive) {
    await api.patch(`tasks/${task.id}/`, { archived: true });
  }
  return tasksToArchive.length;
};

/** Get backlog statistics */
export const getBacklogStats = async (workspaceId: string): Promise<{
  total: number;
  stale30: number;
  stale60: number;
  stale90: number;
}> => {
  const tasks = await fetchTasksAllPages('tasks/', {
    workspace_id: workspaceId,
    status: 'todo',
    archived: 'false',
  });
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

  let stale30 = 0, stale60 = 0, stale90 = 0;
  tasks.forEach(t => {
    const created = t.createdAt || '';
    if (created < d90.toISOString().split('T')[0]) stale90++;
    else if (created < d60.toISOString().split('T')[0]) stale60++;
    else if (created < d30.toISOString().split('T')[0]) stale30++;
  });

  return { total: tasks.length, stale30, stale60, stale90 };
};

/** Move incomplete tasks from one sprint to another */
export const autoRolloverSprintTasks = async (
  fromSprintId: string,
  toSprintId: string,
): Promise<number> => {
  const results = await fetchTasksAllPages('tasks/', {
    sprint_id: fromSprintId,
  });
  const incomplete = results.filter(t => !t.completed && t.status !== 'done');

  if (incomplete.length === 0) return 0;

  for (const task of incomplete) {
    await api.patch(`tasks/${task.id}/`, { sprint: Number(toSprintId) });
  }
  return incomplete.length;
};
