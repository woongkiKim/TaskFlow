import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where,
} from 'firebase/firestore';
import { db } from '../FBase';
import type { Project, KanbanColumn } from '../types';
import { format } from 'date-fns';

const PROJECTS_COLLECTION = 'projects';

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'todo', title: 'To Do', color: '#6366f1', order: 0 },
  { id: 'inprogress', title: 'In Progress', color: '#f59e0b', order: 1 },
  { id: 'done', title: 'Done', color: '#10b981', order: 2 },
];

export const createProject = async (
  name: string, workspaceId: string, color: string, createdBy: string, teamGroupId?: string
): Promise<Project> => {
  const data = {
    name, workspaceId, color, createdBy,
    ...(teamGroupId ? { teamGroupId } : {}),

    createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  };
  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), data);
  return { id: docRef.id, ...data } as Project;
};

export const fetchWorkspaceProjects = async (workspaceId: string): Promise<Project[]> => {
  const snap = await getDocs(query(collection(db, PROJECTS_COLLECTION), where('workspaceId', '==', workspaceId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};

export const updateProject = async (id: string, updates: Partial<Pick<Project, 'name' | 'color' | 'icon' | 'teamGroupId'>>): Promise<void> => {
  await updateDoc(doc(db, PROJECTS_COLLECTION, id), updates);
};

export const deleteProject = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, PROJECTS_COLLECTION, id));
};

export const updateProjectColumns = async (id: string, columns: KanbanColumn[]): Promise<void> => {
  await updateDoc(doc(db, PROJECTS_COLLECTION, id), { kanbanColumns: columns });
};
