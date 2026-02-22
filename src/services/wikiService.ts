import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc, query, where, orderBy, Timestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '../FBase';
import { proxyIfMock } from './serviceProxy';
import type { WikiDocument } from '../types';

const COLLECTION = 'wikiDocuments';

const _fetchWikiDocuments = async (workspaceId: string): Promise<WikiDocument[]> => {
    const q = query(
        collection(db, COLLECTION),
        where('workspaceId', '==', workspaceId),
        orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as WikiDocument));
};

const _createWikiDocument = async (
    data: Omit<WikiDocument, 'id' | 'createdAt'>
): Promise<WikiDocument> => {
    const now = Timestamp.now().toDate().toISOString();
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
    );
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...cleanData,
        createdAt: now,
    });
    return { id: docRef.id, ...data, createdAt: now } as WikiDocument;
};

const _updateWikiDocument = async (
    id: string,
    data: Partial<Omit<WikiDocument, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), {
        ...data,
        updatedAt: Timestamp.now().toDate().toISOString(),
    });
};

const _deleteWikiDocument = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
};

export const fetchWikiDocuments = proxyIfMock('fetchWikiDocuments', _fetchWikiDocuments);
export const createWikiDocument = proxyIfMock('createWikiDocument', _createWikiDocument);
export const updateWikiDocument = proxyIfMock('updateWikiDocument', _updateWikiDocument);
export const deleteWikiDocument = proxyIfMock('deleteWikiDocument', _deleteWikiDocument);

export const subscribeToWikiDocuments = (
    workspaceId: string,
    onUpdate: (docs: WikiDocument[]) => void
) => {
    const q = query(
        collection(db, COLLECTION),
        where('workspaceId', '==', workspaceId),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as WikiDocument));
        onUpdate(docs);
    });
};
