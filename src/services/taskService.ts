import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, orderBy, limit, startAfter, Timestamp,
  getCountFromServer, writeBatch, arrayRemove,
} from "firebase/firestore";
import type { Task, Subtask, TaskOwner, TaskType } from '../types';
import { db } from '../FBase';
import { format } from 'date-fns';
import { triggerAutomations } from './automationService';

const COLLECTION_NAME = "tasks";

// --- Helpers ---
const setIfDefined = (obj: Record<string, unknown>, key: string, value: unknown) => {
  if (value !== undefined && value !== null) obj[key] = value;
};

// 1. 개인 tasks 조회
export const fetchTasks = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
    const snap = await getDocs(q);
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) { console.error("Error fetching tasks:", error); throw error; }
};

// 2. 프로젝트별 tasks 조회
export const fetchProjectTasks = async (projectId: string): Promise<Task[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("projectId", "==", projectId));
    const snap = await getDocs(q);
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) { console.error("Error fetching project tasks:", error); throw error; }
};

// 2a. 개인 tasks 조회 (scope가 없거나 'personal'인 것 + projectId 없는 것)
export const fetchPersonalTasks = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("userId", "==", userId));
    const snap = await getDocs(q);
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
    // Filter: no projectId (legacy personal) or scope === 'personal'
    const personal = all.filter(t => !t.projectId || t.scope === 'personal');
    return personal.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) { console.error("Error fetching personal tasks:", error); throw error; }
};

// 2b. 회사 tasks 조회 (내가 태그된 모든 workspace tasks)
export const fetchMyWorkTasks = async (userId: string, workspaceId: string): Promise<Task[]> => {
  try {
    // Query 1: assigneeId == userId within workspace
    const q1 = query(collection(db, COLLECTION_NAME),
      where("workspaceId", "==", workspaceId),
      where("assigneeId", "==", userId));
    // Query 2: ownerUids array-contains userId within workspace
    const q2 = query(collection(db, COLLECTION_NAME),
      where("workspaceId", "==", workspaceId),
      where("ownerUids", "array-contains", userId));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    // Merge and deduplicate by id
    const taskMap = new Map<string, Task>();
    snap1.docs.forEach(d => taskMap.set(d.id, { id: d.id, ...d.data() } as Task));
    snap2.docs.forEach(d => taskMap.set(d.id, { id: d.id, ...d.data() } as Task));

    const tasks = Array.from(taskMap.values());
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) { console.error("Error fetching work tasks:", error); throw error; }
};

