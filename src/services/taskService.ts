// src/services/taskService.ts
// TaskService — now proxied through Django REST API

import api from './apiClient';
import type { Task, Subtask, TaskOwner, TaskType, RelationType } from '../types';
import { RELATION_TYPE_CONFIG } from '../types';
import { checkAutomations } from './automationService';

// ─── Response type ───────────────────────────────────────

export interface ApiTask {
  id: number;
  taskCode: string;
  text: string;
  completed: boolean;
  status: string;
  priority: string;
  type: string;
  description: string;
  startDate: string | null;
  dueDate: string | null;
  subtasks: Subtask[];
  category: string;
  categoryColor: string;
  tags: string[];
  order: number;
  project: number | null;
  projectId: string | null;
  workspace: number | null;
  workspaceId: string | null;
  teamGroup: number | null;
  teamGroupId: string | null;
  sprint: number | null;
  sprintId: string | null;
  assignee: number | null;
  assigneeId: string | null;
  assigneeName: string;
  assigneePhoto: string;
  owners: number[];
  ownerUids: string[];
  scope: string;
  blockerStatus: string;
  blockerDetail: string;
  nextAction: string;
  links: string[];
  delayPeriod: string;
  delayReason: string;
  aiUsage: string;
  estimate: number | null;
  parentTask: number | null;
  parentTaskId: string | null;
  parentTaskText: string;
  triageStatus: string;
  archived: boolean;
  totalTimeSpent: number;
  recurringConfig?: Record<string, unknown>;
  reminders?: unknown[];
  attachments?: unknown[];
  createdAt: string;
  updatedAt: string;
  updatedBy: number | null;
  updatedByName: string;
  relationsFrom: Array<{ id: number; sourceTask: number; targetTask: number; type: string }>;
}

// ─── Mapper ──────────────────────────────────────────────

function mapTask(t: ApiTask): Task {
  return {
    id: String(t.id),
    taskCode: t.taskCode || undefined,
    text: t.text,
    completed: t.completed,
    status: t.status || 'todo',
    priority: t.priority || undefined,
    type: (t.type as TaskType) || undefined,
    description: t.description || undefined,
    startDate: t.startDate || undefined,
    dueDate: t.dueDate || undefined,
    subtasks: t.subtasks || [],
    category: t.category || undefined,
    categoryColor: t.categoryColor || undefined,
    tags: t.tags || [],
    order: t.order,
    projectId: t.projectId || undefined,
    workspaceId: t.workspaceId || undefined,
    teamGroupId: t.teamGroupId || undefined,
    sprintId: t.sprintId || undefined,
    assigneeId: t.assigneeId || undefined,
    assigneeName: t.assigneeName || undefined,
    assigneePhoto: t.assigneePhoto || undefined,
    ownerUids: t.ownerUids || [],
    scope: t.scope as Task['scope'] || undefined,
    blockerStatus: t.blockerStatus as Task['blockerStatus'] || undefined,
    blockerDetail: t.blockerDetail || undefined,
    nextAction: t.nextAction || undefined,
    links: t.links || [],
    delayPeriod: t.delayPeriod || undefined,
    delayReason: t.delayReason || undefined,
    aiUsage: t.aiUsage || undefined,
    estimate: t.estimate || undefined,
    parentTaskId: t.parentTaskId || undefined,
    parentTaskText: t.parentTaskText || undefined,
    triageStatus: t.triageStatus as Task['triageStatus'] || undefined,
    archived: t.archived,
    totalTimeSpent: t.totalTimeSpent,
    recurringConfig: t.recurringConfig as Task['recurringConfig'] || undefined,
    reminders: t.reminders || [],
    attachments: t.attachments || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    updatedBy: t.updatedBy ? String(t.updatedBy) : undefined,
    updatedByName: t.updatedByName || undefined,
    relations: (t.relationsFrom || []).map(r => ({
      type: r.type as RelationType,
      targetTaskId: String(r.targetTask),
    })),
  };
}

