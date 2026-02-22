// src/services/initiativeService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { Initiative } from '../types';

export const fetchInitiatives = async (workspaceId: string): Promise<Initiative[]> => {
    const res = await apiGet<PaginatedResponse<Initiative>>('initiatives/', { workspace_id: workspaceId });
    return res.results;
};

export const createInitiative = async (data: Omit<Initiative, 'id' | 'createdAt' | 'updatedAt'>): Promise<Initiative> => {
    return apiPost<Initiative>('initiatives/', {
        name: data.name,
        description: data.description || '',
        status: data.status,
        start_date: data.startDate,
        target_date: data.targetDate,
        color: data.color,
        workspace: data.workspaceId,
    });
};

export const updateInitiative = async (id: string, data: Partial<Initiative>): Promise<void> => {
    await apiPatch(`initiatives/${id}/`, data);
};

export const deleteInitiative = async (id: string): Promise<void> => {
    await apiDelete(`initiatives/${id}/`);
};
