// src/services/timeTrackingService.ts
// TimeTrackingService — now proxied through Django REST API

import api from './apiClient';
import type { TimeEntry } from '../types';

interface ApiTimeEntry {
  id: number;
  task: number;
  taskId: string;
  userId: string;
  userName: string;
  type: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  note: string;
  createdAt: string;
}

function mapEntry(e: ApiTimeEntry): TimeEntry {
  return {
    id: String(e.id),
    taskId: e.taskId || String(e.task),
    userId: e.userId,
    userName: e.userName,
    type: e.type as TimeEntry['type'],
    startTime: e.startTime,
    endTime: e.endTime,
    durationMinutes: e.durationMinutes,
    note: e.note || undefined,
  };
}

/** Add a time entry and update the task's totalTimeSpent cache */
export const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> => {
  const body: Record<string, unknown> = {
    task: Number(entry.taskId),
    userId: entry.userId,
    userName: entry.userName,
    type: entry.type || 'manual',
    startTime: entry.startTime,
    endTime: entry.endTime,
    durationMinutes: entry.durationMinutes,
    note: entry.note || '',
  };
  const data = await api.post<ApiTimeEntry>('time-entries/', body);
  return mapEntry(data);
};

/** Fetch time entries for a specific task */
export const fetchTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
  const data = await api.get<{ results: ApiTimeEntry[] }>('time-entries/', { task_id: taskId });
  return (data.results || []).map(mapEntry);
};

/** Fetch time entries for a user within a date range */
export const fetchUserTimeEntries = async (
  userId: string, startDate: string, endDate: string,
): Promise<TimeEntry[]> => {
  const data = await api.get<{ results: ApiTimeEntry[] }>('time-entries/', {
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
  });
  return (data.results || []).map(mapEntry);
};

/** Delete a time entry and adjust the task's totalTimeSpent */
export const deleteTimeEntry = async (entryId: string, _taskId: string, _durationMinutes: number): Promise<void> => {
  await api.delete(`time-entries/${entryId}/`);
};

/** Add a manual time entry */
export const addManualTimeEntry = async (
  taskId: string, userId: string, userName: string,
  durationMinutes: number, note?: string,
): Promise<TimeEntry> => {
  const now = new Date().toISOString();
  return addTimeEntry({
    taskId, userId, userName,
    type: 'manual',
    startTime: now, endTime: now,
    durationMinutes, note,
  });
};
