// src/services/workspaceService.ts
// Django REST API version — replaces Firestore SDK calls
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { Workspace, TeamMember, TeamGroup, MemberRole } from '../types';

// --- Workspace ---

export const createWorkspace = async (
    name: string, color: string, type: Workspace['type'],
    _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace> => {
    return apiPost<Workspace>('workspaces/', { name, color, type });
};

export const fetchUserWorkspaces = async (_userId: string): Promise<Workspace[]> => {
    const res = await apiGet<PaginatedResponse<Workspace>>('workspaces/');
    return res.results;
};

export const joinWorkspaceByCode = async (
    inviteCode: string,
    _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace | null> => {
    try {
        return await apiPost<Workspace>('workspaces/join/', { invite_code: inviteCode });
    } catch {
        return null;
    }
};

export const joinWorkspaceByInvite = async (
    workspaceId: string,
    _user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace | null> => {
    try {
        // Use the workspace invite code approach or a dedicated endpoint
        return await apiPost<Workspace>(`workspaces/${workspaceId}/join/`, {});
    } catch {
        return null;
    }
};

export const fetchWorkspaceMembers = async (wsId: string): Promise<TeamMember[]> => {
    const res = await apiGet<PaginatedResponse<TeamMember>>('workspace-members/', { workspace_id: wsId });
    return res.results;
};

export const regenerateInviteCode = async (wsId: string): Promise<string> => {
    const res = await apiPost<{ invite_code: string }>(`workspaces/${wsId}/regenerate_invite_code/`, {});
    return res.invite_code;
};

export const updateWorkspace = async (wsId: string, updates: Partial<Workspace>): Promise<void> => {
    await apiPatch(`workspaces/${wsId}/`, updates);
};

// --- Team Groups ---

export const createTeamGroup = async (workspaceId: string, name: string, color: string): Promise<TeamGroup> => {
    return apiPost<TeamGroup>('team-groups/', { workspace: workspaceId, name, color });
};

export const fetchTeamGroups = async (workspaceId: string): Promise<TeamGroup[]> => {
    const res = await apiGet<PaginatedResponse<TeamGroup>>('team-groups/', { workspace_id: workspaceId });
    return res.results;
};

export const deleteTeamGroup = async (id: string): Promise<void> => {
    await apiDelete(`team-groups/${id}/`);
};

export const updateTeamGroup = async (id: string, updates: Partial<TeamGroup>): Promise<void> => {
    await apiPatch(`team-groups/${id}/`, updates);
};

export const assignMemberToTeam = async (teamGroupId: string, memberUid: string): Promise<void> => {
    // Backend should handle adding member to M2M
    const group = await apiGet<TeamGroup>(`team-groups/${teamGroupId}/`);
    const memberIds = [...(group.memberIds || []), memberUid];
    await apiPatch(`team-groups/${teamGroupId}/`, { members: memberIds });
};

export const removeMemberFromTeam = async (teamGroupId: string, memberUid: string): Promise<void> => {
    const group = await apiGet<TeamGroup>(`team-groups/${teamGroupId}/`);
    const memberIds = (group.memberIds || []).filter((id: string) => id !== memberUid);
    await apiPatch(`team-groups/${teamGroupId}/`, { members: memberIds });
};

export const updateMemberRole = async (workspaceId: string, memberUid: string, newRole: MemberRole): Promise<void> => {
    // Find the membership record and update role
    const members = await apiGet<PaginatedResponse<{ id: number; user: string; role: string }>>('workspace-members/', { workspace_id: workspaceId });
    const member = members.results.find(m => String(m.user) === memberUid);
    if (member) {
        await apiPatch(`workspace-members/${member.id}/`, { role: newRole });
    }
};
