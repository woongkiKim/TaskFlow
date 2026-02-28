// src/types/task.ts
// Task-related types and constants

// --- Task Types ---
export const TASK_TYPES = ['task', 'bug', 'feature', 'design', 'content', 'handoff', 'devops', 'other'] as const;
export type TaskType = typeof TASK_TYPES[number];

export const PRIORITY_LEVELS = ['P0', 'P1', 'P2', 'P3'] as const;
export type PriorityLevel = typeof PRIORITY_LEVELS[number];

export const STATUS_PRESETS = ['todo', 'inprogress', 'in-review', 'analysis-required', 'handed-off', 'done'] as const;

export const TASK_TYPE_CONFIG: Record<TaskType, { label: string; icon: string; color: string }> = {
  task: { label: 'Task', icon: '📋', color: '#3b82f6' },
  bug: { label: 'Bug', icon: '🐛', color: '#ef4444' },
  feature: { label: 'Feature', icon: '✨', color: '#8b5cf6' },
  design: { label: 'Design', icon: '🎨', color: '#ec4899' },
  content: { label: 'Content', icon: '📝', color: '#f59e0b' },
  handoff: { label: 'Handoff', icon: '🤝', color: '#06b6d4' },
  devops: { label: 'DevOps', icon: '⚙️', color: '#6366f1' },
  other: { label: 'Other', icon: '📌', color: '#64748b' },
};

export const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; color: string; bgColor: string }> = {
  P0: { label: 'P0 — Critical', color: '#dc2626', bgColor: '#fef2f2' },
  P1: { label: 'P1 — High', color: '#ea580c', bgColor: '#fff7ed' },
  P2: { label: 'P2 — Medium', color: '#ca8a04', bgColor: '#fefce8' },
  P3: { label: 'P3 — Low', color: '#6b7280', bgColor: '#f9fafb' },
};

/** Normalize old priority values (high/medium/low) to P0-P3 */
export const normalizePriority = (p?: string): PriorityLevel | undefined => {
  if (!p) return undefined;
  if (p === 'high') return 'P0';
  if (p === 'medium') return 'P1';
  if (p === 'low') return 'P2';
  if (PRIORITY_LEVELS.includes(p as PriorityLevel)) return p as PriorityLevel;
  return undefined;
};

// --- Issue Estimates ---
export const ESTIMATE_POINTS = [0, 1, 2, 3, 5, 8, 13, 21] as const;
export type EstimatePoint = typeof ESTIMATE_POINTS[number];

export const ESTIMATE_CONFIG: Record<EstimatePoint, { label: string; color: string; bgColor: string }> = {
  0: { label: 'None', color: '#94a3b8', bgColor: '#f1f5f9' },
  1: { label: 'Trivial', color: '#22c55e', bgColor: '#f0fdf4' },
  2: { label: 'Small', color: '#3b82f6', bgColor: '#eff6ff' },
  3: { label: 'Medium', color: '#8b5cf6', bgColor: '#f5f3ff' },
  5: { label: 'Large', color: '#f59e0b', bgColor: '#fffbeb' },
  8: { label: 'XL', color: '#f97316', bgColor: '#fff7ed' },
  13: { label: 'XXL', color: '#ef4444', bgColor: '#fef2f2' },
  21: { label: 'Epic', color: '#dc2626', bgColor: '#fef2f2' },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'todo': { label: 'To Do', color: '#6b7280', bgColor: '#f3f4f6' },
  'inprogress': { label: 'In Progress', color: '#2563eb', bgColor: '#eff6ff' },
  'in-review': { label: 'In Review', color: '#d97706', bgColor: '#fffbeb' },
  'analysis-required': { label: 'Analysis Required', color: '#7c3aed', bgColor: '#f5f3ff' },
  'handed-off': { label: 'Handed Off', color: '#0891b2', bgColor: '#ecfeff' },
  'done': { label: 'Complete', color: '#16a34a', bgColor: '#f0fdf4' },
};

// --- Issue Relations ---
export const RELATION_TYPES = ['blocks', 'blocked_by', 'relates_to', 'duplicates', 'duplicate_of'] as const;
export type RelationType = typeof RELATION_TYPES[number];

export const RELATION_TYPE_CONFIG: Record<RelationType, { label: string; icon: string; color: string; inverse: RelationType }> = {
  blocks: { label: 'Blocks', icon: '🚫', color: '#ef4444', inverse: 'blocked_by' },
  blocked_by: { label: 'Blocked by', icon: '⛔', color: '#f97316', inverse: 'blocks' },
  relates_to: { label: 'Relates to', icon: '🔗', color: '#6366f1', inverse: 'relates_to' },
  duplicates: { label: 'Duplicates', icon: '📋', color: '#8b5cf6', inverse: 'duplicate_of' },
  duplicate_of: { label: 'Duplicate of', icon: '📋', color: '#8b5cf6', inverse: 'duplicates' },
};

// --- Interfaces ---
export interface TaskOwner {
  uid: string;
  name: string;
  photo?: string;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
  assigneeName?: string;
}

export interface TaskRelation {
  type: RelationType;
  targetTaskId: string;
  targetTaskCode?: string;
  targetTaskText?: string;
}

export interface Task {
  id: string;
  taskCode?: string;
  text: string;
  completed: boolean;
  status?: string;
  priority?: string;
  type?: TaskType;
  description?: string;
  startDate?: string;
  dueDate?: string;
  subtasks?: Subtask[];
  category?: string;
  categoryColor?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  tags?: string[];
  order?: number;
  projectId?: string;
  workspaceId?: string;
  teamGroupId?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhoto?: string;
  owners?: TaskOwner[];
  sprintId?: string;
  blockedBy?: string[];
  scope?: 'personal' | 'work';
  ownerUids?: string[];
  blockerStatus?: 'none' | 'blocked';
  blockerDetail?: string;
  nextAction?: string;
  links?: string[];
  delayPeriod?: string;
  delayReason?: string;
  aiUsage?: string;
  relations?: TaskRelation[];
  estimate?: number;
  parentTaskId?: string;
  parentTaskText?: string;
  triageStatus?: 'pending' | 'accepted' | 'declined' | 'snoozed';
  archived?: boolean;
  totalTimeSpent?: number;
  recurringConfig?: { frequency: 'daily' | 'weekly' | 'monthly'; interval: number; endDate?: string };
  reminders?: unknown[];
  attachments?: unknown[];
}

// --- Time Entry ---
export interface TimeEntry {
  id: string;
  taskId: string;
  workspaceId?: string;
  userId: string;
  userName: string;
  type: 'pomodoro' | 'manual';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  note?: string;
  createdAt?: unknown;
}

// --- Task Comments ---
export interface TaskComment {
  id: string;
  taskId?: string;
  notificationId?: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  body: string;
  createdAt: string;
}

// --- Issue Templates ---
export const TEMPLATE_ICONS = ['📋', '🐛', '✨', '🎨', '📝', '🤝', '⚙️', '🚀', '🔧', '💡', '📊', '🧪'] as const;

export interface IssueTemplate {
  id: string;
  name: string;
  icon: string;
  description?: string;
  titlePattern?: string;
  defaultDescription?: string;
  defaultType?: TaskType;
  defaultPriority?: PriorityLevel;
  defaultTags?: string[];
  defaultCategory?: string;
  defaultCategoryColor?: string;
  defaultBlockerStatus?: 'none' | 'blocked';
  projectId?: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
