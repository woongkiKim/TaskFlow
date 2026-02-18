import {
  collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc,
} from "firebase/firestore";
import { db } from '../FBase';
import type { ProjectUpdate } from '../types';

const COLLECTION_NAME = "projectUpdates";

export const fetchProjectUpdates = async (projectId: string): Promise<ProjectUpdate[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("projectId", "==", projectId),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectUpdate));
  } catch (e) {
    console.error("Error fetching project updates:", e);
    return [];
  }
};

export const createProjectUpdate = async (
  data: Omit<ProjectUpdate, 'id'>
): Promise<ProjectUpdate> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
  return { id: docRef.id, ...data };
};

export const deleteProjectUpdate = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};
