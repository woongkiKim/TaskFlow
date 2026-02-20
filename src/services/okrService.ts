import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc, query, where, orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../FBase';
import { proxyIfMock } from './serviceProxy';
import type { Objective } from '../types';

const COLLECTION = 'objectives';

const _fetchObjectives = async (workspaceId: string, period?: string): Promise<Objective[]> => {
    const constraints = [
        where('workspaceId', '==', workspaceId),
        orderBy('createdAt', 'desc'),
    ];
    const q = query(collection(db, COLLECTION), ...constraints);
    const snap = await getDocs(q);
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Objective));
    if (period) results = results.filter(o => o.period === period);
    return results;
};

const _createObjective = async (
    data: Omit<Objective, 'id' | 'createdAt'>
): Promise<Objective> => {
    const now = Timestamp.now().toDate().toISOString();
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
    );
    const docRef = await addDoc(collection(db, COLLECTION), {
        ...cleanData,
        createdAt: now,
    });
    return { id: docRef.id, ...data, createdAt: now } as Objective;
};

const _updateObjective = async (
    id: string,
    data: Partial<Omit<Objective, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>
): Promise<void> => {
    await updateDoc(doc(db, COLLECTION, id), {
        ...data,
        updatedAt: Timestamp.now().toDate().toISOString(),
    });
};

const _deleteObjective = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION, id));
};

export const fetchObjectives = proxyIfMock('fetchObjectives', _fetchObjectives);
export const createObjective = proxyIfMock('createObjective', _createObjective);
export const updateObjective = proxyIfMock('updateObjective', _updateObjective);
export const deleteObjective = proxyIfMock('deleteObjective', _deleteObjective);
