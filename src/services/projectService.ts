// src/services/projectService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { Project, KanbanColumn } from '../types';

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: '#6366f1', order: 0 },
  { id: 'inprogress', title: 'In Progress', color: '#f59e0b', order: 1 },
  { id: 'done', title: 'Done', color: '#10b981', order: 2 },
];

export const createProject = async (
  name: string, workspaceId: string, color: string, _createdBy: string,
  teamGroupId?: string, initiativeId?: string
): Promise<Project> => {
  return apiPost<Project>('projects/', {
    name,
    workspace: workspaceId,
    color,
    kanban_columns: DEFAULT_KANBAN_COLUMNS,
    ...(teamGroupId ? { team_group: teamGroupId } : {}),
    ...(initiativeId ? { initiative: initiativeId } : {}),
  });
};

export const fetchWorkspaceProjects = async (workspaceId: string): Promise<Project[]> => {
  const res = await apiGet<PaginatedResponse<Project>>('projects/', { workspace_id: workspaceId });
  return res.results;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<void> => {
  await apiPatch(`projects/${id}/`, updates);
};

export const deleteProject = async (id: string): Promise<void> => {
  await apiDelete(`projects/${id}/`);
};

export const updateProjectColumns = async (id: string, columns: KanbanColumn[]): Promise<void> => {
  await apiPatch(`projects/${id}/`, { kanban_columns: columns });
};
