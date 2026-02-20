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

// --- Workspace Roles (GitHub-style hierarchy) ---
export const ROLE_HIERARCHY = ['viewer', 'triage', 'member', 'maintainer', 'admin', 'owner'] as const;
export type MemberRole = typeof ROLE_HIERARCHY[number];

export const ROLE_CONFIG: Record<MemberRole, { label: string; labelKo: string; color: string; bgColor: string; description: string; descriptionKo: string }> = {
  owner: { label: 'Owner', labelKo: '소유자', color: '#dc2626', bgColor: '#fef2f2', description: 'Full access, can delete workspace', descriptionKo: '전체 접근, 워크스페이스 삭제 가능' },
  admin: { label: 'Admin', labelKo: '관리자', color: '#ea580c', bgColor: '#fff7ed', description: 'Manage workspace settings and members', descriptionKo: '워크스페이스 설정 및 멤버 관리' },
  maintainer: { label: 'Maintainer', labelKo: '메인테이너', color: '#ca8a04', bgColor: '#fefce8', description: 'Manage team, view team reports', descriptionKo: '팀 관리, 팀 리포트 열람' },
  member: { label: 'Member', labelKo: '멤버', color: '#2563eb', bgColor: '#eff6ff', description: 'Create and edit tasks', descriptionKo: '작업 생성 및 편집' },
  triage: { label: 'Triage', labelKo: '분류자', color: '#7c3aed', bgColor: '#f5f3ff', description: 'Label, assign, and close issues', descriptionKo: '이슈 라벨링, 할당, 종료' },
  viewer: { label: 'Viewer', labelKo: '뷰어', color: '#6b7280', bgColor: '#f9fafb', description: 'Read-only access', descriptionKo: '읽기 전용' },
};

/** Check if roleA has at least the same level as roleB */
export const hasRoleLevel = (roleA: MemberRole, minRole: MemberRole): boolean => {
  return ROLE_HIERARCHY.indexOf(roleA) >= ROLE_HIERARCHY.indexOf(minRole);
};

// --- Workspace ---
export interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: MemberRole;
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
  leaderId?: string;
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
  initiativeId?: string; // Links project to a strategic initiative
  startDate?: string;
  targetDate?: string;
  status?: 'active' | 'completed' | 'paused' | 'planned';
  description?: string;
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
  scope?: 'team' | 'personal' | 'company';  // Who owns this iteration
  dependsOn?: string[];                       // Sprint IDs that must complete before this starts
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

export interface TaskRelation {
  type: RelationType;
  targetTaskId: string;
  targetTaskCode?: string;  // cached for display
  targetTaskText?: string;  // cached for display
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

  // Issue Relations
  relations?: TaskRelation[];

  // Estimate (story points)
  estimate?: number;

  // Sub-issue hierarchy
  parentTaskId?: string;     // parent task ID (makes this a sub-issue)
  parentTaskText?: string;   // parent task title for display

  // Triage
  triageStatus?: 'pending' | 'accepted' | 'declined' | 'snoozed';

  // Archive
  archived?: boolean;

  // Time Tracking
  totalTimeSpent?: number;  // cached total in minutes
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
  createdAt?: unknown;      // Firestore Timestamp or ISO string
}

// --- Custom Views / Saved Filters ---
export const VIEW_ICONS = ['📋', '🔥', '🎯', '🚀', '⭐', '🐛', '🔧', '📊', '🎨', '💡', '⚡', '🏷️'] as const;
export const VIEW_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'] as const;

export interface ViewFilter {
  statuses?: string[];         // e.g. ['todo', 'inprogress']
  priorities?: PriorityLevel[];// e.g. ['P0', 'P1']
  types?: TaskType[];          // e.g. ['bug', 'feature']
  tags?: string[];             // e.g. ['frontend', 'urgent']
  assigneeIds?: string[];      // filter by specific owners
  hideCompleted?: boolean;     // hide done tasks
  scope?: 'personal' | 'work';
  hasBlocker?: boolean;        // only blocked tasks
  hasDueDate?: 'overdue' | 'today' | 'thisWeek' | 'any';
  initiativeId?: string;       // filter by strategic initiative
}

export interface CustomView {
  id: string;
  name: string;
  icon: string;                // emoji
  color: string;               // hex
  filters: ViewFilter;
  viewMode?: 'list' | 'board' | 'calendar' | 'table';

  // Scope
  projectId: string;           // which project this view belongs to
  workspaceId: string;
  createdBy: string;           // uid of creator
  createdAt: string;
  updatedAt?: string;
}

// --- Issue Templates ---
export const TEMPLATE_ICONS = ['📋', '🐛', '✨', '🎨', '📝', '🤝', '⚙️', '🚀', '🔧', '💡', '📊', '🧪'] as const;

export interface IssueTemplate {
  id: string;
  name: string;                // e.g. "Bug Report", "Feature Request"
  icon: string;                // emoji
  description?: string;        // Template description for users

