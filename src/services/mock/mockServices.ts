// src/services/mock/mockServices.ts
// Mock implementations of all service functions using the in-memory DB

import * as db from './mockDb';
import * as data from './mockData';
import { format } from 'date-fns';
import type {
  Task, Project, Sprint, Workspace, TeamMember, TeamGroup,
  Decision, Handoff, Issue, Notification, Initiative, Objective,
  CustomView, ViewFilter, IssueTemplate, AutomationRule,
  Subtask, TaskOwner, TaskType, KanbanColumn, MemberRole,
  WikiDocument, ActivityEntry, ActivityEntityType,
  RelationType, TaskRelation,
} from '../../types';
import { RELATION_TYPE_CONFIG } from '../../types';

// --- Collection names ---
const C = {
  tasks: 'tasks',
  projects: 'projects',
  sprints: 'sprints',
  workspaces: 'workspaces',
  teamGroups: 'teamGroups',
  decisions: 'decisions',
  handoffs: 'handoffs',
  issues: 'issues',
  notifications: 'notifications',
  initiatives: 'initiatives',
  customViews: 'customViews',
  issueTemplates: 'issueTemplates',
  automationRules: 'automationRules',
  objectives: 'objectives',
  wikiDocuments: 'wikiDocuments',
  activities: 'activities',
};

// --- Seed all data on first load ---
let _seeded = false;
export const seedAllData = () => {
  if (_seeded) return;
  db.seedCollection(C.tasks, data.mockTasks);
  db.seedCollection(C.projects, data.mockProjects);
  db.seedCollection(C.sprints, data.mockSprints);
  db.seedCollection(C.workspaces, data.mockWorkspaces);
  db.seedCollection(C.teamGroups, data.mockTeamGroups);
  db.seedCollection(C.decisions, data.mockDecisions);
  db.seedCollection(C.handoffs, data.mockHandoffs);
  db.seedCollection(C.issues, data.mockIssues);
  db.seedCollection(C.notifications, data.mockNotifications);
  db.seedCollection(C.initiatives, data.mockInitiatives);
  db.seedCollection(C.customViews, data.mockCustomViews);
  db.seedCollection(C.issueTemplates, data.mockIssueTemplates);
  db.seedCollection(C.automationRules, data.mockAutomationRules);
  db.seedCollection(C.objectives, data.mockObjectives);
  db.seedCollection(C.wikiDocuments, data.mockWikiDocuments);
  db.seedCollection(C.activities, data.mockActivities);
  _seeded = true;
  console.log(
    '%c Mock Mode Active - Using dummy data',
    'color: #f59e0b; font-weight: bold; font-size: 14px; background: #1a1a2e; padding: 4px 12px; border-radius: 4px;'
  );
};

const now = () => format(new Date(), 'yyyy-MM-dd HH:mm:ss');

// ===============================================================
// Task Service
// ===============================================================
export const fetchTasks = async (_userId: string): Promise<Task[]> => {
  seedAllData();
  return db.getAll<Task>(C.tasks);
};

export const fetchProjectTasks = async (projectId: string): Promise<Task[]> => {
  seedAllData();
  return db.getAll<Task>(C.tasks, { projectId });
};

export const fetchPersonalTasks = async (_userId: string): Promise<Task[]> => {
  seedAllData();
  return db.getAll<Task>(C.tasks, { scope: 'personal' });
};

export const fetchMyWorkTasks = async (_userId: string, workspaceId: string): Promise<Task[]> => {
  seedAllData();
  const all = await db.getAll<Task>(C.tasks, { workspaceId });
  return all.filter(t => t.ownerUids?.includes(_userId) || t.assigneeId === _userId);
};

interface AddTaskOptions {
  priority?: string; description?: string; dueDate?: string;
  category?: string; categoryColor?: string; status?: string;
  type?: TaskType; projectId?: string; workspaceId?: string;
  sprintId?: string; assigneeId?: string; assigneeName?: string;
  owners?: TaskOwner[]; ownerUids?: string[];
  blockerStatus?: 'none' | 'blocked'; blockerDetail?: string;
  nextAction?: string; links?: string[]; aiUsage?: string;
  scope?: 'personal' | 'work'; parentTaskId?: string;
  parentTaskText?: string; estimate?: number;
  teamGroupId?: string;
}

