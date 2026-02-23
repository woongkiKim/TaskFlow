// src/services/okrService.ts
// OKR Service — now proxied through Django REST API

import api from './apiClient';
import type { Objective } from '../types';

// ─── Response types ──────────────────────────────────────

interface ApiKeyResult {
  id: number;
  objective: number;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  linkedTasks: number[];
}

interface ApiObjective {
  id: number;
  title: string;
  description: string;
  period: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  owner: number;
  ownerName: string;
  workspace: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  keyResults: ApiKeyResult[];
}

// ─── Mapper ──────────────────────────────────────────────

function mapObjective(o: ApiObjective): Objective {
  return {
    id: String(o.id),
    title: o.title,
    description: o.description || '',
    period: o.period,
    startDate: o.startDate || undefined,
    endDate: o.endDate || undefined,
    status: o.status as Objective['status'],
    ownerId: String(o.owner),
    ownerName: o.ownerName || '',
    workspaceId: String(o.workspace),
    createdBy: String(o.createdBy),
    createdAt: o.createdAt,
    keyResults: (o.keyResults || []).map(kr => ({
      id: String(kr.id),
      title: kr.title,
      targetValue: kr.targetValue,
      currentValue: kr.currentValue,
      unit: kr.unit,
      linkedTaskIds: (kr.linkedTasks || []).map(String),
    })),
  };
}

// ─── API Functions ───────────────────────────────────────

export const fetchObjectives = async (workspaceId: string, period?: string): Promise<Objective[]> => {
  const params: Record<string, string> = { workspace_id: workspaceId };
  if (period) params.period = period;
  const data = await api.get<{ results: ApiObjective[] }>('objectives/', params);
  return (data.results || []).map(mapObjective);
};

export const createObjective = async (
  data: Omit<Objective, 'id' | 'createdAt'>
): Promise<Objective> => {
  const body: Record<string, unknown> = {
    title: data.title,
    description: data.description || '',
    period: data.period,
    status: data.status || 'draft',
    ownerName: data.ownerName || '',
    workspace: Number(data.workspaceId),
  };
  if (data.startDate) body.startDate = data.startDate;
  if (data.endDate) body.endDate = data.endDate;

  const result = await api.post<ApiObjective>('objectives/', body);
  return mapObjective(result);
};

export const updateObjective = async (
  id: string,
  data: Partial<Omit<Objective, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>
): Promise<void> => {
  await api.patch(`objectives/${id}/`, data);
};

export const deleteObjective = async (id: string): Promise<void> => {
  await api.delete(`objectives/${id}/`);
};
