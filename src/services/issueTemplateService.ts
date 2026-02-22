// src/services/issueTemplateService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { IssueTemplate } from '../types';

export const fetchIssueTemplates = async (workspaceId: string, projectId?: string): Promise<IssueTemplate[]> => {
    const params: Record<string, string> = { workspace_id: workspaceId };
    if (projectId) params.project_id = projectId;
    const res = await apiGet<PaginatedResponse<IssueTemplate>>('issue-templates/', params);
    return res.results;
};

export const createIssueTemplate = async (data: Omit<IssueTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<IssueTemplate> => {
    return apiPost<IssueTemplate>('issue-templates/', {
        name: data.name,
        icon: data.icon,
        description: data.description || '',
        title_pattern: data.titlePattern || '',
        default_description: data.defaultDescription || '',
        default_type: data.defaultType || '',
        default_priority: data.defaultPriority || '',
        default_tags: data.defaultTags || [],
        default_category: data.defaultCategory || '',
        default_category_color: data.defaultCategoryColor || '',
        default_blocker_status: data.defaultBlockerStatus || 'none',
        project: data.projectId,
        workspace: data.workspaceId,
    });
};

export const updateIssueTemplate = async (id: string, data: Partial<IssueTemplate>): Promise<void> => {
    await apiPatch(`issue-templates/${id}/`, data);
};

export const deleteIssueTemplate = async (id: string): Promise<void> => {
    await apiDelete(`issue-templates/${id}/`);
};