export const addTaskToDB = async (
  text: string, userId: string, date?: Date, tags?: string[],
  options?: AddTaskOptions,
): Promise<Task> => {
  seedAllData();
  const task: Task = {
    id: '', // will be set by db.add
    text,
    completed: false,
    status: options?.status || 'todo',
    priority: options?.priority,
    type: options?.type,
    description: options?.description,
    dueDate: options?.dueDate || (date ? format(date, 'yyyy-MM-dd') : undefined),
    tags: tags || [],
    projectId: options?.projectId,
    workspaceId: options?.workspaceId,
    sprintId: options?.sprintId,
    assigneeId: options?.assigneeId,
    assigneeName: options?.assigneeName,
    owners: options?.owners,
    ownerUids: options?.ownerUids,
    scope: options?.scope,
    estimate: options?.estimate,
    createdAt: now(),
  };
  return db.add<Task>(C.tasks, task);
};

export const toggleTaskStatusInDB = async (id: string, currentStatus: boolean): Promise<void> => {
  await db.update(C.tasks, id, {
    completed: !currentStatus,
    status: !currentStatus ? 'done' : 'todo',
    updatedAt: now(),
  });
};

export const updateTaskTextInDB = async (id: string, newText: string): Promise<void> => {
  await db.update(C.tasks, id, { text: newText, updatedAt: now() });
};

export const deleteTaskFromDB = async (id: string): Promise<void> => {
  await db.remove(C.tasks, id);
};

export const updateTaskDateInDB = async (id: string, newDate: string): Promise<void> => {
  await db.update(C.tasks, id, { dueDate: newDate, updatedAt: now() });
};

export const updateTaskTagsInDB = async (id: string, tags: string[]): Promise<void> => {
  await db.update(C.tasks, id, { tags, updatedAt: now() });
};

export const rolloverTasksToDate = async (taskIds: string[], newDate: Date): Promise<void> => {
  const d = format(newDate, 'yyyy-MM-dd');
  for (const id of taskIds) {
    await db.update(C.tasks, id, { dueDate: d, updatedAt: now() });
  }
};

export const updateTaskKanbanStatusInDB = async (
  id: string, status: string, _workspaceId?: string, _oldStatus?: string,
): Promise<void> => {
  await db.update(C.tasks, id, { status, updatedAt: now() });
};

export const updateTaskDetailInDB = async (
  id: string,
  updates: Partial<Task>,
  _workspaceId?: string,
  _oldStatus?: string,
): Promise<void> => {
  await db.update(C.tasks, id, { ...updates, updatedAt: now() });
};

export const updateSubtasksInDB = async (id: string, subtasks: Subtask[]): Promise<void> => {
  await db.update(C.tasks, id, { subtasks, updatedAt: now() });
};

export const archiveTask = async (id: string): Promise<void> => {
  await db.update(C.tasks, id, { archived: true, updatedAt: now() });
};

export const unarchiveTask = async (id: string): Promise<void> => {
  await db.update(C.tasks, id, { archived: false, updatedAt: now() });
};

export const updateTaskCategoryInDB = async (
  id: string, category: string | null, categoryColor: string | null,
): Promise<void> => {
  await db.update(C.tasks, id, {
    category: category || undefined,
    categoryColor: categoryColor || undefined,
    updatedAt: now(),
  });
};

export const updateTaskOrderInDB = async (id: string, order: number): Promise<void> => {
  await db.update(C.tasks, id, { order, updatedAt: now() });
};

export const updateTaskOrdersInDB = async (updates: { id: string; order: number }[]): Promise<void> => {
  for (const u of updates) {
    await db.update(C.tasks, u.id, { order: u.order });
  }
};

export const fetchProjectStats = async (projectId: string): Promise<{ total: number; completed: number }> => {
  const tasks = await db.getAll<Task>(C.tasks, { projectId });
  return {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done' || t.completed).length,
  };
};

export const fetchTriageTasks = async (_userId: string): Promise<Task[]> => {
  seedAllData();
  const all = await db.getAll<Task>(C.tasks);
  return all.filter(t => t.triageStatus === 'pending');
};

export const updateTaskTriageStatus = async (
  taskId: string, status: 'pending' | 'accepted' | 'declined' | 'snoozed',
): Promise<void> => {
  await db.update(C.tasks, taskId, { triageStatus: status, updatedAt: now() });
};

