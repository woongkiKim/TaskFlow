// src/services/savedViewService.ts
// SavedViewService — now proxied through Django REST API

import api from './apiClient';
import type { CustomView } from '../types';

interface ApiCustomView {
  id: number;
  name: string;
  icon: string;
  workspace: number;
  project: number | null;
  viewType: string;
  filters: Record<string, unknown>;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

function mapView(v: ApiCustomView): CustomView {
  return {
    id: String(v.id),
    name: v.name,
    icon: v.icon || '📋',
    color: '#3b82f6',
    workspaceId: String(v.workspace),
    projectId: v.project ? String(v.project) : '',
    viewMode: v.viewType as CustomView['viewMode'],
    filters: v.filters || {},
    createdBy: String(v.createdBy),
    createdAt: v.createdAt,
  };
}

export const fetchCustomViews = async (workspaceId: string, projectId?: string): Promise<CustomView[]> => {
  const params: Record<string, string> = { workspace_id: workspaceId };
  if (projectId) params.project_id = projectId;
  const data = await api.get<{ results: ApiCustomView[] }>('custom-views/', params);
  return (data.results || []).map(mapView);
};

export const saveCustomView = async (data: Omit<CustomView, 'id' | 'createdAt'>): Promise<CustomView> => {
  const body: Record<string, unknown> = {
    name: data.name,
    icon: data.icon || '📋',
    workspace: Number(data.workspaceId),
    viewType: data.viewMode,
    filters: data.filters || {},
  };
  if (data.projectId) body.project = Number(data.projectId);

  const result = await api.post<ApiCustomView>('custom-views/', body);
  return mapView(result);
};

export const updateCustomView = async (id: string, updates: Partial<CustomView>): Promise<void> => {
  await api.patch(`custom-views/${id}/`, updates);
};

export const deleteCustomView = async (id: string): Promise<void> => {
  await api.delete(`custom-views/${id}/`);
};
