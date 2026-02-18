// src/services/notificationService.ts
import {
    collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy, writeBatch,
} from "firebase/firestore";
import type { Notification, NotificationType } from '../types';
import { db } from '../FBase';

const COLLECTION = "notifications";

// --- Fetch ---

/** Fetch all non-archived notifications for a user, newest first */
export const fetchNotifications = async (recipientUid: string): Promise<Notification[]> => {
    const q = query(
        collection(db, COLLECTION),
        where("recipientUid", "==", recipientUid),
        where("archived", "==", false),
        orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
};

/** Fetch unread count only */
export const fetchUnreadCount = async (recipientUid: string): Promise<number> => {
    const q = query(
        collection(db, COLLECTION),
        where("recipientUid", "==", recipientUid),
        where("read", "==", false),
        where("archived", "==", false),
    );
    const snap = await getDocs(q);
    return snap.size;
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

    const data = {
        ...opts,
        read: false,
        archived: false,
        createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, COLLECTION), data);
    return { id: docRef.id, ...data };
};

/** Batch-create notifications for multiple recipients */
export const createNotificationsForMany = async (
    recipientUids: string[],
    opts: Omit<CreateNotificationOptions, 'recipientUid'>,
): Promise<void> => {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    for (const uid of recipientUids) {
        if (uid === opts.actorUid) continue; // skip self
        const ref = doc(collection(db, COLLECTION));
        batch.set(ref, { ...opts, recipientUid: uid, read: false, archived: false, createdAt: now });
    }
    await batch.commit();
};

// --- Update ---

export const markAsRead = async (notificationId: string): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, notificationId), { read: true });
};

export const markAllAsRead = async (recipientUid: string): Promise<void> => {
    const q = query(
        collection(db, COLLECTION),
        where("recipientUid", "==", recipientUid),
        where("read", "==", false),
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
};

export const archiveNotification = async (notificationId: string): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, notificationId), { archived: true });
};

export const archiveAllRead = async (recipientUid: string): Promise<void> => {
    const q = query(
        collection(db, COLLECTION),
        where("recipientUid", "==", recipientUid),
        where("read", "==", true),
        where("archived", "==", false),
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { archived: true }));
    await batch.commit();
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

