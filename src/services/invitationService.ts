// src/services/invitationService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { Invitation } from '../types';

export const createEmailInvitation = async (
    workspaceId: string, email: string, _invitedBy: string
): Promise<Invitation> => {
    return apiPost<Invitation>('invitations/', {
        workspace: workspaceId,
        type: 'email',
        email,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
};

export const createLinkInvitation = async (
    workspaceId: string, _invitedBy: string
): Promise<Invitation> => {
    return apiPost<Invitation>('invitations/', {
        workspace: workspaceId,
        type: 'link',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
};

export const findInvitationByToken = async (token: string): Promise<Invitation | null> => {
    try {
        const res = await apiGet<PaginatedResponse<Invitation>>('invitations/', { token });
        const pending = res.results.find(i => i.status === 'pending');
        return pending || null;
    } catch {
        return null;
    }
};

/**
 * Fetch pending invitations for a given email.
 * Called as checkPendingInvites(email) from WorkspaceContext.
 */
export const fetchPendingInvitations = async (email: string): Promise<Invitation[]> => {
    const res = await apiGet<PaginatedResponse<Invitation>>('invitations/', { email, status: 'pending' });
    return res.results;
};

export const acceptInvitation = async (invitationId: string): Promise<void> => {
    await apiPatch(`invitations/${invitationId}/`, { status: 'accepted' });
};

export const fetchWorkspaceInvitations = async (workspaceId: string): Promise<Invitation[]> => {
    const res = await apiGet<PaginatedResponse<Invitation>>('invitations/', { workspace_id: workspaceId });
    return res.results;
};

export const deleteInvitation = async (invitationId: string): Promise<void> => {
    await apiDelete(`invitations/${invitationId}/`);
};

// --- Legacy aliases used by existing components ---
export const createLinkInvite = createLinkInvitation;
export const createEmailInvite = createEmailInvitation;
export const checkPendingInvites = fetchPendingInvitations;
export const acceptInvite = acceptInvitation;
