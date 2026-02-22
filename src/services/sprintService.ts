// src/services/sprintService.ts
// SprintService — now proxied through Django REST API

import api from './apiClient';
import type { Sprint } from '../types';

// ─── Response type ───────────────────────────────────────

interface ApiSprint {
  id: number;
  project: number;
  name: string;
  type: 'sprint' | 'milestone' | 'phase';
  status: 'planning' | 'active' | 'completed';
  startDate: string | null;
  endDate: string | null;
  order: number;
  parent: number | null;
  linkedSprints: number[];
  kanbanColumns: unknown[];
  scope: string | null;
  dependsOn: number[];
  createdAt: string;
}

// ─── Mapper ──────────────────────────────────────────────

function mapSprint(s: ApiSprint): Sprint {
  return {
    id: String(s.id),
    projectId: String(s.project),
    name: s.name,
    type: s.type,
    status: s.status,
    startDate: s.startDate || undefined,
    endDate: s.endDate || undefined,
    order: s.order,
    parentId: s.parent ? String(s.parent) : undefined,
    linkedSprintIds: (s.linkedSprints || []).map(String),
    kanbanColumns: s.kanbanColumns as Sprint['kanbanColumns'],
    scope: (s.scope as Sprint['scope']) || undefined,
    dependsOn: (s.dependsOn || []).map(String),
    createdAt: s.createdAt,
  };
}

// ─── API Functions ───────────────────────────────────────

// 1. 스프린트 생성
export const createSprint = async (
  projectId: string,
  name: string,
  type: Sprint['type'] = 'sprint',
  order: number = 0,
  startDate?: string,
  endDate?: string,
  parentId?: string,
  linkedSprintIds?: string[],
): Promise<Sprint> => {
  const body: Record<string, unknown> = {
    project: Number(projectId),
    name,
    type,
    status: 'planning',
    order,
  };
  if (startDate) body.startDate = startDate;
  if (endDate) body.endDate = endDate;
  if (parentId) body.parent = Number(parentId);
  if (linkedSprintIds?.length) body.linkedSprints = linkedSprintIds.map(Number);

  const data = await api.post<ApiSprint>('sprints/', body);
  return mapSprint(data);
};

// 2. 프로젝트의 스프린트 목록
export const fetchProjectSprints = async (projectId: string): Promise<Sprint[]> => {
  const data = await api.get<{ results: ApiSprint[] }>('sprints/', { project_id: projectId });
  return (data.results || []).map(mapSprint).sort((a, b) => a.order - b.order);
};

// 2.1 워크스페이스 전체 스프린트 목록
export const fetchWorkspaceSprints = async (projectIds: string[]): Promise<Sprint[]> => {
  if (projectIds.length === 0) return [];
  // Fetch sprints for each project and combine
  const all: Sprint[] = [];
  for (const pid of projectIds) {
    const data = await api.get<{ results: ApiSprint[] }>('sprints/', { project_id: pid });
    all.push(...(data.results || []).map(mapSprint));
  }
  return all.sort((a, b) => a.order - b.order);
};

// 3. 스프린트 업데이트
export const updateSprint = async (
  id: string,
  updates: Partial<Pick<Sprint, 'name' | 'status' | 'startDate' | 'endDate' | 'order' | 'type' | 'kanbanColumns' | 'parentId' | 'linkedSprintIds'>>
): Promise<void> => {
  await api.patch(`sprints/${id}/`, updates);
};

// 4. 스프린트 삭제
export const deleteSprint = async (id: string): Promise<void> => {
  await api.delete(`sprints/${id}/`);
};
