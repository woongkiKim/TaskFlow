// src/services/activityService.ts
// ActivityService — now proxied through Django REST API

import api from './apiClient';
import type { ActivityEntry, ActivityEntityType, ActivityAction, FieldChange } from '../types';

// ─── Response type ───────────────────────────────────────

interface ApiActivity {
  id: number;
  entityType: string;
  entityId: string;
  entityTitle: string;
  action: string;
  workspace: number;
  userId: string;
  userName: string;
  userPhoto: string;
  changes: FieldChange[];
  description: string;
  timestamp: string;
}

// ─── Mapper ──────────────────────────────────────────────

function mapActivity(a: ApiActivity): ActivityEntry {
  return {
    id: String(a.id),
    entityType: a.entityType as ActivityEntityType,
    entityId: a.entityId,
    entityTitle: a.entityTitle,
    action: a.action as ActivityAction,
    workspaceId: String(a.workspace),
    userId: a.userId,
    userName: a.userName,
    userPhoto: a.userPhoto || undefined,
    changes: a.changes || [],
    description: a.description || undefined,
    timestamp: a.timestamp,
  };
}

// ─── API Functions ───────────────────────────────────────

export const fetchActivities = async (
  workspaceId: string,
  opts?: {
    entityType?: ActivityEntityType;
    entityId?: string;
    limit?: number;
  },
): Promise<ActivityEntry[]> => {
  const params: Record<string, string | number> = { workspace_id: workspaceId };
  if (opts?.entityType) params.entity_type = opts.entityType;
  if (opts?.entityId) params.entity_id = opts.entityId;
  if (opts?.limit) params.page_size = opts.limit;

  const data = await api.get<{ results: ApiActivity[] }>('activities/', params);
  return (data.results || []).map(mapActivity);
};

export const logActivity = async (entry: Omit<ActivityEntry, 'id'>): Promise<string> => {
  const body: Record<string, unknown> = {
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityTitle: entry.entityTitle,
    action: entry.action,
    workspace: Number(entry.workspaceId),
    userId: entry.userId,
    userName: entry.userName,
    userPhoto: entry.userPhoto || '',
    changes: entry.changes || [],
    description: entry.description || '',
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  const data = await api.post<ApiActivity>('activities/', body);
  return String(data.id);
};

// ─── Helper: Auto-diff changes ───────────────────────────

export const diffChanges = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldLabels?: Record<string, string>,
): FieldChange[] => {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const skip = new Set(['id', 'workspaceId', 'createdAt', 'createdBy', 'createdByName']);

  for (const key of allKeys) {
    if (skip.has(key)) continue;
    const bVal = before[key];
    const aVal = after[key];

    if (JSON.stringify(bVal) === JSON.stringify(aVal)) continue;

    changes.push({
      field: key,
      displayField: fieldLabels?.[key] || key,
      from: bVal != null ? String(bVal) : undefined,
      to: aVal != null ? String(aVal) : undefined,
    });
  }
  return changes;
};

// ─── Helper: Build activity entry ────────────────────────

export const buildActivityEntry = (params: {
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  action: ActivityAction;
  workspaceId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  changes?: FieldChange[];
  description?: string;
}): Omit<ActivityEntry, 'id'> => ({
  ...params,
  timestamp: new Date().toISOString(),
});