// 3. Task 생성 (enterprise fields 지원)
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
  text: string, userId: string, date?: Date, tags?: string[],
  options?: AddTaskOptions
): Promise<Task> => {
  try {
    const nowDate = date ?? new Date();
    const now = format(nowDate, 'yyyy-MM-dd HH:mm:ss');
    const status = options?.status || 'todo';
    const dueDate = options?.dueDate || (status === 'todo' ? format(nowDate, 'yyyy-MM-dd') : undefined);
    const newTask: Record<string, unknown> = {
      text, completed: false,
      status,
      createdAt: now,
      updatedAt: now,
      userId,
    };
    if (tags && tags.length > 0) newTask.tags = tags;

    // Standard fields
    setIfDefined(newTask, 'priority', options?.priority);
    setIfDefined(newTask, 'description', options?.description);
    setIfDefined(newTask, 'dueDate', dueDate);
    setIfDefined(newTask, 'category', options?.category);
    setIfDefined(newTask, 'categoryColor', options?.categoryColor);
    setIfDefined(newTask, 'projectId', options?.projectId);
    setIfDefined(newTask, 'workspaceId', options?.workspaceId);
    setIfDefined(newTask, 'teamGroupId', options?.teamGroupId);
    setIfDefined(newTask, 'sprintId', options?.sprintId);
    setIfDefined(newTask, 'type', options?.type);
    setIfDefined(newTask, 'taskCode', options?.taskCode);

    // Scope (personal vs work)
    setIfDefined(newTask, 'scope', options?.scope);

    // Multi-owner
    if (options?.owners && options.owners.length > 0) {
      newTask.owners = options.owners;
    }
    // Legacy single assignee
    if (options?.assigneeId) {
      newTask.assigneeId = options.assigneeId;
      newTask.assigneeName = options.assigneeName || '';
      newTask.assigneePhoto = options.assigneePhoto || '';
    }

    // Triage Logic: If assigned to someone else, set triageStatus to 'pending'
    if (options?.assigneeId && options.assigneeId !== userId) {
      newTask.triageStatus = 'pending';
    } else {
      newTask.triageStatus = 'accepted'; // Assigned to self or unassigned
    }

    // Auto-build ownerUids for Firestore array-contains queries
    const uidSet = new Set<string>();
    uidSet.add(userId); // creator is always included
    if (options?.assigneeId) uidSet.add(options.assigneeId);
    if (options?.owners) options.owners.forEach(o => uidSet.add(o.uid));
    newTask.ownerUids = Array.from(uidSet);

    // Enterprise fields
    setIfDefined(newTask, 'blockerStatus', options?.blockerStatus);
    setIfDefined(newTask, 'blockerDetail', options?.blockerDetail);
    setIfDefined(newTask, 'nextAction', options?.nextAction);
    setIfDefined(newTask, 'aiUsage', options?.aiUsage);
    setIfDefined(newTask, 'updatedBy', options?.updatedBy);
    setIfDefined(newTask, 'updatedByName', options?.updatedByName);
    if (options?.links && options.links.length > 0) newTask.links = options.links;

    // Sub-issue
    setIfDefined(newTask, 'parentTaskId', options?.parentTaskId);
    setIfDefined(newTask, 'parentTaskText', options?.parentTaskText);

    // Estimate
    setIfDefined(newTask, 'estimate', options?.estimate);

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newTask);

    return {
      id: docRef.id,
      text,
      completed: false,
      status: (newTask.status as string) || 'todo',
      createdAt: now,
      updatedAt: now,
      ...(tags && tags.length > 0 ? { tags } : {}),
      ...(options?.priority ? { priority: options.priority } : {}),
      ...(options?.description ? { description: options.description } : {}),
      ...(dueDate ? { dueDate } : {}),
      ...(options?.category ? { category: options.category } : {}),
      ...(options?.categoryColor ? { categoryColor: options.categoryColor } : {}),
      ...(options?.projectId ? { projectId: options.projectId } : {}),
      ...(options?.workspaceId ? { workspaceId: options.workspaceId } : {}),
      ...(options?.teamGroupId ? { teamGroupId: options.teamGroupId } : {}),
      ...(options?.sprintId ? { sprintId: options.sprintId } : {}),
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.taskCode ? { taskCode: options.taskCode } : {}),
      ...(options?.owners ? { owners: options.owners } : {}),
      ...(options?.assigneeId ? { assigneeId: options.assigneeId, assigneeName: options.assigneeName, assigneePhoto: options.assigneePhoto } : {}),
      ...(options?.blockerStatus ? { blockerStatus: options.blockerStatus } : {}),
      ...(options?.blockerDetail ? { blockerDetail: options.blockerDetail } : {}),
      ...(options?.nextAction ? { nextAction: options.nextAction } : {}),
      ...(options?.links && options.links.length > 0 ? { links: options.links } : {}),
      ...(options?.aiUsage ? { aiUsage: options.aiUsage } : {}),
      ...(options?.updatedBy ? { updatedBy: options.updatedBy } : {}),
      ...(options?.updatedByName ? { updatedByName: options.updatedByName } : {}),
      ...(options?.parentTaskId ? { parentTaskId: options.parentTaskId, parentTaskText: options.parentTaskText } : {}),
      ...(options?.estimate ? { estimate: options.estimate } : {}),
      // order not set here yet?
    };
  } catch (error) { console.error("Error adding task:", error); throw error; }
};

// 4. Toggle
export const toggleTaskStatusInDB = async (id: string, currentStatus: boolean): Promise<void> => {
  const taskRef = doc(db, COLLECTION_NAME, id);
  const newCompleted = !currentStatus;
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(taskRef, {
    completed: newCompleted,
    status: newCompleted ? 'done' : 'todo',
    updatedAt: now,
  });
};

// 5. Edit text
export const updateTaskTextInDB = async (id: string, newText: string): Promise<void> => {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(doc(db, COLLECTION_NAME, id), { text: newText, updatedAt: now });
};

// 6. Delete
export const deleteTaskFromDB = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

// 7. Update date
export const updateTaskDateInDB = async (id: string, newDate: string): Promise<void> => {
  await updateDoc(doc(db, COLLECTION_NAME, id), { createdAt: newDate });
};

// 8. Update tags
export const updateTaskTagsInDB = async (id: string, tags: string[]): Promise<void> => {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(doc(db, COLLECTION_NAME, id), { tags, updatedAt: now });
};

// 9. Rollover
export const rolloverTasksToDate = async (taskIds: string[], newDate: Date): Promise<void> => {
  const batch = writeBatch(db);
  const newDateStr = format(newDate, 'yyyy-MM-dd HH:mm:ss');
  taskIds.forEach(id => { batch.update(doc(db, COLLECTION_NAME, id), { createdAt: newDateStr }); });
  await batch.commit();
};