// ─── Helpers ─────────────────────────────────────────────

function buildTaskBody(fields: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      // Convert frontend ID fields to numeric FK for Django
      if (['projectId', 'workspaceId', 'teamGroupId', 'sprintId', 'parentTaskId'].includes(key)) {
        const fkKey = key.replace('Id', '').replace(/([A-Z])/g, '_$1').toLowerCase();
        // Map: projectId -> project, workspaceId -> workspace, etc.
        const djangoKey = key === 'projectId' ? 'project'
          : key === 'workspaceId' ? 'workspace'
          : key === 'teamGroupId' ? 'teamGroup'
          : key === 'sprintId' ? 'sprint'
          : key === 'parentTaskId' ? 'parentTask'
          : fkKey;
        body[djangoKey] = value ? Number(value) : null;
      } else {
        body[key] = value;
      }
    }
  }
  return body;
}

// ─── API: Fetch ──────────────────────────────────────────

// Helper to fetch all paginated tasks recursively
export const fetchTasksAllPages = async (
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<ApiTask[]> => {
  let allResults: ApiTask[] = [];
  let currentCursor: string | null = null;
  while (true) {
    const queryParams = { ...params };
    if (currentCursor) queryParams.cursor = currentCursor;
    const data = await api.get<{ next: string | null; results: ApiTask[] }>(path, queryParams);
    allResults = allResults.concat(data.results || []);
    if (data.next) {
      try {
        const urlObj = new URL(data.next);
        currentCursor = urlObj.searchParams.get('cursor');
      } catch {
        const match = data.next.match(/[?&]cursor=([^&]+)/);
        currentCursor = match ? match[1] : null;
      }
      if (!currentCursor) break;
    } else { break; }
  }
  return allResults;
};

// 1. 개인 tasks 조회 — server already sorts by -created_at
export const fetchTasks = async (userId: string): Promise<Task[]> => {
  try {
    const results = await fetchTasksAllPages('tasks/', {
      assignee_id: userId,
    });
    return results.map(mapTask);
  } catch (error) { console.error("Error fetching tasks:", error); throw error; }
};

// 1b. Cursor-based task fetch for infinite scroll
export interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export const fetchTasksCursor = async (
  userId: string,
  params?: Record<string, string | number | boolean | undefined>,
  cursor?: string,
): Promise<CursorPage<Task>> => {
  const queryParams: Record<string, string | number | boolean | undefined> = {
    assignee_id: userId,
    ...params,
  };
  if (cursor) queryParams.cursor = cursor;

  const data = await api.get<{ next: string | null; previous: string | null; results: ApiTask[] }>(
    'tasks/',
    queryParams,
  );
  return {
    next: data.next,
    previous: data.previous,
    results: (data.results || []).map(mapTask),
  };
};

// 2. 프로젝트별 tasks — server sorted, no client sort needed
export const fetchProjectTasks = async (projectId: string): Promise<Task[]> => {
  try {
    const results = await fetchTasksAllPages('tasks/', { project_id: projectId });
    return results.map(mapTask);
  } catch (error) { console.error("Error fetching project tasks:", error); throw error; }
};

// 2a. 개인 tasks — uses server-side scope filter (no client-side filtering)
export const fetchPersonalTasks = async (userId: string): Promise<Task[]> => {
  try {
    const results = await fetchTasksAllPages('tasks/', {
      assignee_id: userId,
      scope: 'personal',
    });
    return results.map(mapTask);
  } catch (error) { console.error("Error fetching personal tasks:", error); throw error; }
};

// 2b. 회사 tasks — server sorted
export const fetchMyWorkTasks = async (userId: string, workspaceId: string): Promise<Task[]> => {
  try {
    const results = await fetchTasksAllPages('tasks/', {
      workspace_id: workspaceId,
      assignee_id: userId,
    });
    return results.map(mapTask);
  } catch (error) { console.error("Error fetching work tasks:", error); throw error; }
};

// ─── API: Create ─────────────────────────────────────────

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
  recurringConfig?: Task['recurringConfig'];
}

