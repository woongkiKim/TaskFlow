// src/services/wikiService.ts
// WikiService — now proxied through Django REST API

import api from './apiClient';
import type { WikiDocument } from '../types';

// ─── Response type ───────────────────────────────────────

interface ApiWikiDocument {
  id: number;
  title: string;
  icon: string;
  content: string;
  blocks: unknown[];
  tags: string[];
  pinned: boolean;
  workspace: number;
  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Mapper ──────────────────────────────────────────────

function mapWiki(w: ApiWikiDocument): WikiDocument {
  return {
    id: String(w.id),
    title: w.title,
    icon: w.icon || '📄',
    content: w.content || '',
    blocks: w.blocks || [],
    tags: w.tags || [],
    pinned: w.pinned || false,
    workspaceId: String(w.workspace),
    createdBy: String(w.createdBy),
    createdByName: w.createdByName || '',
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

// ─── API Functions ───────────────────────────────────────

export const fetchWikiDocuments = async (workspaceId: string): Promise<WikiDocument[]> => {
  const data = await api.get<{ results: ApiWikiDocument[] }>('wiki-documents/', { workspace_id: workspaceId });
  return (data.results || []).map(mapWiki);
};

export const createWikiDocument = async (
  data: Omit<WikiDocument, 'id' | 'createdAt'>
): Promise<WikiDocument> => {
  const body: Record<string, unknown> = {
    title: data.title,
    icon: data.icon || '📄',
    content: data.content || '',
    blocks: data.blocks || [],
    tags: data.tags || [],
    pinned: data.pinned || false,
    workspace: Number(data.workspaceId),
    createdByName: data.createdByName || '',
  };

  const result = await api.post<ApiWikiDocument>('wiki-documents/', body);
  return mapWiki(result);
};

export const updateWikiDocument = async (
  id: string,
  data: Partial<Omit<WikiDocument, 'id' | 'createdAt' | 'workspaceId' | 'createdBy'>>
): Promise<void> => {
  await api.patch(`wiki-documents/${id}/`, data);
};

export const deleteWikiDocument = async (id: string): Promise<void> => {
  await api.delete(`wiki-documents/${id}/`);
};

/**
 * Real-time subscription placeholder.
 * Since Django doesn't support websockets out of the box,
 * we fall back to polling. Returns an unsubscribe function.
 */
export const subscribeToWikiDocuments = (
  workspaceId: string,
  onUpdate: (docs: WikiDocument[]) => void
): (() => void) => {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const docs = await fetchWikiDocuments(workspaceId);
      if (active) onUpdate(docs);
    } catch (e) {
      console.error('[wikiService] poll error:', e);
    }
  };

  // Initial fetch
  poll();
  // Poll every 30 seconds
  const interval = setInterval(poll, 30_000);

  return () => {
    active = false;
    clearInterval(interval);
  };
};
