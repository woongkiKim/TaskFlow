import {
    collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, Timestamp,
} from "firebase/firestore";
import type { IssueTemplate } from '../types';
import { db } from '../FBase';

const COLLECTION = "issueTemplates";

/** Fetch all issue templates for a workspace */
export const fetchIssueTemplates = async (workspaceId: string): Promise<IssueTemplate[]> => {
    try {
        const q = query(
            collection(db, COLLECTION),
            where("workspaceId", "==", workspaceId)
        );
        const snap = await getDocs(q);
        const templates = snap.docs.map(d => ({ id: d.id, ...d.data() } as IssueTemplate));
        // Client-side sort
        return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Failed to fetch issue templates", e);
        return [];
    }
};

/** Create a new issue template */
export const createIssueTemplate = async (
    data: Omit<IssueTemplate, 'id' | 'createdAt'>
): Promise<IssueTemplate> => {
    const now = Timestamp.now().toDate().toISOString();
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...data,
        createdAt: now,
    });
    return { id: docRef.id, ...data, createdAt: now };
};

/** Update an existing issue template */
export const updateIssueTemplate = async (
    id: string,
    data: Partial<Pick<IssueTemplate, 'name' | 'icon' | 'description' | 'titlePattern' | 'defaultDescription' | 'defaultType' | 'defaultPriority' | 'defaultTags' | 'defaultCategory' | 'defaultCategoryColor' | 'defaultBlockerStatus'>>
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), {
        ...data,
        updatedAt: Timestamp.now().toDate().toISOString(),
    });
};

/** Delete an issue template */
export const deleteIssueTemplate = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
};
