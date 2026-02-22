// src/services/wikiService.ts
// Django REST API version
import { apiGet, apiPost, apiPatch, apiDelete, type PaginatedResponse } from './apiClient';
import type { WikiDocument } from '../types';

export const fetchWikiDocuments = async (workspaceId: string, projectId?: string): Promise<WikiDocument[]> => {
    const params: Record<string, string> = { workspace_id: workspaceId };
    if (projectId) params.project_id = projectId;
    const res = await apiGet<PaginatedResponse<WikiDocument>>('wiki-documents/', params);
    return res.results;
};

export const createWikiDocument = async (
    data: Omit<WikiDocument, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WikiDocument> => {
    return apiPost<WikiDocument>('wiki-documents/', {
        title: data.title,
        content: data.content || '',
        icon: data.icon || '',
        is_folder: data.isFolder || false,
        parent: data.parentId,
        visibility: data.visibility || 'workspace',
        workspace: data.workspaceId,
        project: data.projectId,
        pinned: data.pinned || false,
        tags: data.tags || [],
    });
};

export const updateWikiDocument = async (id: string, updates: Partial<WikiDocument>): Promise<void> => {
    await apiPatch(`wiki-documents/${id}/`, updates);
};

export const deleteWikiDocument = async (id: string): Promise<void> => {
    await apiDelete(`wiki-documents/${id}/`);
};

export const fetchWikiDocument = async (id: string): Promise<WikiDocument> => {
    return apiGet<WikiDocument>(`wiki-documents/${id}/`);
};

/**
 * Polling-based subscription to wiki documents (replaces Firestore onSnapshot).
 * Returns an unsubscribe function.
 */
export const subscribeToWikiDocuments = (
    workspaceId: string,
    onUpdate: (docs: WikiDocument[]) => void,
    intervalMs = 10000,
): (() => void) => {
    let active = true;
    const poll = async () => {
        if (!active) return;
        try {
            const docs = await fetchWikiDocuments(workspaceId);
            if (active) onUpdate(docs);
        } catch (e) {
            console.error('[Wiki] Polling error:', e);
        }
    };
    poll(); // initial fetch
    const id = setInterval(poll, intervalMs);
    return () => { active = false; clearInterval(id); };
};
