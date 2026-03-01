// src/types/index.ts
// Barrel re-export — all types are now organized by domain.
// Existing imports like `from '../types'` continue to work unchanged.

// Domain modules
export * from './task';
export * from './workspace';

// Existing domain-specific modules
export type { GitHubRepo, GitHubIssue } from './github';
export type { WorkspaceIntegrations } from './integrations';

// ──────────────────────────────────────────────
// Types that don't fit neatly into task or workspace
// are kept here to avoid creating too many tiny files.
// ──────────────────────────────────────────────

import type { PriorityLevel } from './task';

// --- Custom Views / Saved Filters ---
export const VIEW_ICONS = ['📋', '🔥', '🎯', '🚀', '⭐', '🐛', '🔧', '📊', '🎨', '💡', '⚡', '🏷️'] as const;
export const VIEW_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'] as const;

import type { TaskType } from './task';

export interface ViewFilter {
  statuses?: string[];
  priorities?: PriorityLevel[];
  types?: TaskType[];
  tags?: string[];
  assigneeIds?: string[];
  hideCompleted?: boolean;
  scope?: 'personal' | 'work';
  hasBlocker?: boolean;
  hasDueDate?: 'overdue' | 'today' | 'thisWeek' | 'any';
  initiativeId?: string;
}

export type ViewMode = 'list' | 'board' | 'calendar' | 'table' | 'timeline' | 'timebox';

export interface CustomView {
  id: string;
  name: string;
  icon: string;
  color: string;
  filters: ViewFilter;
  viewMode: ViewMode;
  projectId: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// --- Ops: Decision / Handoff / Issue ---
export const HANDOFF_TYPES = ['bug_fix', 'feature', 'design_review', 'qa_review', 'deployment'] as const;
export type HandoffType = typeof HANDOFF_TYPES[number];

export const HANDOFF_TYPE_CONFIG: Record<HandoffType, { label: string; icon: string; color: string }> = {
  bug_fix: { label: 'Bug Fix', icon: '🐛', color: '#ef4444' },
  feature: { label: 'Feature', icon: '✨', color: '#8b5cf6' },
  design_review: { label: 'Design Review', icon: '🎨', color: '#ec4899' },
  qa_review: { label: 'QA Review', icon: '🧪', color: '#06b6d4' },
  deployment: { label: 'Deployment', icon: '🚀', color: '#10b981' },
};

export const HANDOFF_CHECKLISTS: Record<string, string[]> = {
  'Design → Dev': ['Figma Link', 'Spec/Copy Confirmed', 'Assets Ready'],
  'QA → Dev': ['Repro Steps', 'Env/Device Info', 'Screenshot/Video'],
  'Dev → QA': ['Build Deployed', 'Test Instructions', 'Known Limitations'],
  'Dev → Design': ['Implemented per Spec', 'Screenshots Attached'],
};

export interface Decision {
  id: string;
  decisionCode: string;
  date: string;
  summary: string;
  context: string;
  decider: string;
  deciderName: string;
  affectedTaskIds: string[];
  followUpAction: string;
  referenceLink?: string;
  mentions?: { uid: string; name: string; photo?: string }[];
  workspaceId: string;
  projectId?: string;
  createdAt: string;
  notes?: string;
}

export interface Handoff {
  id: string;
  handoffCode: string;
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
  taggedMembers?: { uid: string; name: string; photo?: string }[];
  workspaceId: string;
  createdAt: string;
}

// --- Notifications ---
export const NOTIFICATION_TYPES = [
  'task_assigned', 'task_completed', 'task_status_changed', 'task_mentioned',
  'sprint_started', 'sprint_completed', 'task_due_soon', 'task_overdue', 'comment_added',
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
  comment_added: { label: 'New Comment', icon: '💬', color: '#06b6d4' },
};

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  archived: boolean;
  actorUid: string;
  actorName: string;
  actorPhoto?: string;
  recipientUid: string;
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
  startDate?: string;
  targetDate?: string;
  color: string;
  workspaceId: string;
  projectIds: string[];
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
  unit: string;
  linkedTaskIds?: string[];
}

export const OKR_CADENCES = ['quarterly', 'half', 'annual', 'custom'] as const;
export type OkrCadence = typeof OKR_CADENCES[number];

export const OKR_CADENCE_CONFIG: Record<OkrCadence, { label: string; labelKo: string; icon: string; color: string }> = {
  quarterly: { label: 'Quarterly',  labelKo: '분기',   icon: '📅', color: '#6366f1' },
  half:      { label: 'Half-Year',  labelKo: '반기',   icon: '📆', color: '#8b5cf6' },
  annual:    { label: 'Annual',     labelKo: '연간',   icon: '🗓️', color: '#0ea5e9' },
  custom:    { label: 'Custom',     labelKo: '커스텀', icon: '✏️', color: '#64748b' },
};

export interface OkrPeriodOption {
  value: string;
  label: string;
  labelKo: string;
  cadence: OkrCadence;
  year: number;
  startMonth: number;
  endMonth: number;
}