export const addTaskToDB = async (
  text: string, _userId: string, _date?: Date, tags?: string[],
  options?: AddTaskOptions
): Promise<Task> => {
  try {
    const body: Record<string, unknown> = {
      text,
      status: options?.status || 'todo',
      tags: tags || [],
    };

    // Map all optional fields
    if (options?.priority) body.priority = options.priority;
    if (options?.description) body.description = options.description;
    if (options?.dueDate) body.dueDate = options.dueDate;
    if (options?.category) body.category = options.category;
    if (options?.categoryColor) body.categoryColor = options.categoryColor;
    if (options?.type) body.type = options.type;
    if (options?.scope) body.scope = options.scope;
    if (options?.blockerStatus) body.blockerStatus = options.blockerStatus;
    if (options?.blockerDetail) body.blockerDetail = options.blockerDetail;
    if (options?.nextAction) body.nextAction = options.nextAction;
    if (options?.aiUsage) body.aiUsage = options.aiUsage;
    if (options?.links?.length) body.links = options.links;
    if (options?.estimate) body.estimate = options.estimate;
    if (options?.assigneeName) body.assigneeName = options.assigneeName;
    if (options?.assigneePhoto) body.assigneePhoto = options.assigneePhoto;
    if (options?.parentTaskText) body.parentTaskText = options.parentTaskText;

    // FK references
    if (options?.projectId) body.project = Number(options.projectId);
    if (options?.workspaceId) body.workspace = Number(options.workspaceId);
    if (options?.teamGroupId) body.teamGroup = Number(options.teamGroupId);
    if (options?.sprintId) body.sprint = Number(options.sprintId);
    if (options?.taskCode) body.taskCode = options.taskCode;
    if (options?.parentTaskId) body.parentTask = Number(options.parentTaskId);
    if (options?.estimate !== undefined) body.estimate = options.estimate;
    if (options?.recurringConfig) body.recurringConfig = options.recurringConfig;
    if (options?.assigneeId) body.assignee = options.assigneeId;

    const data = await api.post<ApiTask>('tasks/', body);
    return mapTask(data);
  } catch (error) { console.error("Error adding task:", error); throw error; }
};

// ─── API: Update ─────────────────────────────────────────

// 4. Toggle
export const toggleTaskStatusInDB = async (id: string, currentStatus: boolean): Promise<void> => {
  const newCompleted = !currentStatus;
  const status = newCompleted ? 'done' : 'todo';
  const data = await api.patch<ApiTask>(`tasks/${id}/`, { completed: newCompleted, status });
  const updatedTask = mapTask(data);

  // If completing a recurring task, clone it for the next occurrence
  if (newCompleted && updatedTask.recurringConfig?.frequency) {
    try {
      const nextDate = new Date();
      if (updatedTask.dueDate) {
        nextDate.setTime(new Date(updatedTask.dueDate).getTime());
      }
      
      const freq = updatedTask.recurringConfig.frequency;
      const interval = updatedTask.recurringConfig.interval || 1;
      
      if (freq === 'daily') nextDate.setDate(nextDate.getDate() + interval);
      else if (freq === 'weekly') nextDate.setDate(nextDate.getDate() + 7 * interval);
      else if (freq === 'monthly') nextDate.setMonth(nextDate.getMonth() + interval);
      
      const newDueDate = nextDate.toISOString().split('T')[0];

      await addTaskToDB(
        updatedTask.text, 
        updatedTask.assigneeId || 'anonymous',
        new Date(), // Created at
        updatedTask.tags || [],
        {
          description: updatedTask.description,
          priority: updatedTask.priority,
          category: updatedTask.category,
          categoryColor: updatedTask.categoryColor,
          type: updatedTask.type,
          projectId: updatedTask.projectId,
          workspaceId: updatedTask.workspaceId,
          dueDate: newDueDate,
          scope: updatedTask.scope,
          recurringConfig: updatedTask.recurringConfig,
        }
      );
    } catch (e) {
      console.error('Failed to create next recurring task', e);
    }
  }
  
  // Trigger automation check
  checkAutomations(updatedTask, 'status_change');
};