export const unassignTask = async (taskId: string, _userId: string): Promise<void> => {
  await db.update(C.tasks, taskId, {
    assigneeId: undefined,
    assigneeName: undefined,
    assigneePhoto: undefined,
    updatedAt: now(),
  });
};

// 18. Issue Relations Management
export const addTaskRelation = async (
  taskId: string,
  targetTask: Task,
  relationType: RelationType,
  currentTaskCode?: string,
  currentTaskText?: string,
): Promise<void> => {
  const task = await db.getById<Task>(C.tasks, taskId);
  const target = await db.getById<Task>(C.tasks, targetTask.id);
  if (!task || !target) return;

  const newRel: TaskRelation = {
    type: relationType,
    targetTaskId: targetTask.id,
    targetTaskCode: targetTask.taskCode,
    targetTaskText: targetTask.text,
  };

  const invType = RELATION_TYPE_CONFIG[relationType].inverse;
  const invRel: TaskRelation = {
    type: invType,
    targetTaskId: taskId,
    targetTaskCode: currentTaskCode,
    targetTaskText: currentTaskText,
  };

  await db.update(C.tasks, taskId, {
    relations: [...(task.relations || []), newRel],
    updatedAt: now(),
  });
  await db.update(C.tasks, targetTask.id, {
    relations: [...(target.relations || []), invRel],
    updatedAt: now(),
  });
};

export const removeTaskRelation = async (
  taskId: string,
  targetTaskId: string,
  relationType: RelationType,
): Promise<void> => {
  const task = await db.getById<Task>(C.tasks, taskId);
  const target = await db.getById<Task>(C.tasks, targetTaskId);
  if (!task || !target) return;

  const invType = RELATION_TYPE_CONFIG[relationType].inverse;

  await db.update(C.tasks, taskId, {
    relations: (task.relations || []).filter(
      r => !(r.targetTaskId === targetTaskId && r.type === relationType),
    ),
    updatedAt: now(),
  });
  await db.update(C.tasks, targetTaskId, {
    relations: (target.relations || []).filter(
      r => !(r.targetTaskId === taskId && r.type === invType),
    ),
    updatedAt: now(),
  });
};

// 20. Sprint Rollover
export const rolloverSprintTasks = async (
  fromSprintId: string,
  toSprintId: string,
  taskIds?: string[],
): Promise<number> => {
  if (taskIds && taskIds.length > 0) {
    for (const id of taskIds) {
      await db.update(C.tasks, id, { sprintId: toSprintId, updatedAt: now() });
    }
    return taskIds.length;
  }
  const all = await db.getAll<Task>(C.tasks, { sprintId: fromSprintId });
  const incomplete = all.filter(t => !t.completed && t.status !== 'done');
  for (const t of incomplete) {
    await db.update(C.tasks, t.id, { sprintId: toSprintId, updatedAt: now() });
  }
  return incomplete.length;
};

// ===============================================================
// Project Service
// ===============================================================
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: '#6366f1', order: 0 },
  { id: 'inprogress', title: 'In Progress', color: '#f59e0b', order: 1 },
  { id: 'done', title: 'Done', color: '#10b981', order: 2 },
];

export const createProject = async (
  name: string, workspaceId: string, color: string, createdBy: string,
  teamGroupId?: string, initiativeId?: string,
): Promise<Project> => {
  seedAllData();
  return db.add<Project>(C.projects, {
    name, workspaceId, color, createdBy,
    ...(teamGroupId ? { teamGroupId } : {}),
    ...(initiativeId ? { initiativeId } : {}),
    createdAt: now(),
    kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  } as Omit<Project, 'id'>);
};

