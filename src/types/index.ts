// src/types/index.ts

// --- Constants ---
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

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'todo': { label: 'To Do', color: '#6b7280', bgColor: '#f3f4f6' },
  'inprogress': { label: 'In Progress', color: '#2563eb', bgColor: '#eff6ff' },
  'in-review': { label: 'In Review', color: '#d97706', bgColor: '#fffbeb' },
  'analysis-required': { label: 'Analysis Required', color: '#7c3aed', bgColor: '#f5f3ff' },
  'handed-off': { label: 'Handed Off', color: '#0891b2', bgColor: '#ecfeff' },
  'done': { label: 'Complete', color: '#16a34a', bgColor: '#f0fdf4' },
};

// --- Workspace ---
export interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  type: 'personal' | 'team' | 'organization';
  members: TeamMember[];
  memberUids?: string[];
  createdBy: string;
  inviteCode: string;
  createdAt: string;
}

/** Backward-compatible alias */
export type Team = Workspace;

// --- Team Group (organization 전용) ---
export interface TeamGroup {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  memberIds: string[];
  createdAt: string;
}

// --- Project ---
export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  teamGroupId?: string;
  color: string;
  icon?: string;
  createdBy: string;
  createdAt: string;
  kanbanColumns?: KanbanColumn[];
  taskCounter?: number; // for T-XXX auto-increment
}

export interface KanbanColumn {
  id: string; // e.g. 'todo', 'inprogress', 'done', 'custom_123'
  title: string;
  color: string;
  order: number;
}

// --- Sprint / Milestone ---
export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  type: 'sprint' | 'milestone' | 'phase';
  status: 'planning' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
  order: number;
  parentId?: string;           // Sprint → Phase containment
  linkedSprintIds?: string[];  // Milestone tracks these Sprint/Phase IDs
  kanbanColumns?: KanbanColumn[];
  createdAt: string;
}

// --- Invitation ---
export interface Invitation {
  id: string;
  workspaceId: string;
  type: 'email' | 'link';
  email?: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

// --- Task Owner ---
export interface TaskOwner {
  uid: string;
  name: string;
  photo?: string;
}

// --- Task ---
export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  taskCode?: string;         // "T-017" human-readable ID
  text: string;
  completed: boolean;
  status?: string;
  priority?: string;         // P0 | P1 | P2 | P3 (or legacy high/medium/low)
  type?: TaskType;
  description?: string;
  dueDate?: string;
  subtasks?: Subtask[];
  category?: string;
  categoryColor?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
  tags?: string[];

  // Custom ordering (from feature/kim)
  order?: number;

  // Multi-user
  projectId?: string;
  workspaceId?: string;
  teamGroupId?: string;
  assigneeId?: string;       // legacy single assignee
  assigneeName?: string;
  assigneePhoto?: string;
  owners?: TaskOwner[];      // multiple owners

  // Sprint
  sprintId?: string;
  blockedBy?: string[];      // task IDs

  // Scope: personal vs work (for To-Do tab filtering)
  scope?: 'personal' | 'work';
  ownerUids?: string[];      // flat UID array for Firestore array-contains queries

  // Enterprise fields
  blockerStatus?: 'none' | 'blocked';
  blockerDetail?: string;    // "What is needed?"
  nextAction?: string;       // "Who/What/When"
  links?: string[];          // Doc/Figma URLs
  delayPeriod?: string;      // e.g. "3 Days"
  delayReason?: string;      // notes
  aiUsage?: string;          // AI tool usage notes
}

// --- Decision Log ---
export interface Decision {
  id: string;
  decisionCode: string;        // "D-001"
  date: string;
  summary: string;             // The "verdict"
  context: string;             // Background
  decider: string;             // Who decided
  deciderName: string;
  affectedTaskIds: string[];   // ["T-005", "T-008"]
  followUpAction: string;      // "Who/What/When"
  referenceLink?: string;
  mentions?: { uid: string; name: string; photo?: string }[];  // tagged members
  workspaceId: string;
  projectId?: string;
  createdAt: string;
  notes?: string;
}

