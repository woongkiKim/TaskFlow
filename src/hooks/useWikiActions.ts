// src/hooks/useWikiActions.ts
import { useCallback } from 'react';
import { toast } from 'sonner';
import { createWikiDocument, updateWikiDocument, deleteWikiDocument } from '../services/wikiService';
import { handleError } from '../utils/errorHandler';
import type { WikiDocument, WikiVersion, WikiComment } from '../types';

interface WikiActionsDeps {
  workspaceId?: string;
  user: { uid: string; displayName?: string | null; photoURL?: string | null } | null;
  lang: string;
  docs: WikiDocument[];
}

export function useWikiActions({ workspaceId, user, lang, docs }: WikiActionsDeps) {
  const handleDelete = useCallback(async (
    id: string,
    onSuccess?: () => void
  ) => {
    try {
      await deleteWikiDocument(id);
      onSuccess?.();
      toast.success(lang === 'ko' ? '삭제되었습니다' : 'Deleted');
    } catch (err) {
      handleError(err, { fallbackMessage: lang === 'ko' ? '삭제에 실패했습니다' : 'Failed to delete document' });
    }
  }, [lang]);

  const handleToggleFavorite = useCallback(async (doc: WikiDocument) => {
    if (!user?.uid) return;
    const favs = doc.favoritedBy || [];
    const newFavs = favs.includes(user.uid) ? favs.filter(id => id !== user.uid) : [...favs, user.uid];
    try {
      await updateWikiDocument(doc.id, { favoritedBy: newFavs });
    } catch (err) {
      handleError(err, { fallbackMessage: lang === 'ko' ? '즐겨잡기 업데이트 실패' : 'Failed to update favorites' });
    }
  }, [user?.uid, lang]);

  const handleTogglePin = useCallback(async (doc: WikiDocument) => {
    try {
      await updateWikiDocument(doc.id, { pinned: !doc.pinned });
    } catch (err) {
      handleError(err, { fallbackMessage: lang === 'ko' ? '고정 업데이트 실패' : 'Failed to update pin' });
    }
  }, [lang]);

  const handleSaveWithVersion = useCallback(async (
    editingDoc: Partial<WikiDocument>,
    curContent: string,
    onSuccess?: () => void,
    onSettled?: () => void
  ) => {
    if (!workspaceId || !user?.uid) {
      onSettled?.();
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        ...editingDoc, content: curContent,
        workspaceId, updatedBy: user.uid,
        updatedByName: user.displayName || '', updatedAt: new Date().toISOString(),
      };
      // Save version snapshot
      if (editingDoc.id) {
        const existingDoc = docs.find(d => d.id === editingDoc.id);
        if (existingDoc) {
          const version: WikiVersion = {
            id: `v_${crypto.randomUUID()}`, title: existingDoc.title,
            content: existingDoc.content || '', editedBy: user.uid,
            editedByName: user.displayName || '', editedAt: new Date().toISOString(),
          };
          const existingVersions = (existingDoc.versions || []).slice(0, 19); // keep 20 max
          payload.versions = [version, ...existingVersions];
        }
        await updateWikiDocument(editingDoc.id, payload);
      } else {
        await createWikiDocument({
          ...payload, createdBy: user.uid, createdByName: user.displayName || '',
        } as WikiDocument);
      }
      onSuccess?.();
      toast.success(lang === 'ko' ? '저장되었습니다' : 'Saved');
    } catch (err) {
      handleError(err, { fallbackMessage: lang === 'ko' ? '저장에 실패했습니다' : 'Failed to save document' });
    } finally {
      onSettled?.();
    }
  }, [workspaceId, user?.uid, user?.displayName, docs, lang]);

  const handleAddComment = useCallback(async (docId: string, commentText: string, onSuccess?: () => void) => {
    if (!commentText.trim() || !user?.uid) return;
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    const newComment: WikiComment = {
      id: `c_${crypto.randomUUID()}`, authorUid: user.uid,
      authorName: user.displayName || '', authorPhoto: user.photoURL || undefined,
      body: commentText.trim(), createdAt: new Date().toISOString(),
    };
    const updatedComments = [...(doc.comments || []), newComment];
    try {
      await updateWikiDocument(docId, { comments: updatedComments } as Partial<WikiDocument>);
      onSuccess?.();
      toast.success(lang === 'ko' ? '댓글이 추가되었습니다' : 'Comment added');
    } catch (err) {
      handleError(err, { fallbackMessage: lang === 'ko' ? '댓글 추가 실패' : 'Failed to add comment' });
    }
  }, [user, docs, lang]);

  const handleMarkAsRead = useCallback(async (docId: string) => {
    if (!user?.uid) return;
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    const readByList = doc.readBy || [];
    if (readByList.includes(user.uid)) return;
    try {
      await updateWikiDocument(docId, { readBy: [...readByList, user.uid] } as Partial<WikiDocument>);
    } catch { /* ignore */ }
  }, [user?.uid, docs]);

  const handleConfirmFolder = useCallback(async (
    folderName: string,
    currentFolderId: string | null,
    onSuccess?: () => void,
    onSettled?: () => void
  ) => {
    if (!workspaceId || !user?.uid || !folderName.trim()) {
      onSettled?.();
      return;
    }
    try {
      await createWikiDocument({
        title: folderName.trim(), content: '', isFolder: true, icon: '📂', tags: [], pinned: false,
        visibility: 'workspace', workspaceId: workspaceId, createdBy: user.uid,
        createdByName: user.displayName || '', parentId: currentFolderId || undefined,
      });
      onSuccess?.();
      toast.success(lang === 'ko' ? '폴더가 생성되었습니다' : 'Folder created');
    } catch (err) {
      handleError(err, { fallbackMessage: lang === 'ko' ? '폴더 생성 실패' : 'Failed to create folder' });
    } finally {
      onSettled?.();
    }
  }, [workspaceId, user?.uid, user?.displayName, lang]);

  return {
    handleDelete,
    handleToggleFavorite,
    handleTogglePin,
    handleSaveWithVersion,
    handleAddComment,
    handleMarkAsRead,
    handleConfirmFolder
  };
}
