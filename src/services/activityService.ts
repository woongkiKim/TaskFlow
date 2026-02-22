// src/services/activityService.ts
import {
  collection, addDoc, query, where, orderBy, limit as fbLimit,
  getDocs, Timestamp, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../FBase';
import type { ActivityEntry, ActivityEntityType, ActivityAction, FieldChange } from '../types';
import { proxyIfMock } from './serviceProxy';

const COLLECTION = 'activities';

// ─── Firestore Implementations ───────────────────────

const _fetchActivities = async (
  workspaceId: string,
  opts?: {
    entityType?: ActivityEntityType;
    entityId?: string;
    limit?: number;
  },
): Promise<ActivityEntry[]> => {
  // Build constraints: equality filters (where) MUST come before orderBy in Firestore
  // QueryConstraint[] allows mixing where/orderBy/limit in one array
  const constraints: QueryConstraint[] = [
    where('workspaceId', '==', workspaceId),
  ];
  // Optional narrowing filters (must be before orderBy/limit)
  if (opts?.entityType) constraints.push(where('entityType', '==', opts.entityType));
  if (opts?.entityId) constraints.push(where('entityId', '==', opts.entityId));
  // orderBy + limit after all where clauses (Firestore index requirement)
  constraints.push(orderBy('timestamp', 'desc'));
  constraints.push(fbLimit(opts?.limit ?? 50));

  const snap = await getDocs(query(collection(db, COLLECTION), ...constraints));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityEntry));
};

const _logActivity = async (entry: Omit<ActivityEntry, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...entry,
    timestamp: entry.timestamp || Timestamp.now().toDate().toISOString(),
  });
  return ref.id;
};

// ─── Exported (Proxy-Routed) ─────────────────────────

export const fetchActivities = proxyIfMock('fetchActivities', _fetchActivities);
export const logActivity = proxyIfMock('logActivity', _logActivity);

// ─── Helper: Auto-diff changes ───────────────────────

export const diffChanges = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldLabels?: Record<string, string>,
): FieldChange[] => {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const skip = new Set(['id', 'workspaceId', 'createdAt', 'createdBy', 'createdByName']);

  for (const key of allKeys) {
    if (skip.has(key)) continue;
    const bVal = before[key];
    const aVal = after[key];

    if (JSON.stringify(bVal) === JSON.stringify(aVal)) continue;

    changes.push({
      field: key,
      displayField: fieldLabels?.[key] || key,
      from: bVal != null ? String(bVal) : undefined,
      to: aVal != null ? String(aVal) : undefined,
    });
  }
  return changes;
};

// ─── Helper: Build activity entry ────────────────────

export const buildActivityEntry = (params: {
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  action: ActivityAction;
  workspaceId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  changes?: FieldChange[];
  description?: string;
}): Omit<ActivityEntry, 'id'> => ({
  ...params,
  timestamp: new Date().toISOString(),
});
