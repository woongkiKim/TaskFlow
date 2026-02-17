import {
    collection, addDoc, getDocs, updateDoc,
    doc, query, where,
} from 'firebase/firestore';
import { db } from '../FBase';
import type { Invitation } from '../types';
import { format, addDays } from 'date-fns';

const INV_COLLECTION = 'invitations';

const generateToken = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomValues, v => chars.charAt(v % chars.length)).join('');
};

// 1. 이메일 초대 생성
export const createEmailInvite = async (
    workspaceId: string, email: string, invitedBy: string
): Promise<Invitation> => {
    const now = new Date();
    const data = {
        workspaceId, type: 'email' as const, email, token: generateToken(),
        status: 'pending' as const, invitedBy,
        createdAt: format(now, 'yyyy-MM-dd HH:mm:ss'),
        expiresAt: format(addDays(now, 7), 'yyyy-MM-dd HH:mm:ss'),
    };
    const docRef = await addDoc(collection(db, INV_COLLECTION), data);
    return { id: docRef.id, ...data };
};

// 2. 링크 초대 생성
export const createLinkInvite = async (
    workspaceId: string, invitedBy: string
): Promise<Invitation> => {
    const now = new Date();
    const data = {
        workspaceId, type: 'link' as const, token: generateToken(),
        status: 'pending' as const, invitedBy,
        createdAt: format(now, 'yyyy-MM-dd HH:mm:ss'),
        expiresAt: format(addDays(now, 7), 'yyyy-MM-dd HH:mm:ss'),
    };
    const docRef = await addDoc(collection(db, INV_COLLECTION), data);
    return { id: docRef.id, ...data };
};

// 3. 토큰으로 초대 조회
export const findInviteByToken = async (token: string): Promise<Invitation | null> => {
    const snap = await getDocs(query(collection(db, INV_COLLECTION), where('token', '==', token), where('status', '==', 'pending')));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Invitation;
};

// 4. 이메일로 pending 초대 확인 (로그인 시 호출)
export const checkPendingInvites = async (email: string): Promise<Invitation[]> => {
    const snap = await getDocs(query(
        collection(db, INV_COLLECTION),
        where('email', '==', email),
        where('status', '==', 'pending')
    ));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invitation));
};

// 5. 초대 수락
export const acceptInvite = async (inviteId: string): Promise<void> => {
    await updateDoc(doc(db, INV_COLLECTION, inviteId), { status: 'accepted' });
};

// 6. 워크스페이스의 초대 목록
export const fetchWorkspaceInvites = async (workspaceId: string): Promise<Invitation[]> => {
    const snap = await getDocs(query(collection(db, INV_COLLECTION), where('workspaceId', '==', workspaceId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Invitation)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