  // Pre-filled fields
  titlePattern?: string;       // e.g. "[Bug] ", "[Feature] "
  defaultDescription?: string; // Markdown body template
  defaultType?: TaskType;
  defaultPriority?: PriorityLevel;
  defaultTags?: string[];
  defaultCategory?: string;
  defaultCategoryColor?: string;
  defaultBlockerStatus?: 'none' | 'blocked';

  // Scope
  projectId?: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
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

// --- Notification (Inbox) ---
export const NOTIFICATION_TYPES = [
  'task_assigned',       // 태스크가 나에게 할당됨
  'task_completed',      // 내가 할당된 태스크가 완료됨
  'task_status_changed', // 내 태스크 상태 변경
  'task_mentioned',      // 태스크에서 멘션됨
  'sprint_started',      // 스프린트가 시작됨
  'sprint_completed',    // 스프린트가 완료됨
  'task_due_soon',       // 마감일 임박
  'task_overdue',        // 마감일 초과
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; icon: string; color: string }> = {
  task_assigned: { label: 'Task Assigned', icon: '👤', color: '#6366f1' },
  task_completed: { label: 'Task Completed', icon: '✅', color: '#10b981' },
  task_status_changed: { label: 'Status Changed', icon: '🔄', color: '#3b82f6' },
  task_mentioned: { label: 'Mentioned', icon: '💬', color: '#f59e0b' },
  sprint_started: { label: 'Sprint Started', icon: '🚀', color: '#8b5cf6' },
  sprint_completed: { label: 'Sprint Completed', icon: '🏁', color: '#10b981' },
  task_due_soon: { label: 'Due Soon', icon: '⏰', color: '#f97316' },
  task_overdue: { label: 'Overdue', icon: '🔴', color: '#ef4444' },
};

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  archived: boolean;

  // Who triggered
  actorUid: string;
  actorName: string;
  actorPhoto?: string;

  // Target user
  recipientUid: string;

  // Context
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskText?: string;
  sprintId?: string;
  sprintName?: string;

  createdAt: string;
}

// --- Initiatives ---
export interface Initiative {
  id: string;
  name: string;
  description?: string;
  status: 'planned' | 'active' | 'completed' | 'canceled';
  targetDate?: string;
  color: string;

  // Relations
  workspaceId: string;
  projectIds: string[]; // Projects belonging to this initiative

  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export const INITIATIVE_STATUS_CONFIG: Record<Initiative['status'], { label: string; color: string }> = {
  planned: { label: 'Planned', color: '#94a3b8' },
  active: { label: 'Active', color: '#3b82f6' },
  completed: { label: 'Completed', color: '#10b981' },
  canceled: { label: 'Canceled', color: '#ef4444' },
};

// --- OKR ---
export interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;              // '%', '건', '점', '$' etc.
  linkedTaskIds?: string[];
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  period: string;            // 'Q1 2026', 'Q2 2026' etc.
  status: 'draft' | 'active' | 'completed' | 'canceled';
  ownerId: string;
  ownerName: string;
  keyResults: KeyResult[];
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export const OKR_STATUS_CONFIG: Record<Objective['status'], { label: string; labelKo: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', labelKo: '초안', color: '#94a3b8', bgColor: '#f1f5f9' },
  active: { label: 'Active', labelKo: '진행중', color: '#3b82f6', bgColor: '#eff6ff' },
  completed: { label: 'Completed', labelKo: '완료', color: '#10b981', bgColor: '#ecfdf5' },
  canceled: { label: 'Canceled', labelKo: '취소', color: '#ef4444', bgColor: '#fef2f2' },
};

// --- Automation Rules ---
export interface AutomationTrigger {
  type: 'status_change';
  from?: string;  // Optional: specific source status (null = any)
  to: string;     // Required: target status
}

export type AutomationAction =
  | { type: 'assign_user'; userId: string; userName?: string; userPhoto?: string }
  | { type: 'add_label'; label: string; labelColor?: string }
  | { type: 'set_priority'; priority: PriorityLevel };

export interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  isEnabled: boolean;
  createdBy: string;
  createdAt: string;
}

// --- Project Updates ---
export type ProjectHealth = 'on_track' | 'at_risk' | 'off_track';

export interface ProjectUpdate {
  id: string;
  projectId: string;     // or initiativeId
  workspaceId: string;
  health: ProjectHealth;
  content: string;       // markdown/text body
  createdBy: string;
  createdByName?: string;
  createdByPhoto?: string;
  createdAt: string;
}

export const PROJECT_HEALTH_CONFIG: Record<ProjectHealth, { label: string; color: string; emoji: string }> = {
  on_track: { label: 'On Track', color: '#10b981', emoji: '🟢' },
  at_risk:  { label: 'At Risk',  color: '#f59e0b', emoji: '🟡' },
  off_track:{ label: 'Off Track',color: '#ef4444', emoji: '🔴' },
};

// --- Task Comments / Activity ---
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

