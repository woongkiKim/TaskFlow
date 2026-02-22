// src/services/commentService.ts
// Django REST API version
import { apiGet, apiPost, apiDelete, type PaginatedResponse } from './apiClient';
import type { TaskComment } from '../types';

export const fetchTaskComments = async (taskId: string): Promise<TaskComment[]> => {
    const res = await apiGet<PaginatedResponse<TaskComment>>('task-comments/', { task_id: taskId });
    return res.results;
};

export const addTaskComment = async (
    data: Omit<TaskComment, 'id' | 'createdAt'>
): Promise<TaskComment> => {
    return apiPost<TaskComment>('task-comments/', {
        task: data.taskId,
        author_name: data.authorName,
        author_photo: data.authorPhoto || '',
        body: data.body,
    });
};

export const deleteTaskComment = async (commentId: string): Promise<void> => {
    await apiDelete(`task-comments/${commentId}/`);
};

// --- Legacy aliases used by existing components ---
export const addComment = addTaskComment;

export const fetchCommentsByNotificationId = async (notificationId: string): Promise<TaskComment[]> => {
    const res = await apiGet<PaginatedResponse<TaskComment>>('task-comments/', { notification_id: notificationId });
    return res.results;
};
