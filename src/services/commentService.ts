// src/services/commentService.ts
// Django REST API version
import api from './apiClient';
import type { TaskComment } from '../types';
import { createNotification } from './notificationService';

/**
 * Extract @mentioned usernames from comment body.
 * Matches patterns like @username or @"Display Name"
 */
export const extractMentions = (body: string): string[] => {
    const regex = /@([a-zA-Z0-9_.-]+|"[^"]+?")/g;
    const mentions: string[] = [];
    let match;
    while ((match = regex.exec(body)) !== null) {
        mentions.push(match[1].replace(/"/g, ''));
    }
    return mentions;
};

export const fetchTaskComments = async (taskId: string): Promise<TaskComment[]> => {
    const res = await api.get<{ results: TaskComment[] }>('task-comments/', { task_id: taskId });
    return res.results;
};

export const addTaskComment = async (
    data: Omit<TaskComment, 'id' | 'createdAt'>,
    /** Optional: workspace members for @mention notification */
    opts?: {
        workspaceId?: string;
        taskText?: string;
        members?: { uid: string; displayName: string }[];
    }
): Promise<TaskComment> => {
    const comment = await api.post<TaskComment>('task-comments/', {
        task: data.taskId,
        author_name: data.authorName,
        author_photo: data.authorPhoto || '',
        body: data.body,
    });

    // Detect @mentions and create notifications
    if (opts?.members && opts.workspaceId) {
        const mentions = extractMentions(data.body);
        for (const mentionName of mentions) {
            const member = opts.members.find(
                m => m.displayName.toLowerCase() === mentionName.toLowerCase()
                  || m.uid === mentionName
            );
            if (member && member.uid !== data.authorUid) {
                try {
                    await createNotification({
                        type: 'task_mentioned',
                        title: `${data.authorName} mentioned you`,
                        body: data.body.slice(0, 200),
                        recipientUid: member.uid,
                        actorUid: data.authorUid,
                        actorName: data.authorName,
                        actorPhoto: data.authorPhoto,
                        workspaceId: opts.workspaceId,
                        taskId: data.taskId,
                        taskText: opts.taskText,
                    });
                } catch { /* best-effort */ }
            }
        }
    }

    return comment;
};

export const deleteTaskComment = async (commentId: string): Promise<void> => {
    await api.delete(`task-comments/${commentId}/`);
};

// --- Legacy aliases used by existing components ---
export const addComment = addTaskComment;

export const fetchCommentsByNotificationId = async (notificationId: string): Promise<TaskComment[]> => {
    const res = await api.get<{ results: TaskComment[] }>('task-comments/', { notification_id: notificationId });
    return res.results;
};
