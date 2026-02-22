// src/services/projectUpdateService.ts
// ProjectUpdateService — now proxied through Django REST API

import api from './apiClient';
import type { ProjectUpdate, ProjectHealth } from '../types';

interface ApiProjectUpdate {
  id: number;
  project: number;
  workspace: number;
  health: string;
  content: string;
  createdBy: number;
  createdByName: string;
  createdByPhoto: string;
  createdAt: string;
}

function mapUpdate(u: ApiProjectUpdate): ProjectUpdate {
  return {
    id: String(u.id),
    projectId: String(u.project),
    workspaceId: String(u.workspace),
    health: (u.health as ProjectHealth) || 'on_track',
    content: u.content || '',
    createdBy: String(u.createdBy),
    createdByName: u.createdByName || '',
    createdByPhoto: u.createdByPhoto || '',
    createdAt: u.createdAt,
  };
}

export const fetchProjectUpdates = async (projectId: string): Promise<ProjectUpdate[]> => {
  try {
    const data = await api.get<{ results: ApiProjectUpdate[] }>('project-updates/', { project_id: projectId });
    return (data.results || []).map(mapUpdate);
  } catch (e) {
    console.error("Error fetching project updates:", e);
    return [];
  }
};

export const createProjectUpdate = async (
  data: Omit<ProjectUpdate, 'id'>
): Promise<ProjectUpdate> => {
  const body: Record<string, unknown> = {
    project: Number(data.projectId),
    workspace: Number(data.workspaceId),
    health: data.health || 'on_track',
    content: data.content || '',
    createdByName: data.createdByName || '',
    createdByPhoto: data.createdByPhoto || '',
  };
  const result = await api.post<ApiProjectUpdate>('project-updates/', body);
  return mapUpdate(result);
};

export const deleteProjectUpdate = async (id: string): Promise<void> => {
  await api.delete(`project-updates/${id}/`);
};
