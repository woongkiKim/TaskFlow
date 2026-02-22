// src/services/customViewService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { CustomView } from '../types';

/**
 * Fetch custom views. Can be called with:
 * - fetchCustomViews(projectId) — from useCustomViews hook
 * - fetchCustomViews(workspaceId, projectId) — original signature
 */
export const fetchCustomViews = async (workspaceOrProjectId: string, projectId?: string): Promise<CustomView[]> => {
    const params: Record<string, string> = {};
    if (projectId) {
        params.workspace_id = workspaceOrProjectId;
        params.project_id = projectId;
    } else {
        params.project_id = workspaceOrProjectId;
    }
    const res = await apiGet<PaginatedResponse<CustomView>>('custom-views/', params);
    return res.results;
};

export const createCustomView = async (data: Omit<CustomView, 'id' | 'createdAt'>): Promise<CustomView> => {
    return apiPost<CustomView>('custom-views/', {
        name: data.name,
        icon: data.icon,
        color: data.color,
        filters: data.filters,
        view_mode: data.viewMode,
        project: data.projectId,
        workspace: data.workspaceId,
    });
};

export const updateCustomView = async (viewId: string, updates: Partial<CustomView>): Promise<void> => {
    await apiPatch(`custom-views/${viewId}/`, updates);
};

export const deleteCustomView = async (viewId: string): Promise<void> => {
    await apiDelete(`custom-views/${viewId}/`);
};