// 5. Edit text
export const updateTaskTextInDB = async (id: string, newText: string): Promise<void> => {
  await api.patch(`tasks/${id}/`, { text: newText });
};

// 6. Delete
export const deleteTaskFromDB = async (id: string): Promise<void> => {
  await api.delete(`tasks/${id}/`);
};

// 7. Update date
export const updateTaskDateInDB = async (id: string, newDate: string): Promise<void> => {
  await api.patch(`tasks/${id}/`, { createdAt: newDate });
};

// 8. Update tags
export const updateTaskTagsInDB = async (id: string, tags: string[]): Promise<void> => {
  await api.patch(`tasks/${id}/`, { tags });
};

// 9. Rollover
export const rolloverTasksToDate = async (taskIds: string[], _newDate: Date): Promise<void> => {
  await Promise.all(taskIds.map(id => api.patch(`tasks/${id}/`, {})));
};

// 10. Kanban status
export const updateTaskKanbanStatusInDB = async (
  id: string, status: string, _workspaceId?: string, _oldStatus?: string
): Promise<void> => {
  const isCompleted = status === 'done';
  await api.patch(`tasks/${id}/`, { status, completed: isCompleted });
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
    'estimate' | 'parentTaskId' | 'parentTaskText' | 'recurringConfig'
  >>,
  _workspaceId?: string,
  _oldStatus?: string,
): Promise<void> => {
  const body = buildTaskBody(updates as Record<string, unknown>);
  await api.patch(`tasks/${id}/`, body);
};

// 12. Subtasks
export const updateSubtasksInDB = async (id: string, subtasks: Subtask[]): Promise<void> => {
  await api.patch(`tasks/${id}/`, { subtasks });
};

// 12b. Archive/Unarchive
export const archiveTask = async (id: string): Promise<void> => {
  await api.patch(`tasks/${id}/`, { archived: true });
};

export const unarchiveTask = async (id: string): Promise<void> => {
  await api.patch(`tasks/${id}/`, { archived: false });
};

// 13. 카테고리
export const updateTaskCategoryInDB = async (
  id: string, category: string | null, categoryColor: string | null
): Promise<void> => {
  await api.patch(`tasks/${id}/`, {
    category: category || '',
    categoryColor: categoryColor || '',
  });
};

// 14. 순서
export const updateTaskOrderInDB = async (id: string, order: number): Promise<void> => {
  await api.patch(`tasks/${id}/`, { order });
};

// 15. 일괄 순서 — parallel batch
export const updateTaskOrdersInDB = async (updates: { id: string; order: number }[]): Promise<void> => {
  await Promise.all(updates.map(({ id, order }) => api.patch(`tasks/${id}/`, { order })));
};

// 16. Project Stats
export const fetchProjectStats = async (projectId: string): Promise<{ total: number; completed: number }> => {
  try {
    const tasks = await fetchTasksAllPages('tasks/', { project_id: projectId });
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
    };
  } catch {
    return { total: 0, completed: 0 };
  }
};

// 17. Triage
export const fetchTriageTasks = async (userId: string): Promise<Task[]> => {
  try {
    const results = await fetchTasksAllPages('tasks/', {
      assignee_id: userId,
      triage_status: 'pending',
    });
    return results.map(mapTask).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) { console.error("Error fetching triage tasks:", e); throw e; }
};

export const updateTaskTriageStatus = async (
  taskId: string, status: 'pending' | 'accepted' | 'declined' | 'snoozed'
): Promise<void> => {
  await api.patch(`tasks/${taskId}/`, { triageStatus: status });
};

