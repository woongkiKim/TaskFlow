// src/services/workspaceService.ts
// WorkspaceService — now proxied through Django REST API
// (previously: direct Firestore calls)

import api from './apiClient';
import type { Workspace, TeamMember, TeamGroup, MemberRole } from '../types';
// import { format } from 'date-fns';

// ─── Response types (DRF camelCase via djangorestframework-camel-case) ───

interface ApiWorkspaceMember {
  id: number;
  workspace: number;
  user: number;
  displayName: string;
  email: string;
  photoUrl: string;
  role: MemberRole;
  joinedAt: string;
}

interface ApiWorkspace {
  id: number;
  name: string;
  color: string;
  type: 'personal' | 'team' | 'organization';
  createdBy: number;
  inviteCode: string;
  githubConfig: Record<string, unknown>;
  integrations: Record<string, unknown>;
  createdAt: string;
  members: ApiWorkspaceMember[];
}

interface ApiTeamGroup {
  id: number;
  workspace: number;
  name: string;
  color: string;
  leader: number | null;
  memberIds: number[];
  createdAt: string;
}

// ─── Mappers ─────────────────────────────────────────────

function mapMember(m: ApiWorkspaceMember): TeamMember {
  return {
    uid: String(m.user),
    displayName: m.displayName,
    email: m.email,
    photoURL: m.photoUrl || undefined,
    role: m.role,
    joinedAt: m.joinedAt,
  };
}

function mapWorkspace(ws: ApiWorkspace): Workspace {
  return {
    id: String(ws.id),
    name: ws.name,
    color: ws.color,
    type: ws.type,
    members: (ws.members || []).map(mapMember),
    memberUids: (ws.members || []).map(m => String(m.user)),
    createdBy: String(ws.createdBy),
    inviteCode: ws.inviteCode,
    createdAt: ws.createdAt,
  };
}

function mapTeamGroup(tg: ApiTeamGroup): TeamGroup {
  return {
    id: String(tg.id),
    workspaceId: String(tg.workspace),
    name: tg.name,
    color: tg.color,
    leaderId: tg.leader ? String(tg.leader) : undefined,
    memberIds: (tg.memberIds || []).map(String),
    createdAt: tg.createdAt,
  };
}

// ─── API Functions ───────────────────────────────────────

/**
 * Fetch all workspaces the current user is a member of.
 */
export const fetchUserWorkspaces = async (_userId: string): Promise<Workspace[]> => {
  const data = await api.get<{ results: ApiWorkspace[] }>('workspaces/');
  const list = (data.results || []).map(mapWorkspace);
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

/**
 * Create a new workspace.
 */
export const createWorkspace = async (
  name: string, color: string, type: Workspace['type'],
  _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace> => {
  const data = await api.post<ApiWorkspace>('workspaces/', { name, color, type });
  return mapWorkspace(data);
};

/**
 * Join a workspace by invite code.
 */
export const joinWorkspaceByCode = async (
  inviteCode: string,
  _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace | null> => {
  try {
    const data = await api.post<ApiWorkspace>('workspaces/join/', { inviteCode: inviteCode.toUpperCase() });
    return mapWorkspace(data);
  } catch {
    return null;
  }
};

/**
 * Join workspace by direct invitation (email invite).
 */
export const joinWorkspaceByInvite = async (
  workspaceId: string,
  _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace | null> => {
  // This is handled via the join endpoint or invitation accept
  try {
    const data = await api.post<ApiWorkspace>(`workspaces/${workspaceId}/join/`, {});
    return mapWorkspace(data);
  } catch {
    return null;
  }
};

/**
 * Fetch workspace members.
 */
export const fetchWorkspaceMembers = async (wsId: string): Promise<TeamMember[]> => {
  const data = await api.get<{ results: ApiWorkspaceMember[] }>('workspace-members/', { workspace_id: wsId });
  return (data.results || []).map(mapMember);
};

/**
 * Regenerate workspace invite code.
 */
export const regenerateInviteCode = async (wsId: string): Promise<string> => {
  const data = await api.post<{ inviteCode: string }>(`workspaces/${wsId}/regenerate_invite_code/`);
  return data.inviteCode;
};

/**
 * Update workspace.
 */
export const updateWorkspace = async (wsId: string, updates: Partial<Workspace>): Promise<void> => {
  await api.patch(`workspaces/${wsId}/`, updates);
};

// ─── Team Groups ─────────────────────────────────────────

export const createTeamGroup = async (workspaceId: string, name: string, color: string): Promise<TeamGroup> => {
  const data = await api.post<ApiTeamGroup>('team-groups/', { workspace: Number(workspaceId), name, color });
  return mapTeamGroup(data);
};

export const fetchTeamGroups = async (workspaceId: string): Promise<TeamGroup[]> => {
  const data = await api.get<{ results: ApiTeamGroup[] }>('team-groups/', { workspace_id: workspaceId });
  return (data.results || []).map(mapTeamGroup);
};

export const deleteTeamGroup = async (id: string): Promise<void> => {
  await api.delete(`team-groups/${id}/`);
};

export const updateTeamGroup = async (id: string, updates: Partial<TeamGroup>): Promise<void> => {
  await api.patch(`team-groups/${id}/`, updates);
};

export const assignMemberToTeam = async (teamGroupId: string, memberUid: string): Promise<void> => {
  // For now, patch the team group members list
  await api.patch(`team-groups/${teamGroupId}/`, { memberIds: [memberUid] });
};

export const removeMemberFromTeam = async (teamGroupId: string, _memberUid: string): Promise<void> => {
  await api.patch(`team-groups/${teamGroupId}/`, {});
};

export const updateMemberRole = async (workspaceId: string, memberUid: string, newRole: MemberRole): Promise<void> => {
  // Find the workspaceMember record and update its role
  const data = await api.get<{ results: ApiWorkspaceMember[] }>('workspace-members/', { workspace_id: workspaceId });
  const member = (data.results || []).find(m => String(m.user) === memberUid);
  if (member) {
    await api.patch(`workspace-members/${member.id}/`, { role: newRole });
  }
};
