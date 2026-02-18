// src/services/customViewService.ts
import {
    collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy,
} from "firebase/firestore";
import type { CustomView, ViewFilter } from '../types';
import { db } from '../FBase';

const COLLECTION = "customViews";

/** Fetch all custom views for a project */
export const fetchCustomViews = async (projectId: string): Promise<CustomView[]> => {
    const q = query(
        collection(db, COLLECTION),
        where("projectId", "==", projectId),
        orderBy("createdAt", "asc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomView));
};

/** Create a new custom view */
export const createCustomView = async (opts: {
    name: string;
    icon: string;
    color: string;
    filters: ViewFilter;
    viewMode?: string;
    projectId: string;
    workspaceId: string;
    createdBy: string;
}): Promise<CustomView> => {
    const data = {
        ...opts,
        createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, COLLECTION), data);
    return { id: docRef.id, ...data } as CustomView;
};

/** Update an existing custom view */
export const updateCustomView = async (
    viewId: string,
    updates: Partial<Pick<CustomView, 'name' | 'icon' | 'color' | 'filters' | 'viewMode'>>,
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, viewId), {
        ...updates,
        updatedAt: new Date().toISOString(),
    });
};

/** Delete a custom view */
export const deleteCustomView = async (viewId: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, viewId));
};
