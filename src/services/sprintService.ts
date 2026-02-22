import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc, query, where,
} from 'firebase/firestore';
import { db } from '../FBase';
import type { Sprint } from '../types';
import { format } from 'date-fns';

const SPRINTS_COLLECTION = 'sprints';

// 1. 스프린트 생성
export const createSprint = async (
    projectId: string,
    name: string,
    type: Sprint['type'] = 'sprint',
    order: number = 0,
    startDate?: string,
    endDate?: string,
    parentId?: string,
    linkedSprintIds?: string[],
): Promise<Sprint> => {
    const data: Record<string, unknown> = {
        projectId, name, type, status: 'planning' as const,
        order, createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    };
    if (startDate) data.startDate = startDate;
    if (endDate) data.endDate = endDate;
    if (parentId) data.parentId = parentId;
    if (linkedSprintIds && linkedSprintIds.length > 0) data.linkedSprintIds = linkedSprintIds;
    const docRef = await addDoc(collection(db, SPRINTS_COLLECTION), data);
    return { id: docRef.id, ...data } as Sprint;
};

// 2. 프로젝트의 스프린트 목록
export const fetchProjectSprints = async (projectId: string): Promise<Sprint[]> => {
    const snap = await getDocs(query(collection(db, SPRINTS_COLLECTION), where('projectId', '==', projectId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Sprint)).sort((a, b) => a.order - b.order);
};

// 2.1 워크스페이스 전체 스프린트 목록
export const fetchWorkspaceSprints = async (projectIds: string[]): Promise<Sprint[]> => {
    if (projectIds.length === 0) return [];
    // Firestore where 'in' clause supports up to 10-30 items depending on version. 
    // Usually project count is small.
    const results: Sprint[] = [];
    // Chunk by 10
    for (let i = 0; i < projectIds.length; i += 10) {
        const chunk = projectIds.slice(i, i + 10);
        const snap = await getDocs(query(collection(db, SPRINTS_COLLECTION), where('projectId', 'in', chunk)));
        results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as Sprint)));
    }
    return results.sort((a, b) => a.order - b.order);
};

// 3. 스프린트 업데이트
export const updateSprint = async (
    id: string,
    updates: Partial<Pick<Sprint, 'name' | 'status' | 'startDate' | 'endDate' | 'order' | 'type' | 'kanbanColumns' | 'parentId' | 'linkedSprintIds'>>
): Promise<void> => {
    await updateDoc(doc(db, SPRINTS_COLLECTION, id), updates);
};

// 4. 스프린트 삭제
export const deleteSprint = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, SPRINTS_COLLECTION, id));
};
