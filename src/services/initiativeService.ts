import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc, query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../FBase';
import type { Initiative } from '../types';

const COLLECTION = 'initiatives';

export const fetchInitiatives = async (workspaceId: string): Promise<Initiative[]> => {
    const q = query(
        collection(db, COLLECTION),
        where("workspaceId", "==", workspaceId),
        orderBy("status", "asc"), // Sort by status or createdAt
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Initiative));
};

export const createInitiative = async (
    data: Omit<Initiative, 'id' | 'createdAt'>
): Promise<Initiative> => {
    const now = Timestamp.now().toDate().toISOString();
    // Remove undefined fields
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
    );
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...cleanData,
        createdAt: now,
    });
    return { id: docRef.id, ...data, createdAt: now } as Initiative;
};

export const updateInitiative = async (
    id: string,
    data: Partial<Omit<Initiative, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), {
        ...data,
        updatedAt: Timestamp.now().toDate().toISOString(),
    });
};

export const deleteInitiative = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
};
