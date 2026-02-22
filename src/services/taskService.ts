// src/services/taskService.ts
// Django REST API version — replaces Firestore SDK calls
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { Task, Subtask, TaskOwner, TaskType, RelationType } from '../types';
import { RELATION_TYPE_CONFIG } from '../types';
import { triggerAutomations } from './automationService';

// --- Helpers ---
const setIfDefined = (obj: Record<string, unknown>, key: string, value: unknown) => {
  if (value !== undefined && value !== null) obj[key] = value;
};

// 1. 개인 tasks 조회
export const fetchTasks = async (_userId: string): Promise<Task[]> => {
  const res = await apiGet<PaginatedResponse<Task>>('tasks/');
  return res.results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// 2. 프로젝트별 tasks 조회
export const fetchProjectTasks = async (projectId: string): Promise<Task[]> => {
  const res = await apiGet<PaginatedResponse<Task>>('tasks/', { project_id: projectId });
  return res.results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// 2a. 개인 tasks 조회
export const fetchPersonalTasks = async (_userId: string): Promise<Task[]> => {
  const res = await apiGet<PaginatedResponse<Task>>('tasks/', { scope: 'personal' });
  return res.results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// 2b. 회사 tasks 조회
export const fetchMyWorkTasks = async (_userId: string, workspaceId: string): Promise<Task[]> => {
  const res = await apiGet<PaginatedResponse<Task>>('tasks/', { workspace_id: workspaceId });
  return res.results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

// 3. Task 생성
export interface AddTaskOptions {
  priority?: string;
  description?: string;
  dueDate?: string;
  category?: string;
  categoryColor?: string;
  status?: string;
  type?: TaskType;
  projectId?: string;
  workspaceId?: string;
  teamGroupId?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhoto?: string;
  owners?: TaskOwner[];
  sprintId?: string;
  taskCode?: string;
  blockerStatus?: 'none' | 'blocked';
  blockerDetail?: string;
  nextAction?: string;
  links?: string[];
  aiUsage?: string;
  updatedBy?: string;
  updatedByName?: string;
  scope?: 'personal' | 'work';
  parentTaskId?: string;
  parentTaskText?: string;
  estimate?: number;
}

export const addTaskToDB = async (
  text: string, _userId: string, _date?: Date, tags?: string[],
  options?: AddTaskOptions
): Promise<Task> => {
  const body: Record<string, unknown> = { text, status: options?.status || 'todo' };

  if (tags && tags.length > 0) body.tags = tags;
  setIfDefined(body, 'priority', options?.priority);
  setIfDefined(body, 'description', options?.description);
  setIfDefined(body, 'due_date', options?.dueDate);
  setIfDefined(body, 'category', options?.category);
  setIfDefined(body, 'category_color', options?.categoryColor);
  setIfDefined(body, 'project', options?.projectId);
  setIfDefined(body, 'workspace', options?.workspaceId);
  setIfDefined(body, 'team_group', options?.teamGroupId);
  setIfDefined(body, 'sprint', options?.sprintId);
  setIfDefined(body, 'type', options?.type);
  setIfDefined(body, 'task_code', options?.taskCode);
  setIfDefined(body, 'scope', options?.scope);
  setIfDefined(body, 'assignee', options?.assigneeId);
  setIfDefined(body, 'assignee_name', options?.assigneeName);
  setIfDefined(body, 'assignee_photo', options?.assigneePhoto);
  setIfDefined(body, 'blocker_status', options?.blockerStatus);
  setIfDefined(body, 'blocker_detail', options?.blockerDetail);
  setIfDefined(body, 'next_action', options?.nextAction);
  setIfDefined(body, 'ai_usage', options?.aiUsage);
  setIfDefined(body, 'parent_task', options?.parentTaskId);
  setIfDefined(body, 'parent_task_text', options?.parentTaskText);
  setIfDefined(body, 'estimate', options?.estimate);
  if (options?.links && options.links.length > 0) body.links = options.links;

  return apiPost<Task>('tasks/', body);
};

// 4. Toggle
export const toggleTaskStatusInDB = async (id: string, currentStatus: boolean): Promise<void> => {
  const newCompleted = !currentStatus;
  const status = newCompleted ? 'done' : 'todo';
  await apiPatch(`tasks/${id}/`, { completed: newCompleted, status });
};

// 5. Edit text
export const updateTaskTextInDB = async (id: string, newText: string): Promise<void> => {
  await apiPatch(`tasks/${id}/`, { text: newText });
};

// 6. Delete
export const deleteTaskFromDB = async (id: string): Promise<void> => {
  await apiDelete(`tasks/${id}/`);
};

// 7. Update date
export const updateTaskDateInDB = async (id: string, newDate: string): Promise<void> => {
  await apiPatch(`tasks/${id}/`, { start_date: newDate });
};

// 8. Update tags
export const updateTaskTagsInDB = async (id: string, tags: string[]): Promise<void> => {
  await apiPatch(`tasks/${id}/`, { tags });
};

// 9. Rollover
export const rolloverTasksToDate = async (taskIds: string[], _newDate: Date): Promise<void> => {
  for (const id of taskIds) {
    await apiPatch(`tasks/${id}/`, { start_date: _newDate.toISOString().split('T')[0] });
  }
};

// 10. Kanban status
export const updateTaskKanbanStatusInDB = async (
  id: string, status: string, workspaceId?: string, oldStatus?: string
): Promise<void> => {
  const isCompleted = status === 'done';
  await apiPatch(`tasks/${id}/`, { status, completed: isCompleted });

  if (workspaceId) {
    triggerAutomations(workspaceId, id, status, oldStatus).catch(() => { });
  }
};

// 11. Task detail update
export const updateTaskDetailInDB = async (
  id: string,
  updates: Partial<Pick<Task,
    'text' | 'description' | 'priority' | 'dueDate' | 'category' | 'categoryColor' |
    'tags' | 'status' | 'assigneeId' | 'assigneeName' | 'assigneePhoto' | 'sprintId' |
    'type' | 'taskCode' | 'owners' | 'blockerStatus' | 'blockerDetail' |
    'nextAction' | 'links' | 'delayPeriod' | 'delayReason' | 'aiUsage' |
    'updatedAt' | 'updatedBy' | 'updatedByName' | 'order' | 'relations' |
    'estimate' | 'parentTaskId' | 'parentTaskText'
  >>,
  workspaceId?: string,
  oldStatus?: string,
): Promise<void> => {
  await apiPatch(`tasks/${id}/`, updates);

  if (updates.status && workspaceId) {
    triggerAutomations(workspaceId, id, updates.status, oldStatus).catch(() => { });
  }
};

// 12. Subtasks update
export const updateSubtasksInDB = async (id: string, subtasks: Subtask[]): Promise<void> => {
  await apiPatch(`tasks/${id}/`, { subtasks });
};

// 12b. Archive/Unarchive
export const archiveTask = async (id: string): Promise<void> => {
  await apiPatch(`tasks/${id}/`, { archived: true });
};

export const unarchiveTask = async (id: string): Promise<void> => {
  await apiPatch(`tasks/${id}/`, { archived: false });
};

// 13. 카테고리 업데이트
export const updateTaskCategoryInDB = async (
  id: string, category: string | null, categoryColor: string | null
): Promise<void> => {
  await apiPatch(`tasks/${id}/`, {
    category: category || '',
    category_color: categoryColor || '',
  });
};

// 14. 순서 업데이트
export const updateTaskOrderInDB = async (id: string, order: number): Promise<void> => {
  await apiPatch(`tasks/${id}/`, { order });
};

// 15. 여러 작업 순서 일괄 업데이트
export const updateTaskOrdersInDB = async (updates: { id: string; order: number }[]): Promise<void> => {
  if (updates.length === 0) return;
  await Promise.all(updates.map(({ id, order }) => apiPatch(`tasks/${id}/`, { order })));
};

// 16. Project Stats
export const fetchProjectStats = async (projectId: string): Promise<{ total: number, completed: number }> => {
  try {
    const res = await apiGet<PaginatedResponse<Task>>('tasks/', { project_id: projectId });
    const total = res.count;
    const completed = res.results.filter(t => t.completed).length;
    return { total, completed };
  } catch {
    return { total: 0, completed: 0 };
  }
};

// 17. Triage Tasks
export const fetchTriageTasks = async (_userId: string): Promise<Task[]> => {
  const res = await apiGet<PaginatedResponse<Task>>('tasks/', { triage_status: 'pending' });
  return res.results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const updateTaskTriageStatus = async (taskId: string, status: 'pending' | 'accepted' | 'declined' | 'snoozed'): Promise<void> => {
  await apiPatch(`tasks/${taskId}/`, { triage_status: status });
};

export const unassignTask = async (taskId: string, _userId: string): Promise<void> => {
  await apiPatch(`tasks/${taskId}/`, {
    assignee: null,
    assignee_name: '',
    assignee_photo: '',
  });
};

// 18. Issue Relations Management
export const addTaskRelation = async (
  taskId: string,
  targetTask: Task,
  relationType: RelationType,
  _currentTaskCode?: string,
  _currentTaskText?: string
): Promise<void> => {
  await apiPost('task-relations/', {
    source_task: taskId,
    target_task: targetTask.id,
    type: relationType,
  });
  // Also create inverse relation
  const invType = RELATION_TYPE_CONFIG[relationType].inverse;
  await apiPost('task-relations/', {
    source_task: targetTask.id,
    target_task: taskId,
    type: invType,
  });
};

export const removeTaskRelation = async (
  taskId: string,
  targetTaskId: string,
  relationType: RelationType
): Promise<void> => {
  // Find and delete the relation and its inverse
  const res = await apiGet<PaginatedResponse<{ id: number; source_task: string; target_task: string; type: string }>>('task-relations/');
  const invType = RELATION_TYPE_CONFIG[relationType].inverse;

  for (const rel of res.results) {
    if (
      (String(rel.source_task) === taskId && String(rel.target_task) === targetTaskId && rel.type === relationType) ||
      (String(rel.source_task) === targetTaskId && String(rel.target_task) === taskId && rel.type === invType)
    ) {
      await apiDelete(`task-relations/${rel.id}/`);
    }
  }
};

// 20. Sprint Rollover
export const rolloverSprintTasks = async (
  fromSprintId: string,
  toSprintId: string,
  taskIds?: string[]
): Promise<number> => {
  if (taskIds && taskIds.length > 0) {
    await Promise.all(taskIds.map(id => apiPatch(`tasks/${id}/`, { sprint: toSprintId })));
    return taskIds.length;
  }

  const res = await apiGet<PaginatedResponse<Task>>('tasks/', {
    sprint_id: fromSprintId,
    completed: 'false' as unknown as boolean,
  });
  const incompleteTasks = res.results.filter(t => !t.completed);
  await Promise.all(incompleteTasks.map(t => apiPatch(`tasks/${t.id}/`, { sprint: toSprintId })));
  return incompleteTasks.length;
};
