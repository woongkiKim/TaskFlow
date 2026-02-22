// src/services/invitationService.ts
// InvitationService — now proxied through Django REST API

import api from './apiClient';
import type { Invitation } from '../types';
import { addDays } from 'date-fns';

// ─── Response type ───────────────────────────────────────

interface ApiInvitation {
  id: number;
  workspace: number;
  type: 'email' | 'link';
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: number;
  createdAt: string;
  expiresAt: string;
}

// ─── Mapper ──────────────────────────────────────────────

function mapInvitation(inv: ApiInvitation): Invitation {
  return {
    id: String(inv.id),
    workspaceId: String(inv.workspace),
    type: inv.type,
    email: inv.email || undefined,
    token: inv.token,
    status: inv.status,
    invitedBy: String(inv.invitedBy),
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
  };
}

// ─── API Functions ───────────────────────────────────────

// 1. 이메일 초대 생성
export const createEmailInvite = async (
  workspaceId: string, email: string, _invitedBy: string
): Promise<Invitation> => {
  const data = await api.post<ApiInvitation>('invitations/', {
    workspace: Number(workspaceId),
    type: 'email',
    email,
    expiresAt: addDays(new Date(), 7).toISOString(),
  });
  return mapInvitation(data);
};

// 2. 링크 초대 생성
export const createLinkInvite = async (
  workspaceId: string, _invitedBy: string
): Promise<Invitation> => {
  const data = await api.post<ApiInvitation>('invitations/', {
    workspace: Number(workspaceId),
    type: 'link',
    expiresAt: addDays(new Date(), 7).toISOString(),
  });
  return mapInvitation(data);
};

// 3. 토큰으로 초대 조회
export const findInviteByToken = async (token: string): Promise<Invitation | null> => {
  try {
    const data = await api.get<{ results: ApiInvitation[] }>('invitations/', { token, status: 'pending' });
    const results = data.results || [];
    return results.length > 0 ? mapInvitation(results[0]) : null;
  } catch {
    return null;
  }
};

// 4. 이메일로 pending 초대 확인 (로그인 시 호출)
export const checkPendingInvites = async (email: string): Promise<Invitation[]> => {
  try {
    const data = await api.get<{ results: ApiInvitation[] }>('invitations/', { email, status: 'pending' });
    return (data.results || []).map(mapInvitation);
  } catch {
    return [];
  }
};

// 5. 초대 수락
export const acceptInvite = async (inviteId: string): Promise<void> => {
  await api.patch(`invitations/${inviteId}/`, { status: 'accepted' });
};

// 6. 워크스페이스의 초대 목록
export const fetchWorkspaceInvites = async (workspaceId: string): Promise<Invitation[]> => {
  const data = await api.get<{ results: ApiInvitation[] }>('invitations/', { workspace_id: workspaceId });
  return (data.results || []).map(mapInvitation).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
