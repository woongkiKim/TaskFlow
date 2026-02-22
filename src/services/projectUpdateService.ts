// src/services/projectUpdateService.ts
// Django REST API version
import { apiGet, apiPost, apiDelete, type PaginatedResponse } from './apiClient';
import type { ProjectUpdate } from '../types';

export const fetchProjectUpdates = async (projectId: string): Promise<ProjectUpdate[]> => {
    const res = await apiGet<PaginatedResponse<ProjectUpdate>>('project-updates/', { project_id: projectId });
    return res.results;
};

export const createProjectUpdate = async (data: Omit<ProjectUpdate, 'id' | 'createdAt'>): Promise<ProjectUpdate> => {
    return apiPost<ProjectUpdate>('project-updates/', {
        project: data.projectId,
        workspace: data.workspaceId,
        health: data.health,
        content: data.content,
        created_by_name: data.createdByName || '',
        created_by_photo: data.createdByPhoto || '',
    });
};

export const deleteProjectUpdate = async (id: string): Promise<void> => {
    await apiDelete(`project-updates/${id}/`);
};
