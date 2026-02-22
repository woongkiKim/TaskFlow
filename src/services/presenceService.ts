import {
    collection, setDoc, doc, onSnapshot, query, where, deleteDoc, Timestamp
} from 'firebase/firestore';
import { db } from '../FBase';
import type { DocumentPresence } from '../types';

const COLLECTION = 'documentPresence';

/**
 * Updates the user's presence for a specific document.
 */
export const updatePresence = async (
    docId: string, 
    userId: string, 
    userName: string, 
    userPhoto?: string
) => {
    const presenceRef = doc(db, COLLECTION, `${docId}_${userId}`);
    await setDoc(presenceRef, {
        docId,
        userId,
        userName,
        userPhoto: userPhoto || null,
        lastSeen: new Date().toISOString(),
    }, { merge: true });
};

/**
 * Removes the user's presence for a document (e.g., when leaving the page).
 */
export const removePresence = async (docId: string, userId: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION, `${docId}_${userId}`));
    } catch (err) {
        console.error('Failed to remove presence', err);
    }
};

/**
 * Subscribes to the list of active users for a document.
 * Filters out users who haven't been seen in the last 2 minutes.
 */
export const subscribeToPresence = (
    docId: string, 
    onUpdate: (presence: DocumentPresence[]) => void
) => {
    const q = query(
        collection(db, COLLECTION),
        where('docId', '==', docId)
    );

    return onSnapshot(q, (snap) => {
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000;
        
        const presence = snap.docs
            .map(d => d.data() as DocumentPresence & { lastSeen: string })
            .filter(p => new Date(p.lastSeen).getTime() > twoMinutesAgo);
            
        onUpdate(presence);
    });
};
