// src/services/backlogService.ts
// Django REST API version
import { apiGet, apiPatch, type PaginatedResponse } from './apiClient';
import type { Task } from '../types';

export interface BacklogSettings {
  autoArchiveEnabled: boolean;
  archiveDaysThreshold: number;
  staleNotificationDays: number;
  sprintRolloverEnabled: boolean;
}

const DEFAULT_SETTINGS: BacklogSettings = {
  autoArchiveEnabled: false,
  archiveDaysThreshold: 90,
  staleNotificationDays: 60,
  sprintRolloverEnabled: true,
};

export const getBacklogSettings = (workspaceId: string): BacklogSettings => {
  try {
    const raw = localStorage.getItem(`backlog_settings_${workspaceId}`);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* fallback */ }
  return { ...DEFAULT_SETTINGS };
};

export const saveBacklogSettings = (workspaceId: string, settings: BacklogSettings): void => {
  localStorage.setItem(`backlog_settings_${workspaceId}`, JSON.stringify(settings));
};

export const autoArchiveStaleBacklog = async (
  workspaceId: string,
  daysThreshold: number,
): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const res = await apiGet<PaginatedResponse<Task>>('tasks/', {
    workspace_id: workspaceId,
    status: 'todo',
    archived: 'false',
  });

  const staleTasks = res.results.filter(t => {
    const created = t.createdAt || '';
    return created && created < cutoffStr;
  });

  if (staleTasks.length === 0) return 0;

  await Promise.all(staleTasks.map(t => apiPatch(`tasks/${t.id}/`, { archived: true })));
  return staleTasks.length;
};

export const getBacklogStats = async (workspaceId: string): Promise<{
  total: number; stale30: number; stale60: number; stale90: number;
}> => {
  const res = await apiGet<PaginatedResponse<Task>>('tasks/', {
    workspace_id: workspaceId,
    status: 'todo',
    archived: 'false',
  });

  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
  const d90 = new Date(now); d90.setDate(d90.getDate() - 90);

  let stale30 = 0, stale60 = 0, stale90 = 0;
  res.results.forEach(t => {
    const created = t.createdAt || '';
    if (created < d90.toISOString().split('T')[0]) stale90++;
    else if (created < d60.toISOString().split('T')[0]) stale60++;
    else if (created < d30.toISOString().split('T')[0]) stale30++;
  });

  return { total: res.results.length, stale30, stale60, stale90 };
};

export const autoRolloverSprintTasks = async (
  fromSprintId: string,
  toSprintId: string,
): Promise<number> => {
  const res = await apiGet<PaginatedResponse<Task>>('tasks/', {
    sprint_id: fromSprintId,
  });
  const incomplete = res.results.filter(t => !t.completed && t.status !== 'done');

  if (incomplete.length === 0) return 0;

  await Promise.all(incomplete.map(t => apiPatch(`tasks/${t.id}/`, { sprint: toSprintId })));
  return incomplete.length;
};
