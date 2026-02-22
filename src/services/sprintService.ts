// src/services/sprintService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { Sprint } from '../types';

export const createSprint = async (
    projectId: string,
    name: string,
    type: Sprint['type'] = 'sprint',
    order: number = 0,
    startDate?: string,
    endDate?: string,
    parentId?: string,
    _linkedSprintIds?: string[],
): Promise<Sprint> => {
    return apiPost<Sprint>('sprints/', {
        project: projectId,
        name,
        type,
        status: 'planning',
        order,
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
        ...(parentId ? { parent: parentId } : {}),
    });
};

export const fetchProjectSprints = async (projectId: string): Promise<Sprint[]> => {
    const res = await apiGet<PaginatedResponse<Sprint>>('sprints/', { project_id: projectId });
    return res.results.sort((a, b) => a.order - b.order);
};

export const fetchWorkspaceSprints = async (projectIds: string[]): Promise<Sprint[]> => {
    if (projectIds.length === 0) return [];
    // Fetch sprints for each project and merge
    const results: Sprint[] = [];
    for (const pid of projectIds) {
        const res = await apiGet<PaginatedResponse<Sprint>>('sprints/', { project_id: pid });
        results.push(...res.results);
    }
    return results.sort((a, b) => a.order - b.order);
};

export const updateSprint = async (
    id: string,
    updates: Partial<Pick<Sprint, 'name' | 'status' | 'startDate' | 'endDate' | 'order' | 'type' | 'kanbanColumns' | 'parentId' | 'linkedSprintIds'>>
): Promise<void> => {
    await apiPatch(`sprints/${id}/`, updates);
};

export const deleteSprint = async (id: string): Promise<void> => {
    await apiDelete(`sprints/${id}/`);
};