export const fetchWorkspaceProjects = async (workspaceId: string): Promise<Project[]> => {
  seedAllData();
  return db.getAll<Project>(C.projects, { workspaceId });
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<void> => {
  await db.update(C.projects, id, updates);
};

export const deleteProject = async (id: string): Promise<void> => {
  await db.remove(C.projects, id);
};

export const updateProjectColumns = async (id: string, columns: KanbanColumn[]): Promise<void> => {
  await db.update(C.projects, id, { kanbanColumns: columns });
};

// ===============================================================
// Sprint Service
// ===============================================================
export const createSprint = async (
  projectId: string, name: string, type: Sprint['type'] = 'sprint',
  order: number = 0, startDate?: string, endDate?: string,
  parentId?: string, linkedSprintIds?: string[],
): Promise<Sprint> => {
  seedAllData();
  const d: Omit<Sprint, 'id'> = {
    projectId, name, type, status: 'planning', order,
    createdAt: now(),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(parentId ? { parentId } : {}),
    ...(linkedSprintIds?.length ? { linkedSprintIds } : {}),
  };
  return db.add<Sprint>(C.sprints, d);
};

export const fetchProjectSprints = async (projectId: string): Promise<Sprint[]> => {
  seedAllData();
  const sprints = await db.getAll<Sprint>(C.sprints, { projectId });
  return sprints.sort((a, b) => a.order - b.order);
};

export const updateSprint = async (
  id: string,
  updates: Partial<Pick<Sprint, 'name' | 'status' | 'startDate' | 'endDate' | 'order' | 'type' | 'kanbanColumns' | 'parentId' | 'linkedSprintIds'>>,
): Promise<void> => {
  await db.update(C.sprints, id, updates);
};

export const deleteSprint = async (id: string): Promise<void> => {
  await db.remove(C.sprints, id);
};

export const fetchWorkspaceSprints = async (projectIds: string[]): Promise<Sprint[]> => {
  seedAllData();
  const all = await db.getAll<Sprint>(C.sprints);
  return all.filter(s => projectIds.includes(s.projectId)).sort((a, b) => a.order - b.order);
};

// ===============================================================
// Workspace Service
// ===============================================================
export const createWorkspace = async (
  name: string, color: string, type: Workspace['type'],
  user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null },
): Promise<Workspace> => {
  seedAllData();
  const member: TeamMember = {
    uid: user.uid, displayName: user.displayName || 'User',
    email: user.email || '', photoURL: user.photoURL || undefined,
    role: 'owner', joinedAt: now(),
  };
  return db.add<Workspace>(C.workspaces, {
    name, color, type, members: [member], memberUids: [user.uid],
    createdBy: user.uid, inviteCode: 'MOCK_NEW', createdAt: now(),
  } as Omit<Workspace, 'id'>);
};

export const fetchUserWorkspaces = async (_userId: string): Promise<Workspace[]> => {
  seedAllData();
  return db.getAll<Workspace>(C.workspaces);
};

export const joinWorkspaceByCode = async (
  _inviteCode: string,
  _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null },
): Promise<Workspace | null> => {
  seedAllData();
  const all = await db.getAll<Workspace>(C.workspaces);
  return all[0] || null;
};

export const joinWorkspaceByInvite = async (
  workspaceId: string,
  _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null },
): Promise<Workspace | null> => {
  return db.getById<Workspace>(C.workspaces, workspaceId);
};

export const fetchWorkspaceMembers = async (_wsId: string): Promise<TeamMember[]> => {
  seedAllData();
  return [...data.mockMembers];
};

export const regenerateInviteCode = async (_wsId: string): Promise<string> => {
  return 'MOCK_NEW';
};

export const updateWorkspace = async (wsId: string, updates: Partial<Pick<Workspace, 'name' | 'color' | 'type'>>): Promise<void> => {
  await db.update(C.workspaces, wsId, updates);
};

export const createTeamGroup = async (workspaceId: string, name: string, color: string): Promise<TeamGroup> => {
  seedAllData();
  return db.add<TeamGroup>(C.teamGroups, {
    workspaceId, name, color, memberIds: [], createdAt: now(),
  } as Omit<TeamGroup, 'id'>);
};

export const fetchTeamGroups = async (workspaceId: string): Promise<TeamGroup[]> => {
  seedAllData();
  return db.getAll<TeamGroup>(C.teamGroups, { workspaceId });
};

export const deleteTeamGroup = async (id: string): Promise<void> => {
  await db.remove(C.teamGroups, id);
};

export const updateTeamGroup = async (id: string, updates: Partial<TeamGroup>): Promise<void> => {
  await db.update(C.teamGroups, id, updates);
};

export const assignMemberToTeam = async (_teamGroupId: string, _memberUid: string): Promise<void> => {
  const tg = await db.getById<TeamGroup>(C.teamGroups, _teamGroupId);
  if (tg && !tg.memberIds.includes(_memberUid)) {
    await db.update(C.teamGroups, _teamGroupId, { memberIds: [...tg.memberIds, _memberUid] });
  }
};

