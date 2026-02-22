// src/services/projectService.ts
// ProjectService — now proxied through Django REST API

import api from './apiClient';
import type { Project, KanbanColumn } from '../types';

// ─── Response types ──────────────────────────────────────

interface ApiProject {
  id: number;
  name: string;
  workspace: number;
  teamGroup: number | null;
  color: string;
  icon: string;
  description: string;
  createdBy: number;
  kanbanColumns: KanbanColumn[];
  taskCounter: number;
  initiative: number | null;
  startDate: string | null;
  targetDate: string | null;
  status: string;
  githubRepo: Record<string, unknown>;
  createdAt: string;
}

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: '#6366f1', order: 0 },
  { id: 'inprogress', title: 'In Progress', color: '#f59e0b', order: 1 },
  { id: 'done', title: 'Done', color: '#10b981', order: 2 },
];

// ─── Mapper ──────────────────────────────────────────────

function mapProject(p: ApiProject): Project {
  return {
    id: String(p.id),
    name: p.name,
    workspaceId: String(p.workspace),
    teamGroupId: p.teamGroup ? String(p.teamGroup) : undefined,
    color: p.color,
    icon: p.icon || undefined,
    createdBy: String(p.createdBy),
    createdAt: p.createdAt,
    kanbanColumns: p.kanbanColumns || DEFAULT_KANBAN_COLUMNS,
    taskCounter: p.taskCounter || 0,
    initiativeId: p.initiative ? String(p.initiative) : undefined,
    startDate: p.startDate || undefined,
    targetDate: p.targetDate || undefined,
    status: (p.status as Project['status']) || 'active',
    description: p.description || undefined,
  };
}

// ─── API Functions ───────────────────────────────────────

export const createProject = async (
  name: string, workspaceId: string, color: string, _createdBy: string,
  teamGroupId?: string, initiativeId?: string,
): Promise<Project> => {
  const body: Record<string, unknown> = {
    name,
    workspace: Number(workspaceId),
    color,
    kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  };
  if (teamGroupId) body.teamGroup = Number(teamGroupId);
  if (initiativeId) body.initiative = Number(initiativeId);

  const data = await api.post<ApiProject>('projects/', body);
  return mapProject(data);
};

export const fetchWorkspaceProjects = async (workspaceId: string): Promise<Project[]> => {
  const data = await api.get<{ results: ApiProject[] }>('projects/', { workspace_id: workspaceId });
  return (data.results || []).map(mapProject).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<void> => {
  await api.patch(`projects/${id}/`, updates);
};

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`projects/${id}/`);
};

export const updateProjectColumns = async (id: string, columns: KanbanColumn[]): Promise<void> => {
  await api.patch(`projects/${id}/`, { kanbanColumns: columns });
};
