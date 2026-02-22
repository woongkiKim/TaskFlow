// src/services/timeTrackingService.ts
// Django REST API version
import { apiGet, apiPost, apiDelete, type PaginatedResponse } from './apiClient';
import type { TimeEntry } from '../types';

export const addTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'createdAt'>): Promise<TimeEntry> => {
    return apiPost<TimeEntry>('time-entries/', {
        task: entry.taskId,
        workspace: entry.workspaceId,
        user_name: entry.userName,
        type: entry.type,
        start_time: entry.startTime,
        end_time: entry.endTime,
        duration_minutes: entry.durationMinutes,
        note: entry.note || '',
    });
};

export const fetchTaskTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
    const res = await apiGet<PaginatedResponse<TimeEntry>>('time-entries/', { task_id: taskId });
    return res.results;
};

export const fetchUserTimeEntries = async (_userId: string, workspaceId: string): Promise<TimeEntry[]> => {
    const res = await apiGet<PaginatedResponse<TimeEntry>>('time-entries/', { workspace_id: workspaceId });
    return res.results;
};

export const deleteTimeEntry = async (entryId: string, _taskId?: string, _durationMinutes?: number): Promise<void> => {
    await apiDelete(`time-entries/${entryId}/`);
};

// --- Legacy aliases ---
export const fetchTimeEntries = fetchTaskTimeEntries;

/** Convenience: addManualTimeEntry(taskId, userId, userName, minutes, note) */
export const addManualTimeEntry = async (
    taskId: string, _userId: string, userName: string, durationMinutes: number, note?: string
): Promise<TimeEntry> => {
    return apiPost<TimeEntry>('time-entries/', {
        task: taskId,
        user_name: userName,
        type: 'manual',
        duration_minutes: durationMinutes,
        note: note || '',
    });
};