// 10. Kanban status
export const updateTaskKanbanStatusInDB = async (
  id: string, status: string, workspaceId?: string, oldStatus?: string
): Promise<void> => {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(doc(db, COLLECTION_NAME, id), { status, completed: status === 'done', updatedAt: now });

  // Fire automations in background (non-blocking)
  if (workspaceId) {
    triggerAutomations(workspaceId, id, status, oldStatus).catch(() => { });
  }
};

// 11. Task detail update (enterprise fields 포함)
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
  const clean: Record<string, unknown> = {};
  Object.entries(updates).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
  clean.updatedAt = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(doc(db, COLLECTION_NAME, id), clean);

  // Fire automations if status changed
  if (updates.status && workspaceId) {
    triggerAutomations(workspaceId, id, updates.status, oldStatus).catch(() => { });
  }
};

// 12. Subtasks update
export const updateSubtasksInDB = async (id: string, subtasks: Subtask[]): Promise<void> => {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(doc(db, COLLECTION_NAME, id), { subtasks, updatedAt: now });
};

// 12b. Archive/Unarchive
export const archiveTask = async (id: string): Promise<void> => {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(doc(db, COLLECTION_NAME, id), { archived: true, updatedAt: now });
};

export const unarchiveTask = async (id: string): Promise<void> => {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  await updateDoc(doc(db, COLLECTION_NAME, id), { archived: false, updatedAt: now });
};

// --- From Feature/Kim ---
// 13. 카테고리(프로젝트) 업데이트
export const updateTaskCategoryInDB = async (
  id: string,
  category: string | null,
  categoryColor: string | null
): Promise<void> => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(taskRef, {
      category: category || '',
      categoryColor: categoryColor || '',
    });
  } catch (error) {
    console.error("Error updating task category: ", error);
    throw error;
  }
};

// 14. 순서 업데이트 (Drag & Drop)
export const updateTaskOrderInDB = async (id: string, order: number): Promise<void> => {
  try {
    const taskRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(taskRef, { order });
  } catch (error) {
    console.error("Error updating task order: ", error);
    throw error;
  }
};

// 15. 여러 작업 순서 일괄 업데이트
export const updateTaskOrdersInDB = async (updates: { id: string; order: number }[]): Promise<void> => {
  if (updates.length === 0) return;
  try {
    const batch = writeBatch(db);
    updates.forEach(({ id, order }) => {
      batch.update(doc(db, COLLECTION_NAME, id), { order, updatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss') });
    });
    await batch.commit();
  } catch (error) {
    console.error("Error updating task orders: ", error);
    throw error;
  }
};

// 16. Project Stats (Total / Completed Tasks) for Initiatives
export const fetchProjectStats = async (projectId: string): Promise<{ total: number, completed: number }> => {
  const coll = collection(db, COLLECTION_NAME);
  const qTotal = query(coll, where("projectId", "==", projectId));
  const qCompleted = query(coll, where("projectId", "==", projectId), where("completed", "==", true));

  try {
    const snapTotal = await getCountFromServer(qTotal);
    const snapCompleted = await getCountFromServer(qCompleted);
    return { total: snapTotal.data().count, completed: snapCompleted.data().count };
  } catch (e) {
    console.error("Error fetching project stats:", e);
    return { total: 0, completed: 0 };
  }
};


// 17. Triage Tasks
export const fetchTriageTasks = async (userId: string): Promise<Task[]> => {
  try {
    // Tasks assigned to me with triageStatus == 'pending'
    const q = query(
      collection(db, COLLECTION_NAME),
      where("assigneeId", "==", userId),
      where("triageStatus", "==", "pending")
    );
    const snap = await getDocs(q);
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) {
    console.error("Error fetching triage tasks:", e);
    throw e;
  }
};

export const updateTaskTriageStatus = async (taskId: string, status: 'pending' | 'accepted' | 'declined' | 'snoozed'): Promise<void> => {
  try {
    const ref = doc(db, COLLECTION_NAME, taskId);
    const updates: any = { triageStatus: status, updatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss') };

    // If declined, the UI should call unassignTask separately to remove the user.
    // We just update the status here to 'declined' for record keeping if needed.

    await updateDoc(ref, updates);
  } catch (e) {
    console.error("Error updating triage status:", e);
    throw e;
  }
};

export const unassignTask = async (taskId: string, userId: string): Promise<void> => {
  // Helper to unassign self
  const ref = doc(db, COLLECTION_NAME, taskId);
  await updateDoc(ref, {
    assigneeId: null,
    assigneeName: null,
    assigneePhoto: null,
    ownerUids: arrayRemove(userId),
    updatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  });
};
