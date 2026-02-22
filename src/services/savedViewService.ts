// src/services/savedViewService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { CustomView } from '../types';

export const fetchSavedViews = async (workspaceId: string, projectId: string): Promise<CustomView[]> => {
    const res = await apiGet<PaginatedResponse<CustomView>>('saved-views/', {
        workspace_id: workspaceId,
        project_id: projectId,
    });
    return res.results;
};

export const createSavedView = async (data: Omit<CustomView, 'id' | 'createdAt'>): Promise<CustomView> => {
    return apiPost<CustomView>('saved-views/', {
        name: data.name,
        icon: data.icon,
        color: data.color,
        filters: data.filters,
        view_mode: data.viewMode,
        project: data.projectId,
        workspace: data.workspaceId,
    });
};

export const updateSavedView = async (id: string, updates: Partial<CustomView>): Promise<void> => {
    await apiPatch(`saved-views/${id}/`, updates);
};

export const deleteSavedView = async (id: string): Promise<void> => {
    await apiDelete(`saved-views/${id}/`);
};

// --- Legacy aliases used by TasksPage ---
export const fetchCustomViews = fetchSavedViews;
export const saveCustomView = createSavedView;
export const deleteCustomView = deleteSavedView;
