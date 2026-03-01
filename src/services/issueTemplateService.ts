// src/services/issueTemplateService.ts
// IssueTemplateService — now proxied through Django REST API

import api from './apiClient';
import type { IssueTemplate } from '../types';

interface ApiIssueTemplate {
  id: number;
  name: string;
  icon: string;
  description: string;
  workspace: number;
  titlePattern: string;
  defaultDescription: string;
  defaultType: string;
  defaultPriority: string;
  defaultTags: string[];
  defaultCategory: string;
  defaultCategoryColor: string;
  defaultBlockerStatus: string;
  defaultSubtasks: string[];
  createdBy: number;
  createdAt: string;
}

function mapTemplate(t: ApiIssueTemplate): IssueTemplate {
  return {
    id: String(t.id),
    name: t.name,
    icon: t.icon || '📋',
    description: t.description || '',
    workspaceId: String(t.workspace),
    titlePattern: t.titlePattern || '',
    defaultDescription: t.defaultDescription || '',
    defaultType: (t.defaultType || 'task') as IssueTemplate['defaultType'],
    defaultPriority: (t.defaultPriority || undefined) as IssueTemplate['defaultPriority'],
    defaultTags: t.defaultTags || [],
    defaultCategory: t.defaultCategory || '',
    defaultCategoryColor: t.defaultCategoryColor || '',
    defaultBlockerStatus: (t.defaultBlockerStatus || 'none') as IssueTemplate['defaultBlockerStatus'],
    defaultSubtasks: t.defaultSubtasks || [],
    createdBy: String(t.createdBy),
    createdAt: t.createdAt,
  };
}

/** Fetch all issue templates for a workspace */
export const fetchIssueTemplates = async (workspaceId: string): Promise<IssueTemplate[]> => {
  try {
    const data = await api.get<{ results: ApiIssueTemplate[] }>('issue-templates/', { workspace_id: workspaceId });
    const templates = (data.results || []).map(mapTemplate);
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error("Failed to fetch issue templates", e);
    return [];
  }
};

/** Create a new issue template */
export const createIssueTemplate = async (
  data: Omit<IssueTemplate, 'id' | 'createdAt'>
): Promise<IssueTemplate> => {
  const body: Record<string, unknown> = {
    name: data.name,
    icon: data.icon || '📋',
    description: data.description || '',
    workspace: Number(data.workspaceId),
    titlePattern: data.titlePattern || '',
    defaultDescription: data.defaultDescription || '',
    defaultType: data.defaultType || 'task',
    defaultPriority: data.defaultPriority || '',
    defaultTags: data.defaultTags || [],
    defaultCategory: data.defaultCategory || '',
    defaultCategoryColor: data.defaultCategoryColor || '',
    defaultBlockerStatus: data.defaultBlockerStatus || 'none',
    defaultSubtasks: data.defaultSubtasks || [],
  };
  const result = await api.post<ApiIssueTemplate>('issue-templates/', body);
  return mapTemplate(result);
};

/** Update an existing issue template */
export const updateIssueTemplate = async (
  id: string,
  data: Partial<Pick<IssueTemplate, 'name' | 'icon' | 'description' | 'titlePattern' | 'defaultDescription' | 'defaultType' | 'defaultPriority' | 'defaultTags' | 'defaultCategory' | 'defaultCategoryColor' | 'defaultBlockerStatus' | 'defaultSubtasks'>>
): Promise<void> => {
  await api.patch(`issue-templates/${id}/`, data);
};

/** Delete an issue template */
export const deleteIssueTemplate = async (id: string): Promise<void> => {
  await api.delete(`issue-templates/${id}/`);
};