// --- Handoff Tracker ---
export const HANDOFF_TYPES = ['bug_fix', 'feature', 'design_review', 'qa_review', 'deployment'] as const;
export type HandoffType = typeof HANDOFF_TYPES[number];

export const HANDOFF_TYPE_CONFIG: Record<HandoffType, { label: string; icon: string; color: string }> = {
  bug_fix: { label: 'Bug Fix', icon: '🐛', color: '#ef4444' },
  feature: { label: 'Feature', icon: '✨', color: '#8b5cf6' },
  design_review: { label: 'Design Review', icon: '🎨', color: '#ec4899' },
  qa_review: { label: 'QA Review', icon: '🧪', color: '#06b6d4' },
  deployment: { label: 'Deployment', icon: '🚀', color: '#10b981' },
};

/** Default checklist items per handoff direction */
export const HANDOFF_CHECKLISTS: Record<string, string[]> = {
  'Design → Dev': ['Figma Link', 'Spec/Copy Confirmed', 'Assets Ready'],
  'QA → Dev': ['Repro Steps', 'Env/Device Info', 'Screenshot/Video'],
  'Dev → QA': ['Build Deployed', 'Test Instructions', 'Known Limitations'],
  'Dev → Design': ['Implemented per Spec', 'Screenshots Attached'],
};

export interface Handoff {
  id: string;
  handoffCode: string;         // "H-001"
  fromTeam: string;
  toTeam: string;
  type: HandoffType;
  ready: boolean;
  readyDate?: string;
  senderUid: string;
  senderName: string;
  receiverUid: string;
  receiverName: string;
  checklist: Record<string, boolean>;
  blockingQuestion?: string;
  nextAction?: string;
  relatedTaskId?: string;
  notes?: string;
  workspaceId: string;
  projectId?: string;
  createdAt: string;
  status: 'pending' | 'ready' | 'completed';
}

// --- Issue / Incident Log ---
export const ISSUE_CATEGORIES = ['internet', 'power', 'hardware', 'software', 'ai_proficiency', 'communication', 'environment', 'access', 'meeting', 'other'] as const;
export type IssueCategory = typeof ISSUE_CATEGORIES[number];

export const ISSUE_CATEGORY_CONFIG: Record<IssueCategory, { label: string; icon: string; color: string }> = {
  internet: { label: 'Internet', icon: '🌐', color: '#3b82f6' },
  power: { label: 'Power', icon: '⚡', color: '#f59e0b' },
  hardware: { label: 'Hardware', icon: '💻', color: '#6366f1' },
  software: { label: 'Software', icon: '🔧', color: '#8b5cf6' },
  ai_proficiency: { label: 'AI Proficiency', icon: '🤖', color: '#06b6d4' },
  communication: { label: 'Communication', icon: '💬', color: '#ec4899' },
  environment: { label: 'Environment', icon: '🏢', color: '#14b8a6' },
  access: { label: 'Access/Auth', icon: '🔑', color: '#f97316' },
  meeting: { label: 'Meeting', icon: '📅', color: '#a855f7' },
  other: { label: 'Other', icon: '📌', color: '#64748b' },
};

export const ISSUE_SCOPES = ['individual', 'team', 'project', 'all'] as const;
export type IssueScope = typeof ISSUE_SCOPES[number];

export const ISSUE_SCOPE_CONFIG: Record<IssueScope, { label: string; icon: string; color: string }> = {
  individual: { label: 'Individual', icon: '👤', color: '#6b7280' },
  team: { label: 'Team', icon: '👥', color: '#3b82f6' },
  project: { label: 'Project', icon: '📁', color: '#8b5cf6' },
  all: { label: 'All', icon: '🌐', color: '#dc2626' },
};

export interface Issue {
  id: string;
  date: string;
  time: string;
  memberUid: string;
  memberName: string;
  category: IssueCategory;
  description: string;
  scope: IssueScope;
  timeLost: string;
  workaround: string;
  status: 'monitoring' | 'resolved' | 'escalated';
  taggedMembers?: { uid: string; name: string; photo?: string }[];  // affected people
  workspaceId: string;
  createdAt: string;
}