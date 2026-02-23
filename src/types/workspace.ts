// src/types/workspace.ts
// Workspace, Project, Sprint, Invitation related types

import type { GitHubRepo } from './github';

// --- Workspace Roles ---
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

// --- Interfaces ---
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
  githubConfig?: {
    accessToken?: string;
    lastSyncedAt?: string;
  };
  integrations?: import('./integrations').WorkspaceIntegrations;
  createdAt: string;
}

/** Backward-compatible alias */
export type Team = Workspace;

export interface TeamGroup {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  leaderId?: string;
  memberIds: string[];
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  order: number;
}

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
  taskCounter?: number;
  initiativeId?: string;
  startDate?: string;
  targetDate?: string;
  status?: 'active' | 'completed' | 'paused' | 'planned';
  description?: string;
  githubRepo?: GitHubRepo;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  type: 'sprint' | 'milestone' | 'phase';
  status: 'planning' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
  order: number;
  parentId?: string;
  linkedSprintIds?: string[];
  kanbanColumns?: KanbanColumn[];
  createdAt: string;
  scope?: 'team' | 'personal' | 'company';
  dependsOn?: string[];
}

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
