// src/services/savedViewService.ts
import { 
    collection, addDoc, getDocs, updateDoc, deleteDoc, 
    doc, query, where, 
} from 'firebase/firestore';
import { db } from '../FBase';
import type { CustomView } from '../types';

const COLLECTION_NAME = 'custom_views';

export const fetchCustomViews = async (workspaceId: string, projectId?: string): Promise<CustomView[]> => {
    let q = query(
        collection(db, COLLECTION_NAME),
        where('workspaceId', '==', workspaceId)
    );

    if (projectId) {
        q = query(q, where('projectId', '==', projectId));
    }

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomView));
};

export const saveCustomView = async (data: Omit<CustomView, 'id' | 'createdAt'>): Promise<CustomView> => {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdAt: now,
        updatedAt: now,
    });
    return { id: docRef.id, ...data, createdAt: now } as CustomView;
};

export const updateCustomView = async (id: string, updates: Partial<CustomView>): Promise<void> => {
    const taskRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(taskRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

export const deleteCustomView = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};
