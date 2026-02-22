// src/services/initiativeService.ts
// InitiativeService — now proxied through Django REST API

import api from './apiClient';
import type { Initiative } from '../types';

// ─── Response type ───────────────────────────────────────

interface ApiInitiative {
  id: number;
  name: string;
  description: string;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  color: string;
  workspace: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Mapper ──────────────────────────────────────────────

function mapInitiative(i: ApiInitiative): Initiative {
  return {
    id: String(i.id),
    name: i.name,
    description: i.description || undefined,
    status: i.status as Initiative['status'],
    targetDate: i.targetDate || undefined,
    color: i.color,
    workspaceId: String(i.workspace),
    createdBy: String(i.createdBy),
    projectIds: [],  // resolved via backend relation
    createdAt: i.createdAt,
  };
}

// ─── API Functions ───────────────────────────────────────

export const fetchInitiatives = async (workspaceId: string): Promise<Initiative[]> => {
  const data = await api.get<{ results: ApiInitiative[] }>('initiatives/', { workspace_id: workspaceId });
  return (data.results || []).map(mapInitiative);
};

export const createInitiative = async (
  data: Omit<Initiative, 'id' | 'createdAt'>
): Promise<Initiative> => {
  const body: Record<string, unknown> = {
    name: data.name,
    description: data.description || '',
    status: data.status || 'planned',
    color: data.color || '#3b82f6',
    workspace: Number(data.workspaceId),
  };
  if (data.targetDate) body.targetDate = data.targetDate;

  const result = await api.post<ApiInitiative>('initiatives/', body);
  return mapInitiative(result);
};

export const updateInitiative = async (
  id: string,
  data: Partial<Omit<Initiative, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>
): Promise<void> => {
  await api.patch(`initiatives/${id}/`, data);
};

export const deleteInitiative = async (id: string): Promise<void> => {
  await api.delete(`initiatives/${id}/`);
};