export const removeMemberFromTeam = async (_teamGroupId: string, _memberUid: string): Promise<void> => {
  const tg = await db.getById<TeamGroup>(C.teamGroups, _teamGroupId);
  if (tg) {
    await db.update(C.teamGroups, _teamGroupId, { memberIds: tg.memberIds.filter(id => id !== _memberUid) });
  }
};

export const updateMemberRole = async (_workspaceId: string, _memberUid: string, _newRole: MemberRole): Promise<void> => {
  // Mock: no-op (members are in workspace doc)
};

// ===============================================================
// OpsService (Decisions, Handoffs, Issues)
// ===============================================================
export const fetchDecisions = async (workspaceId: string): Promise<Decision[]> => {
  seedAllData();
  return db.getAll<Decision>(C.decisions, { workspaceId });
};
export const addDecision = async (d: Omit<Decision, 'id' | 'createdAt'>): Promise<Decision> => {
  return db.add<Decision>(C.decisions, { ...d, createdAt: now() } as Omit<Decision, 'id'>);
};
export const updateDecision = async (id: string, updates: Partial<Decision>): Promise<void> => {
  await db.update(C.decisions, id, updates);
};
export const deleteDecision = async (id: string): Promise<void> => {
  await db.remove(C.decisions, id);
};

export const fetchHandoffs = async (workspaceId: string): Promise<Handoff[]> => {
  seedAllData();
  return db.getAll<Handoff>(C.handoffs, { workspaceId });
};
export const addHandoff = async (h: Omit<Handoff, 'id' | 'createdAt'>): Promise<Handoff> => {
  return db.add<Handoff>(C.handoffs, { ...h, createdAt: now() } as Omit<Handoff, 'id'>);
};
export const updateHandoff = async (id: string, updates: Partial<Handoff>): Promise<void> => {
  await db.update(C.handoffs, id, updates);
};
export const deleteHandoff = async (id: string): Promise<void> => {
  await db.remove(C.handoffs, id);
};

export const fetchIssues = async (workspaceId: string): Promise<Issue[]> => {
  seedAllData();
  return db.getAll<Issue>(C.issues, { workspaceId });
};
export const addIssue = async (i: Omit<Issue, 'id' | 'createdAt'>): Promise<Issue> => {
  return db.add<Issue>(C.issues, { ...i, createdAt: now() } as Omit<Issue, 'id'>);
};
export const updateIssue = async (id: string, updates: Partial<Issue>): Promise<void> => {
  await db.update(C.issues, id, updates);
};
export const deleteIssue = async (id: string): Promise<void> => {
  await db.remove(C.issues, id);
};

// Report generator mock
export const generateDailyOpsReport = async (): Promise<string> => {
  seedAllData();
  return 'Daily Ops Report (Mock)\n\n' +
    'Decisions: 4 total\n' +
    'Handoffs: 3 total (2 pending)\n' +
    'Issues: 4 total (2 resolved)\n' +
    '\n-- Generated by Mock Service --';
};

