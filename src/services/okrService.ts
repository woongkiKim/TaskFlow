// src/services/okrService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import { proxyIfMock } from './serviceProxy';
import type { Objective } from '../types';

const _fetchObjectives = async (workspaceId: string, period?: string): Promise<Objective[]> => {
    const params: Record<string, string> = { workspace_id: workspaceId };
    if (period) params.period = period;
    const res = await apiGet<PaginatedResponse<Objective>>('objectives/', params);
    return res.results;
};

const _createObjective = async (
    data: Omit<Objective, 'id' | 'createdAt'>
): Promise<Objective> => {
    return apiPost<Objective>('objectives/', {
        title: data.title,
        description: data.description || '',
        period: data.period,
        start_date: data.startDate,
        end_date: data.endDate,
        status: data.status,
        owner: data.ownerId,
        owner_name: data.ownerName,
        workspace: data.workspaceId,
    });
};

const _updateObjective = async (
    id: string,
    data: Partial<Omit<Objective, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>
): Promise<void> => {
    await apiPatch(`objectives/${id}/`, data);
};

const _deleteObjective = async (id: string): Promise<void> => {
    await apiDelete(`objectives/${id}/`);
};

export const fetchObjectives = proxyIfMock('fetchObjectives', _fetchObjectives);
export const createObjective = proxyIfMock('createObjective', _createObjective);
export const updateObjective = proxyIfMock('updateObjective', _updateObjective);
export const deleteObjective = proxyIfMock('deleteObjective', _deleteObjective);
