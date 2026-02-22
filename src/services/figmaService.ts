// src/services/figmaService.ts
import type { FigmaFile, FigmaComment } from '../types/integrations';

const FIGMA_API = 'https://api.figma.com/v1';

/**
 * Figma integration service.
 * Uses Figma Personal Access Tokens.
 * Docs: https://www.figma.com/developers/api
 */
export const figmaService = {

  /** Verify token by fetching the authenticated user */
  async verifyToken(token: string): Promise<{ ok: boolean; user?: string; email?: string; error?: string }> {
    try {
      const res = await fetch(`${FIGMA_API}/me`, {
        headers: { 'X-FIGMA-TOKEN': token },
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, user: data.handle, email: data.email };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  /** Fetch a specific Figma file's metadata */
  async fetchFile(fileKey: string, token: string): Promise<FigmaFile | null> {
    try {
      const res = await fetch(`${FIGMA_API}/files/${fileKey}?depth=1`, {
        headers: { 'X-FIGMA-TOKEN': token },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        key: fileKey,
        name: data.name,
        thumbnail_url: data.thumbnailUrl || '',
        last_modified: data.lastModified,
        version: data.version,
      };
    } catch (err) {
      console.error('[FigmaService] fetchFile failed:', err);
      return null;
    }
  },

  /** Fetch recent team/project files */
  async fetchTeamProjects(teamId: string, token: string): Promise<{ id: string; name: string }[]> {
    try {
      const res = await fetch(`${FIGMA_API}/teams/${teamId}/projects`, {
        headers: { 'X-FIGMA-TOKEN': token },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.projects || [];
    } catch (err) {
      console.error('[FigmaService] fetchTeamProjects failed:', err);
      return [];
    }
  },

  /** Fetch files from a Figma project */
  async fetchProjectFiles(projectId: string, token: string): Promise<FigmaFile[]> {
    try {
      const res = await fetch(`${FIGMA_API}/projects/${projectId}/files`, {
        headers: { 'X-FIGMA-TOKEN': token },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.files || []).map((f: { key: string; name: string; thumbnail_url: string; last_modified: string }) => ({
        key: f.key,
        name: f.name,
        thumbnail_url: f.thumbnail_url || '',
        last_modified: f.last_modified,
        version: '',
      }));
    } catch (err) {
      console.error('[FigmaService] fetchProjectFiles failed:', err);
      return [];
    }
  },

  /** Fetch comments on a Figma file */
  async fetchFileComments(fileKey: string, token: string): Promise<FigmaComment[]> {
    try {
      const res = await fetch(`${FIGMA_API}/files/${fileKey}/comments`, {
        headers: { 'X-FIGMA-TOKEN': token },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.comments || []).map((c: FigmaComment) => ({
        id: c.id,
        message: c.message,
        created_at: c.created_at,
        resolved_at: c.resolved_at,
        user: c.user,
        order_id: c.order_id,
      }));
    } catch (err) {
      console.error('[FigmaService] fetchFileComments failed:', err);
      return [];
    }
  },

  /** Get the Figma file embed/view URL */
  getFileUrl(fileKey: string): string {
    return `https://www.figma.com/file/${fileKey}`;
  },

  /** Get the thumbnail URL for embedding */
  getThumbnailUrl(fileKey: string, token: string): string {
    return `${FIGMA_API}/images/${fileKey}?ids=0:0&format=png&svg_include_id=true&_token=${token}`;
  },

  /** Extract file key from a Figma URL */
  parseFileKey(url: string): string | null {
    // Matches: figma.com/file/FILEKEY/... or figma.com/design/FILEKEY/...
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match?.[1] || null;
  },
};
