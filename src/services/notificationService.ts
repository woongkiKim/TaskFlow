// src/services/notificationService.ts
// NotificationService — now proxied through Django REST API

import api from './apiClient';
import type { Notification, NotificationType } from '../types';

// ─── Response type ───────────────────────────────────────

interface ApiNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  archived: boolean;
  actor: number;
  actorName: string;
  actorPhoto: string;
  recipient: number;
  workspace: number;
  project: number | null;
  projectName: string;
  task: number | null;
  taskText: string;
  sprint: number | null;
  sprintName: string;
  createdAt: string;
}

// ─── Mapper ──────────────────────────────────────────────

function mapNotification(n: ApiNotification): Notification {
  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    archived: n.archived,
    actorUid: String(n.actor),
    actorName: n.actorName,
    actorPhoto: n.actorPhoto || undefined,
    recipientUid: String(n.recipient),
    workspaceId: String(n.workspace),
    projectId: n.project ? String(n.project) : undefined,
    projectName: n.projectName || undefined,
    taskId: n.task ? String(n.task) : undefined,
    taskText: n.taskText || undefined,
    sprintId: n.sprint ? String(n.sprint) : undefined,
    sprintName: n.sprintName || undefined,
    createdAt: n.createdAt,
  };
}

// --- Fetch ---

/** Fetch all non-archived notifications for a user, newest first */
export const fetchNotifications = async (_recipientUid: string): Promise<Notification[]> => {
  const data = await api.get<{ results: ApiNotification[] }>('notifications/', { archived: 'false' });
  return (data.results || []).map(mapNotification);
};

/** Fetch unread count only */
export const fetchUnreadCount = async (_recipientUid: string): Promise<number> => {
  const data = await api.get<{ results: ApiNotification[] }>('notifications/', { read: 'false', archived: 'false' });
  return (data.results || []).length;
};

// --- Create ---

interface CreateNotificationOptions {
  type: NotificationType;
  title: string;
  body: string;
  actorUid: string;
  actorName: string;
  actorPhoto?: string;
  recipientUid: string;
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskText?: string;
  sprintId?: string;
  sprintName?: string;
}

export const createNotification = async (opts: CreateNotificationOptions): Promise<Notification> => {
  // Don't notify yourself
  if (opts.actorUid === opts.recipientUid) {
    return { id: '', ...opts, read: true, archived: false, createdAt: new Date().toISOString() };
  }

  const data = await api.post<ApiNotification>('notifications/', {
    type: opts.type,
    title: opts.title,
    body: opts.body,
    actorName: opts.actorName,
    actorPhoto: opts.actorPhoto || '',
    workspace: Number(opts.workspaceId),
    project: opts.projectId ? Number(opts.projectId) : null,
    projectName: opts.projectName || '',
    task: opts.taskId ? Number(opts.taskId) : null,
    taskText: opts.taskText || '',
    sprint: opts.sprintId ? Number(opts.sprintId) : null,
    sprintName: opts.sprintName || '',
  });
  return mapNotification(data);
};

/** Batch-create notifications for multiple recipients */
export const createNotificationsForMany = async (
  recipientUids: string[],
  opts: Omit<CreateNotificationOptions, 'recipientUid'>,
): Promise<void> => {
  for (const uid of recipientUids) {
    if (uid === opts.actorUid) continue;
    await createNotification({ ...opts, recipientUid: uid });
  }
};

// --- Update ---

export const markAsRead = async (notificationId: string): Promise<void> => {
  await api.patch(`notifications/${notificationId}/`, { read: true });
};

export const markAllAsRead = async (_recipientUid: string): Promise<void> => {
  // Fetch all unread, then batch mark
  const data = await api.get<{ results: ApiNotification[] }>('notifications/', { read: 'false' });
  for (const n of (data.results || [])) {
    await api.patch(`notifications/${n.id}/`, { read: true });
  }
};

export const archiveNotification = async (notificationId: string): Promise<void> => {
  await api.patch(`notifications/${notificationId}/`, { archived: true });
};

export const archiveAllRead = async (_recipientUid: string): Promise<void> => {
  const data = await api.get<{ results: ApiNotification[] }>('notifications/', { read: 'true', archived: 'false' });
  for (const n of (data.results || [])) {
    await api.patch(`notifications/${n.id}/`, { archived: true });
  }
};

// --- Convenience Helpers ---

interface ActorInfo {
  uid: string;
  name: string;
  photo?: string;
}

/** Notify when task is assigned to someone */
export const notifyTaskAssigned = async (
  actor: ActorInfo,
  recipientUid: string,
  taskId: string,
  taskText: string,
  workspaceId: string,
  projectId?: string,
  projectName?: string,
) => createNotification({
  type: 'task_assigned',
  title: `${actor.name} assigned you a task`,
  body: taskText,
  actorUid: actor.uid,
  actorName: actor.name,
  actorPhoto: actor.photo,
  recipientUid,
  workspaceId,
  projectId,
  projectName,
  taskId,
  taskText,
});

/** Notify owners when task status changes */
export const notifyTaskStatusChanged = async (
  actor: ActorInfo,
  recipientUids: string[],
  taskId: string,
  taskText: string,
  newStatus: string,
  workspaceId: string,
  projectId?: string,
  projectName?: string,
) => createNotificationsForMany(recipientUids, {
  type: 'task_status_changed',
  title: `${actor.name} changed status to "${newStatus}"`,
  body: taskText,
  actorUid: actor.uid,
  actorName: actor.name,
  actorPhoto: actor.photo,
  workspaceId,
  projectId,
  projectName,
  taskId,
  taskText,
});

/** Notify when task is completed */
export const notifyTaskCompleted = async (
  actor: ActorInfo,
  recipientUids: string[],
  taskId: string,
  taskText: string,
  workspaceId: string,
  projectId?: string,
  projectName?: string,
) => createNotificationsForMany(recipientUids, {
  type: 'task_completed',
  title: `${actor.name} completed a task`,
  body: taskText,
  actorUid: actor.uid,
  actorName: actor.name,
  actorPhoto: actor.photo,
  workspaceId,
  projectId,
  projectName,
  taskId,
  taskText,
});
