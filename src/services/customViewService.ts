// src/services/customViewService.ts
// CustomViewService — now proxied through Django REST API

import api from './apiClient';
import type { CustomView, ViewFilter } from '../types';

interface ApiCustomView {
  id: number;
  name: string;
  icon: string;
  color: string;
  viewMode: string;
  filters: ViewFilter;
  project: number;
  projectId: string;
  workspace: number;
  workspaceId: string;
  createdBy: number;
  createdAt: string;
}

function mapView(v: ApiCustomView): CustomView {
  return {
    id: String(v.id),
    name: v.name,
    icon: v.icon || '📋',
    color: v.color || '',
    viewMode: (v.viewMode || 'list') as CustomView['viewMode'],
    filters: v.filters || {},
    projectId: v.projectId || String(v.project),
    workspaceId: v.workspaceId || String(v.workspace),
    createdBy: String(v.createdBy),
    createdAt: v.createdAt,
  };
}

/** Fetch all custom views for a project */
export const fetchCustomViews = async (projectId: string): Promise<CustomView[]> => {
  const data = await api.get<{ results: ApiCustomView[] }>('custom-views/', { project_id: projectId });
  return (data.results || []).map(mapView);
};

/** Create a new custom view */
export const createCustomView = async (opts: {
  name: string;
  icon: string;
  color: string;
  filters: ViewFilter;
  viewMode?: string;
  projectId: string;
  workspaceId: string;
  createdBy: string;
}): Promise<CustomView> => {
  const body: Record<string, unknown> = {
    name: opts.name,
    icon: opts.icon,
    color: opts.color,
    filters: opts.filters,
    viewMode: opts.viewMode || 'list',
    project: Number(opts.projectId),
    workspace: Number(opts.workspaceId),
  };
  const result = await api.post<ApiCustomView>('custom-views/', body);
  return mapView(result);
};

/** Update an existing custom view */
export const updateCustomView = async (
  viewId: string,
  updates: Partial<Pick<CustomView, 'name' | 'icon' | 'color' | 'filters' | 'viewMode'>>,
): Promise<void> => {
  await api.patch(`custom-views/${viewId}/`, updates);
};

/** Delete a custom view */
export const deleteCustomView = async (viewId: string): Promise<void> => {
  await api.delete(`custom-views/${viewId}/`);
};
