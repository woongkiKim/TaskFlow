// src/services/activityService.ts
// Django REST API version
import { apiGet, apiPost, type PaginatedResponse } from './apiClient';
import type { ActivityEntry } from '../types';

export const fetchActivities = async (
    workspaceId: string,
    options?: { entityType?: string; entityId?: string; limit?: number },
): Promise<ActivityEntry[]> => {
    const params: Record<string, string> = { workspace_id: workspaceId };
    if (options?.entityType) params.entity_type = options.entityType;
    if (options?.entityId) params.entity_id = options.entityId;
    if (options?.limit) params.page_size = String(options.limit);
    const res = await apiGet<PaginatedResponse<ActivityEntry>>('activities/', params);
    return res.results;
};

export const logActivity = async (
    data: Omit<ActivityEntry, 'id' | 'timestamp'>
): Promise<ActivityEntry> => {
    return apiPost<ActivityEntry>('activities/', {
        entity_type: data.entityType,
        entity_id: data.entityId,
        entity_title: data.entityTitle,
        action: data.action,
        workspace: data.workspaceId,
        user_name: data.userName,
        user_photo: data.userPhoto || '',
        changes: data.changes || [],
        description: data.description || '',
        metadata: data.metadata || {},
    });
};

/** Helper to build an activity entry object (for passing to logActivity) */
export const buildActivityEntry = (
    data: Omit<ActivityEntry, 'id' | 'timestamp'>
): Omit<ActivityEntry, 'id' | 'timestamp'> => data;
