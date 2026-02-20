import {
  collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, Timestamp, updateDoc, increment,
} from "firebase/firestore";
import type { TimeEntry } from '../types';
import { db } from '../FBase';

const COLLECTION_NAME = "timeEntries";

/** Add a time entry and update the task's totalTimeSpent cache */
export const addTimeEntry = async (entry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...entry,
    createdAt: Timestamp.now(),
  });

  // Update cached totalTimeSpent on the task document
  try {
    const taskRef = doc(db, "tasks", entry.taskId);
    await updateDoc(taskRef, {
      totalTimeSpent: increment(entry.durationMinutes),
    });
  } catch {
    // Task update is best-effort (cache)
  }

  return { ...entry, id: docRef.id };
};

/** Fetch time entries for a specific task */
export const fetchTimeEntries = async (taskId: string): Promise<TimeEntry[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("taskId", "==", taskId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
};

/** Fetch time entries for a user within a date range */
export const fetchUserTimeEntries = async (
  userId: string,
  startDate: string,
  endDate: string,
): Promise<TimeEntry[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    where("startTime", ">=", startDate),
    where("startTime", "<=", endDate),
    orderBy("startTime", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TimeEntry));
};

/** Delete a time entry and adjust the task's totalTimeSpent */
export const deleteTimeEntry = async (entryId: string, taskId: string, durationMinutes: number): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, entryId));

  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      totalTimeSpent: increment(-durationMinutes),
    });
  } catch {
    // Best-effort cache update
  }
};

/** Add a manual time entry */
export const addManualTimeEntry = async (
  taskId: string,
  userId: string,
  userName: string,
  durationMinutes: number,
  note?: string,
): Promise<TimeEntry> => {
  const now = new Date().toISOString();
  return addTimeEntry({
    taskId,
    userId,
    userName,
    type: 'manual',
    startTime: now,
    endTime: now,
    durationMinutes,
    note,
  });
};