export const unassignTask = async (taskId: string, _userId: string): Promise<void> => {
  await api.patch(`tasks/${taskId}/`, {
    assignee: null,
    assigneeName: '',
    assigneePhoto: '',
  });
};

// 18. Issue Relations
export const addTaskRelation = async (
  taskId: string,
  targetTask: Task,
  relationType: RelationType,
  _currentTaskCode?: string,
  _currentTaskText?: string
): Promise<void> => {
  await api.post('task-relations/', {
    sourceTask: Number(taskId),
    targetTask: Number(targetTask.id),
    type: relationType,
  });
  // Also create inverse relation
  const invType = RELATION_TYPE_CONFIG[relationType].inverse;
  await api.post('task-relations/', {
    sourceTask: Number(targetTask.id),
    targetTask: Number(taskId),
    type: invType,
  });
};

export const removeTaskRelation = async (
  taskId: string,
  targetTaskId: string,
  relationType: RelationType
): Promise<void> => {
  // Fetch only relevant relations using query params (server-side filter)
  const data = await api.get<{ results: Array<{ id: number; sourceTask: number; targetTask: number; type: string }> }>(
    'task-relations/',
    { source_task: taskId, target_task: targetTaskId },
  );
  const relations = data.results || [];
  const invType = RELATION_TYPE_CONFIG[relationType].inverse;

  // Collect matching relation IDs and delete in parallel
  const toDelete = relations.filter(rel =>
    (rel.sourceTask === Number(taskId) && rel.targetTask === Number(targetTaskId) && rel.type === relationType) ||
    (rel.sourceTask === Number(targetTaskId) && rel.targetTask === Number(taskId) && rel.type === invType)
  );
  await Promise.all(toDelete.map(rel => api.delete(`task-relations/${rel.id}/`)));
};

// 20. Sprint Rollover — parallel batch
export const rolloverSprintTasks = async (
  fromSprintId: string,
  toSprintId: string,
  taskIds?: string[]
): Promise<number> => {
  if (taskIds?.length) {
    await Promise.all(taskIds.map(id => api.patch(`tasks/${id}/`, { sprint: Number(toSprintId) })));
    return taskIds.length;
  }
  // Move all incomplete tasks from old sprint
  const results = await fetchTasksAllPages('tasks/', { sprint_id: fromSprintId });
  const incomplete = results.filter(t => !t.completed);
  await Promise.all(incomplete.map(t => api.patch(`tasks/${t.id}/`, { sprint: Number(toSprintId) })));
  return incomplete.length;
};

// ─── 21. Task Watchers (Subscribe) ────────────────────────────

const WATCHERS_KEY = 'task_watchers';

interface TaskWatchers {
  [taskId: string]: string[]; // array of user UIDs
}

function loadWatchers(): TaskWatchers {
  try {
    return JSON.parse(localStorage.getItem(WATCHERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveWatchers(data: TaskWatchers) {
  localStorage.setItem(WATCHERS_KEY, JSON.stringify(data));
}

/** Subscribe to task changes (watch) */
export const watchTask = (taskId: string, userId: string): void => {
  const data = loadWatchers();
  if (!data[taskId]) data[taskId] = [];
  if (!data[taskId].includes(userId)) {
    data[taskId].push(userId);
    saveWatchers(data);
  }
};

/** Unsubscribe from task changes */
export const unwatchTask = (taskId: string, userId: string): void => {
  const data = loadWatchers();
  if (data[taskId]) {
    data[taskId] = data[taskId].filter(uid => uid !== userId);
    if (data[taskId].length === 0) delete data[taskId];
    saveWatchers(data);
  }
};

/** Check if user is watching a task */
export const isWatchingTask = (taskId: string, userId: string): boolean => {
  const data = loadWatchers();
  return (data[taskId] || []).includes(userId);
};

/** Get all watchers of a task */
export const getTaskWatchers = (taskId: string): string[] => {
  const data = loadWatchers();
  return data[taskId] || [];
};
