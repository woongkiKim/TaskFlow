import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc, query, where, arrayUnion, arrayRemove, getDoc,
} from 'firebase/firestore';
import { db } from '../FBase';
import type { Workspace, TeamMember, TeamGroup } from '../types';
import { format } from 'date-fns';

const WS_COLLECTION = 'workspaces';
const TG_COLLECTION = 'teamGroups';

const generateInviteCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(randomValues, v => chars.charAt(v % chars.length)).join('');
};

// --- Workspace ---

export const createWorkspace = async (
    name: string, color: string, type: Workspace['type'],
    user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace> => {
    const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const member: TeamMember = {
        uid: user.uid, displayName: user.displayName || 'User',
        email: user.email || '', photoURL: user.photoURL || undefined,
        role: 'owner', joinedAt: now,
    };
    const data = { name, color, type, members: [member], memberUids: [user.uid], createdBy: user.uid, inviteCode: generateInviteCode(), createdAt: now };
    const docRef = await addDoc(collection(db, WS_COLLECTION), data);
    return { id: docRef.id, ...data };
};

export const fetchUserWorkspaces = async (userId: string): Promise<Workspace[]> => {
    const snap = await getDocs(query(collection(db, WS_COLLECTION), where('memberUids', 'array-contains', userId)));
    const list: Workspace[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Workspace));
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const joinWorkspaceByCode = async (
    inviteCode: string,
    user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace | null> => {
    const snap = await getDocs(query(collection(db, WS_COLLECTION), where('inviteCode', '==', inviteCode.toUpperCase())));
    if (snap.empty) return null;
    const wsDoc = snap.docs[0];
    const wsData = wsDoc.data() as Omit<Workspace, 'id'>;
    if (wsData.members.some(m => m.uid === user.uid)) return { id: wsDoc.id, ...wsData };

    const newMember: TeamMember = {
        uid: user.uid, displayName: user.displayName || 'User',
        email: user.email || '', photoURL: user.photoURL || undefined,
        role: 'member', joinedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };
    await updateDoc(doc(db, WS_COLLECTION, wsDoc.id), { members: arrayUnion(newMember), memberUids: arrayUnion(user.uid) });
    return { id: wsDoc.id, ...wsData, members: [...wsData.members, newMember] };
};

export const joinWorkspaceByInvite = async (
    workspaceId: string,
    user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<Workspace | null> => {
    const wsDocRef = doc(db, WS_COLLECTION, workspaceId);
    const wsSnap = await getDoc(wsDocRef);
    if (!wsSnap.exists()) return null;
    const wsData = wsSnap.data() as Omit<Workspace, 'id'>;
    if (wsData.members.some(m => m.uid === user.uid)) return { id: wsSnap.id, ...wsData };

    const newMember: TeamMember = {
        uid: user.uid, displayName: user.displayName || 'User',
        email: user.email || '', photoURL: user.photoURL || undefined,
        role: 'member', joinedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };
    await updateDoc(wsDocRef, { members: arrayUnion(newMember), memberUids: arrayUnion(user.uid) });
    return { id: wsSnap.id, ...wsData, members: [...wsData.members, newMember] };
};

export const fetchWorkspaceMembers = async (wsId: string): Promise<TeamMember[]> => {
    const d = await getDoc(doc(db, WS_COLLECTION, wsId));
    return d.exists() ? (d.data().members || []) : [];
};

export const regenerateInviteCode = async (wsId: string): Promise<string> => {
    const newCode = generateInviteCode();
    await updateDoc(doc(db, WS_COLLECTION, wsId), { inviteCode: newCode });
    return newCode;
};

export const updateWorkspace = async (wsId: string, updates: Partial<Pick<Workspace, 'name' | 'color' | 'type'>>): Promise<void> => {
    await updateDoc(doc(db, WS_COLLECTION, wsId), updates);
};

// --- Team Groups ---

export const createTeamGroup = async (workspaceId: string, name: string, color: string): Promise<TeamGroup> => {
    const data = { workspaceId, name, color, memberIds: [], createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss') };
    const docRef = await addDoc(collection(db, TG_COLLECTION), data);
    return { id: docRef.id, ...data };
};

export const fetchTeamGroups = async (workspaceId: string): Promise<TeamGroup[]> => {
    const snap = await getDocs(query(collection(db, TG_COLLECTION), where('workspaceId', '==', workspaceId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamGroup)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const deleteTeamGroup = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, TG_COLLECTION, id));
};

export const updateTeamGroup = async (id: string, updates: Partial<TeamGroup>): Promise<void> => {
    const clean: Record<string, unknown> = {};
    Object.entries(updates).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });
    await updateDoc(doc(db, TG_COLLECTION, id), clean);
};

export const assignMemberToTeam = async (teamGroupId: string, memberUid: string): Promise<void> => {
    await updateDoc(doc(db, TG_COLLECTION, teamGroupId), { memberIds: arrayUnion(memberUid) });
};

export const removeMemberFromTeam = async (teamGroupId: string, memberUid: string): Promise<void> => {
    await updateDoc(doc(db, TG_COLLECTION, teamGroupId), { memberIds: arrayRemove(memberUid) });
};