// ===============================================================
// Notification Service
// ===============================================================
export const fetchNotifications = async (recipientUid: string): Promise<Notification[]> => {
  seedAllData();
  const all = await db.getAll<Notification>(C.notifications, { recipientUid });
  return all.filter(n => !n.archived).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const fetchUnreadCount = async (recipientUid: string): Promise<number> => {
  const notifs = await fetchNotifications(recipientUid);
  return notifs.filter(n => !n.read).length;
};

export const createNotification = async (opts: Omit<Notification, 'id' | 'read' | 'archived' | 'createdAt'>): Promise<Notification> => {
  return db.add<Notification>(C.notifications, { ...opts, read: false, archived: false, createdAt: now() } as Omit<Notification, 'id'>);
};

export const createNotificationsForMany = async (
  recipientUids: string[],
  opts: Omit<Notification, 'id' | 'read' | 'archived' | 'createdAt' | 'recipientUid'>,
): Promise<void> => {
  for (const uid of recipientUids) {
    await db.add<Notification>(C.notifications, { ...opts, recipientUid: uid, read: false, archived: false, createdAt: now() } as Omit<Notification, 'id'>);
  }
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  await db.update(C.notifications, notificationId, { read: true });
};

export const markAllAsRead = async (recipientUid: string): Promise<void> => {
  const all = await db.getAll<Notification>(C.notifications, { recipientUid });
  for (const n of all) {
    if (!n.read) await db.update(C.notifications, n.id, { read: true });
  }
};

export const archiveNotification = async (notificationId: string): Promise<void> => {
  await db.update(C.notifications, notificationId, { archived: true });
};

export const archiveAllRead = async (recipientUid: string): Promise<void> => {
  const all = await db.getAll<Notification>(C.notifications, { recipientUid });
  for (const n of all) {
    if (n.read && !n.archived) await db.update(C.notifications, n.id, { archived: true });
  }
};

// Convenience helpers
export const notifyTaskAssigned = async (..._args: unknown[]): Promise<void> => { /* mock no-op */ };
export const notifyTaskStatusChanged = async (..._args: unknown[]): Promise<void> => { /* mock no-op */ };
export const notifyTaskCompleted = async (..._args: unknown[]): Promise<void> => { /* mock no-op */ };

// ===============================================================
// Initiative Service
// ===============================================================
export const fetchInitiatives = async (workspaceId: string): Promise<Initiative[]> => {
  seedAllData();
  return db.getAll<Initiative>(C.initiatives, { workspaceId });
};

export const createInitiative = async (d: Omit<Initiative, 'id' | 'createdAt'>): Promise<Initiative> => {
  return db.add<Initiative>(C.initiatives, { ...d, createdAt: now() } as Omit<Initiative, 'id'>);
};

export const updateInitiative = async (id: string, updates: Partial<Initiative>): Promise<void> => {
  await db.update(C.initiatives, id, { ...updates, updatedAt: now() });
};

export const deleteInitiative = async (id: string): Promise<void> => {
  await db.remove(C.initiatives, id);
};

// ===============================================================
// Custom View Service
// ===============================================================
export const fetchCustomViews = async (projectId: string): Promise<CustomView[]> => {
  seedAllData();
  return db.getAll<CustomView>(C.customViews, { projectId });
};

export const createCustomView = async (opts: {
  name: string; icon: string; color: string; filters: ViewFilter;
  viewMode?: string; projectId: string; workspaceId: string; createdBy: string;
}): Promise<CustomView> => {
  return db.add<CustomView>(C.customViews, { ...opts, createdAt: now() } as Omit<CustomView, 'id'>);
};

export const updateCustomView = async (
  viewId: string,
  updates: Partial<Pick<CustomView, 'name' | 'icon' | 'color' | 'filters' | 'viewMode'>>,
): Promise<void> => {
  await db.update(C.customViews, viewId, { ...updates, updatedAt: now() });
};

export const deleteCustomView = async (viewId: string): Promise<void> => {
  await db.remove(C.customViews, viewId);
};

// ===============================================================
// Issue Template Service
// ===============================================================
export const fetchIssueTemplates = async (workspaceId: string): Promise<IssueTemplate[]> => {
  seedAllData();
  return db.getAll<IssueTemplate>(C.issueTemplates, { workspaceId });
};

export const createIssueTemplate = async (d: Omit<IssueTemplate, 'id' | 'createdAt'>): Promise<IssueTemplate> => {
  return db.add<IssueTemplate>(C.issueTemplates, { ...d, createdAt: now() } as Omit<IssueTemplate, 'id'>);
};

export const updateIssueTemplate = async (id: string, updates: Partial<IssueTemplate>): Promise<void> => {
  await db.update(C.issueTemplates, id, { ...updates, updatedAt: now() });
};

export const deleteIssueTemplate = async (id: string): Promise<void> => {
  await db.remove(C.issueTemplates, id);
};

// ===============================================================
// Automation Service
// ===============================================================
export const fetchAutomationRules = async (workspaceId: string): Promise<AutomationRule[]> => {
  seedAllData();
  return db.getAll<AutomationRule>(C.automationRules, { workspaceId });
};

export const createAutomationRule = async (rule: Omit<AutomationRule, 'id'>): Promise<AutomationRule> => {
  return db.add<AutomationRule>(C.automationRules, rule);
};

export const deleteAutomationRule = async (ruleId: string): Promise<void> => {
  await db.remove(C.automationRules, ruleId);
};

export const toggleAutomationRule = async (ruleId: string, isEnabled: boolean): Promise<void> => {
  await db.update(C.automationRules, ruleId, { isEnabled });
};

export const triggerAutomations = async (
  _workspaceId: string, _taskId: string, _newStatus: string, _oldStatus?: string,
): Promise<void> => {
  // Mock: no-op
};

// ===============================================================
// Invitation Service
// ===============================================================
import type { Invitation, ProjectUpdate } from '../../types';

export const createEmailInvite = async (
  workspaceId: string, email: string, invitedBy: string,
): Promise<Invitation> => ({
  id: 'mock_inv_' + Date.now(), workspaceId, type: 'email', email, token: 'MOCK_' + Date.now(),
  status: 'pending', invitedBy, createdAt: now(), expiresAt: now(),
});

export const createLinkInvite = async (
  workspaceId: string, invitedBy: string,
): Promise<Invitation> => ({
  id: 'mock_inv_' + Date.now(), workspaceId, type: 'link', token: 'MOCK_' + Date.now(),
  status: 'pending', invitedBy, createdAt: now(), expiresAt: now(),
});

export const findInviteByToken = async (_token: string): Promise<Invitation | null> => null;

export const checkPendingInvites = async (_email: string): Promise<Invitation[]> => [];

export const acceptInvite = async (_inviteId: string): Promise<void> => {};

export const fetchWorkspaceInvites = async (_workspaceId: string): Promise<Invitation[]> => [];

// ===============================================================
// Project Update Service
// ===============================================================
export const fetchProjectUpdates = async (_projectId: string): Promise<ProjectUpdate[]> => [];

export const createProjectUpdate = async (
  d: Omit<ProjectUpdate, 'id'>,
): Promise<ProjectUpdate> => ({ id: 'mock_pu_' + Date.now(), ...d });

export const deleteProjectUpdate = async (_id: string): Promise<void> => {};

// ===============================================================
// OKR Service
// ===============================================================
export const fetchObjectives = async (workspaceId: string, period?: string): Promise<Objective[]> => {
  seedAllData();
  let objs = await db.getAll<Objective>(C.objectives, { workspaceId });
  if (period) objs = objs.filter(o => o.period === period);
  return objs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createObjective = async (
  d: Omit<Objective, 'id' | 'createdAt'>,
): Promise<Objective> => {
  seedAllData();
  return db.add<Objective>(C.objectives, { ...d, createdAt: now() } as Omit<Objective, 'id'>);
};

export const updateObjective = async (
  id: string,
  updates: Partial<Omit<Objective, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>,
): Promise<void> => {
  seedAllData();
  await db.update(C.objectives, id, { ...updates, updatedAt: now() });
};

export const deleteObjective = async (id: string): Promise<void> => {
  seedAllData();
  await db.remove(C.objectives, id);
};

// ===============================================================
// Wiki Service
// ===============================================================
export const fetchWikiDocuments = async (workspaceId: string): Promise<WikiDocument[]> => {
  seedAllData();
  return db.getAll<WikiDocument>(C.wikiDocuments, { workspaceId });
};

export const createWikiDocument = async (
  d: Omit<WikiDocument, 'id' | 'createdAt'>,
): Promise<WikiDocument> => {
  seedAllData();
  return db.add<WikiDocument>(C.wikiDocuments, { ...d, createdAt: now() } as Omit<WikiDocument, 'id'>);
};

export const updateWikiDocument = async (
  id: string,
  updates: Partial<Omit<WikiDocument, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>,
): Promise<void> => {
  seedAllData();
  await db.update(C.wikiDocuments, id, { ...updates, updatedAt: now() });
};

export const deleteWikiDocument = async (id: string): Promise<void> => {
  seedAllData();
  await db.remove(C.wikiDocuments, id);
};

// ===============================================================
// Activity Log Service
// ===============================================================
export const fetchActivities = async (
  workspaceId: string,
  opts?: { entityType?: ActivityEntityType; entityId?: string; limit?: number },
): Promise<ActivityEntry[]> => {
  seedAllData();
  let all = await db.getAll<ActivityEntry>(C.activities, { workspaceId });
  if (opts?.entityType) all = all.filter(a => a.entityType === opts.entityType);
  if (opts?.entityId) all = all.filter(a => a.entityId === opts.entityId);
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return all.slice(0, opts?.limit || 50);
};

export const logActivity = async (
  entry: Omit<ActivityEntry, 'id'>,
): Promise<string> => {
  seedAllData();
  const added = await db.add<ActivityEntry>(C.activities, {
    ...entry,
    timestamp: entry.timestamp || now(),
  } as Omit<ActivityEntry, 'id'>);
  return added.id;
};
