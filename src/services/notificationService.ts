// src/services/notificationService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, type PaginatedResponse } from './apiClient';
import type { Notification, NotificationType } from '../types';

// --- Fetch ---

export const fetchNotifications = async (_recipientUid: string): Promise<Notification[]> => {
    const res = await apiGet<PaginatedResponse<Notification>>('notifications/');
    return res.results.filter(n => !n.archived);
};

export const fetchUnreadCount = async (_recipientUid: string): Promise<number> => {
    const res = await apiGet<PaginatedResponse<Notification>>('notifications/');
    return res.results.filter(n => !n.read && !n.archived).length;
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
    if (opts.actorUid === opts.recipientUid) {
        return { id: '', ...opts, read: true, archived: false, createdAt: new Date().toISOString() };
    }
    return apiPost<Notification>('notifications/', {
        type: opts.type,
        title: opts.title,
        body: opts.body,
        actor: opts.actorUid,
        actor_name: opts.actorName,
        actor_photo: opts.actorPhoto || '',
        recipient: opts.recipientUid,
        workspace: opts.workspaceId,
        project: opts.projectId,
        project_name: opts.projectName || '',
        task: opts.taskId,
        task_text: opts.taskText || '',
        sprint: opts.sprintId,
        sprint_name: opts.sprintName || '',
    });
};

export const createNotificationsForMany = async (
    recipientUids: string[],
    opts: Omit<CreateNotificationOptions, 'recipientUid'>,
): Promise<void> => {
    const promises = recipientUids
        .filter(uid => uid !== opts.actorUid)
        .map(uid => createNotification({ ...opts, recipientUid: uid }));
    await Promise.all(promises);
};

// --- Update ---

export const markAsRead = async (notificationId: string): Promise<void> => {
    await apiPost(`notifications/${notificationId}/read/`, {});
};

export const markAllAsRead = async (_recipientUid: string): Promise<void> => {
    await apiPost('notifications/mark-all-read/', {});
};

export const archiveNotification = async (notificationId: string): Promise<void> => {
    await apiPatch(`notifications/${notificationId}/`, { archived: true });
};

export const archiveAllRead = async (_recipientUid: string): Promise<void> => {
    const res = await apiGet<PaginatedResponse<Notification>>('notifications/');
    const readNotArchived = res.results.filter(n => n.read && !n.archived);
    await Promise.all(readNotArchived.map(n => apiPatch(`notifications/${n.id}/`, { archived: true })));
};

// --- Convenience Helpers ---

interface ActorInfo {
    uid: string;
    name: string;
    photo?: string;
}

export const notifyTaskAssigned = async (
    actor: ActorInfo, recipientUid: string, taskId: string, taskText: string,
    workspaceId: string, projectId?: string, projectName?: string,
) => createNotification({
    type: 'task_assigned', title: `${actor.name} assigned you a task`, body: taskText,
    actorUid: actor.uid, actorName: actor.name, actorPhoto: actor.photo,
    recipientUid, workspaceId, projectId, projectName, taskId, taskText,
});

export const notifyTaskStatusChanged = async (
    actor: ActorInfo, recipientUids: string[], taskId: string, taskText: string,
    newStatus: string, workspaceId: string, projectId?: string, projectName?: string,
) => createNotificationsForMany(recipientUids, {
    type: 'task_status_changed', title: `${actor.name} changed status to "${newStatus}"`, body: taskText,
    actorUid: actor.uid, actorName: actor.name, actorPhoto: actor.photo,
    workspaceId, projectId, projectName, taskId, taskText,
});

export const notifyTaskCompleted = async (
    actor: ActorInfo, recipientUids: string[], taskId: string, taskText: string,
    workspaceId: string, projectId?: string, projectName?: string,
) => createNotificationsForMany(recipientUids, {
    type: 'task_completed', title: `${actor.name} completed a task`, body: taskText,
    actorUid: actor.uid, actorName: actor.name, actorPhoto: actor.photo,
    workspaceId, projectId, projectName, taskId, taskText,
});