export function generateOkrPeriods(currentYear?: number): OkrPeriodOption[] {
  const year = currentYear ?? new Date().getFullYear();
  const periods: OkrPeriodOption[] = [];

  for (let y = year - 1; y <= year + 2; y++) {
    periods.push({
      value: `FY${y}`, label: `FY${y}`, labelKo: `${y} 회계연도`,
      cadence: 'annual', year: y, startMonth: 1, endMonth: 12,
    });
    periods.push(
      { value: `H1 ${y}`, label: `H1 ${y}`, labelKo: `${y}년 상반기`, cadence: 'half', year: y, startMonth: 1, endMonth: 6 },
      { value: `H2 ${y}`, label: `H2 ${y}`, labelKo: `${y}년 하반기`, cadence: 'half', year: y, startMonth: 7, endMonth: 12 },
    );
    periods.push(
      { value: `Q1 ${y}`, label: `Q1 ${y}`, labelKo: `${y}년 1분기`, cadence: 'quarterly', year: y, startMonth: 1, endMonth: 3 },
      { value: `Q2 ${y}`, label: `Q2 ${y}`, labelKo: `${y}년 2분기`, cadence: 'quarterly', year: y, startMonth: 4, endMonth: 6 },
      { value: `Q3 ${y}`, label: `Q3 ${y}`, labelKo: `${y}년 3분기`, cadence: 'quarterly', year: y, startMonth: 7, endMonth: 9 },
      { value: `Q4 ${y}`, label: `Q4 ${y}`, labelKo: `${y}년 4분기`, cadence: 'quarterly', year: y, startMonth: 10, endMonth: 12 },
    );
  }

  return periods;
}

export function getCurrentPeriod(cadence: OkrCadence = 'quarterly'): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  switch (cadence) {
    case 'annual': return `FY${y}`;
    case 'half': return m <= 6 ? `H1 ${y}` : `H2 ${y}`;
    case 'quarterly':
    default:
      if (m <= 3) return `Q1 ${y}`;
      if (m <= 6) return `Q2 ${y}`;
      if (m <= 9) return `Q3 ${y}`;
      return `Q4 ${y}`;
  }
}

export function getDateRangeForPeriod(periodValue: string): { startDate: string; endDate: string } | null {
  const p = ALL_PERIOD_OPTIONS.find(o => o.value === periodValue);
  if (!p) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(p.year, p.endMonth, 0).getDate();
  return {
    startDate: `${p.year}-${pad(p.startMonth)}-01`,
    endDate: `${p.year}-${pad(p.endMonth)}-${pad(lastDay)}`,
  };
}

const ALL_PERIOD_OPTIONS = generateOkrPeriods();

export interface Objective {
  id: string;
  title: string;
  description?: string;
  period: string;
  startDate?: string;
  endDate?: string;
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

// --- Wiki ---
export type WikiVisibility = 'workspace' | 'private' | 'public' | 'team' | 'members';

export const WIKI_VISIBILITY_CONFIG: Record<WikiVisibility, { label: string; labelKo: string; icon: string; color: string }> = {
  workspace: { label: 'Entire Team', labelKo: '팀 전체', icon: '👥', color: '#3b82f6' },
  private: { label: 'Only me', labelKo: '나만 보기', icon: '🔒', color: '#f59e0b' },
  public: { label: 'Public', labelKo: '공개', icon: '🌐', color: '#10b981' },
  team: { label: 'Specific Team', labelKo: '특정 팀', icon: '🏢', color: '#8b5cf6' },
  members: { label: 'Specific Members', labelKo: '특정 인원', icon: '👤', color: '#ea580c' },
};

export interface WikiDocument {
  id: string;
  title: string;
  content: string;
  icon?: string;
  isFolder?: boolean;
  parentId?: string;
  visibility?: WikiVisibility;
  allowedTeamIds?: string[];
  allowedTeamNames?: string[];
  allowedMemberIds?: string[];
  allowedMemberNames?: string[];
  linkedDocIds?: string[];
  workspaceId: string;
  projectId?: string;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  pinned?: boolean;
  favoritedBy?: string[];
  readBy?: string[];
  comments?: WikiComment[];
  versions?: WikiVersion[];
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentPresence {
  userId: string;
  userName: string;
  userPhoto?: string;
  lastSeen: string;
}

export interface WikiComment {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  body: string;
  createdAt: string;
}

export interface WikiVersion {
  id: string;
  title: string;
  content: string;
  editedBy: string;
  editedByName: string;
  editedAt: string;
}

// --- Automation Rules ---
export interface AutomationTrigger {
  type: 'status_change';
  from?: string;
  to: string;
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
  projectId: string;
  workspaceId: string;
  health: ProjectHealth;
  content: string;
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

// --- Activity Log ---
export type ActivityEntityType = 'task' | 'wiki' | 'project' | 'sprint' | 'okr' | 'member';
export type ActivityAction =
  | 'created' | 'updated' | 'deleted'
  | 'commented' | 'assigned' | 'unassigned'
  | 'status_changed' | 'priority_changed'
  | 'moved' | 'pinned' | 'unpinned'
  | 'favorited' | 'unfavorited'
  | 'completed' | 'reopened'
  | 'archived';

export interface FieldChange {
  field: string;
  displayField?: string;
  from?: string;
  to?: string;
}

export interface ActivityEntry {
  id: string;
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
  metadata?: Record<string, unknown>;
  timestamp: string;
}
