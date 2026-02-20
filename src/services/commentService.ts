// src/services/commentService.ts
// In-memory comment store for now; plug into Firestore / mock as needed.

import type { TaskComment } from '../types';

const comments: TaskComment[] = [];

/** Add a comment (returns the created comment) */
export async function addComment(comment: Omit<TaskComment, 'id' | 'createdAt'>): Promise<TaskComment> {
  const entry: TaskComment = {
    ...comment,
    id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  comments.unshift(entry); // newest first
  return entry;
}

/** Fetch comments for a given task */
export async function fetchCommentsByTaskId(taskId: string): Promise<TaskComment[]> {
  return comments.filter(c => c.taskId === taskId);
}

/** Fetch comments for a given notification */
export async function fetchCommentsByNotificationId(notificationId: string): Promise<TaskComment[]> {
  return comments.filter(c => c.notificationId === notificationId);
}

/** Fetch all comments (for debugging) */
export async function fetchAllComments(): Promise<TaskComment[]> {
  return [...comments];
}
