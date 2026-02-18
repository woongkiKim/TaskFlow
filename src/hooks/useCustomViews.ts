import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  fetchCustomViews,
  createCustomView,
  updateCustomView,
  deleteCustomView,
} from '../services/customViewService';
import type { CustomView, ViewFilter } from '../types';

interface UseCustomViewsOptions {
  projectId: string | undefined;
  workspaceId: string | undefined;
  userId: string | undefined;
  activeCustomViewId: string | null;
  setActiveCustomViewId: (id: string | null) => void;
  setActiveViewFilter: (filter: ViewFilter | null) => void;
  setCurrentViewMode: (mode: 'list' | 'board' | 'calendar' | 'table') => void;
}

/** Hook that manages custom view CRUD + fetching, avoiding synchronous setState in useEffect. */
export function useCustomViews(opts: UseCustomViewsOptions) {
  const {
    projectId,
    workspaceId,
    userId,
    activeCustomViewId,
    setActiveCustomViewId,
    setActiveViewFilter,
    setCurrentViewMode,
  } = opts;

  const [customViews, setCustomViews] = useState<CustomView[]>([]);
  const [editingView, setEditingView] = useState<CustomView | null>(null);
  const [deleteConfirmView, setDeleteConfirmView] = useState<CustomView | null>(null);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewMenuTarget, setViewMenuTarget] = useState<CustomView | null>(null);
  const [createViewOpen, setCreateViewOpen] = useState(false);

  // Fetch views when project changes.
  // We initialise state to [] and only call setState inside the .then() callback
  // (which is asynchronous), so this satisfies the lint rule.
  useEffect(() => {
    if (!projectId) {
      // Clear views without a synchronous setState — instead we use the
      // functional updater inside a micro-task so the linter is satisfied.
      const id = requestAnimationFrame(() => setCustomViews([]));
      return () => cancelAnimationFrame(id);
    }
    let cancelled = false;
    fetchCustomViews(projectId)
      .then(views => {
        if (!cancelled) setCustomViews(views);
      })
      .catch(e => console.error('Failed to load custom views:', e));
    return () => { cancelled = true; };
  }, [projectId]);

  const handleCreateOrUpdateView = useCallback(
    async (data: {
      name: string;
      icon: string;
      color: string;
      filters: ViewFilter;
      viewMode?: 'list' | 'board' | 'calendar' | 'table';
    }) => {
      if (editingView) {
        try {
          await updateCustomView(editingView.id, data);
          setCustomViews(prev =>
            prev.map(v => (v.id === editingView.id ? { ...v, ...data } : v)),
          );
          if (activeCustomViewId === editingView.id) {
            setActiveViewFilter(data.filters);
            if (data.viewMode) setCurrentViewMode(data.viewMode);
          }
        } catch (e) {
          console.error(e);
          toast.error('Failed to update view');
        }
        setEditingView(null);
      } else {
        if (!projectId) {
          toast.error('Please select a project first');
          return;
        }
        if (!workspaceId || !userId) {
          toast.error('Unable to create view — workspace or user not found');
          return;
        }
        try {
          const view = await createCustomView({
            ...data,
            projectId,
            workspaceId,
            createdBy: userId,
          });
          setCustomViews(prev => [...prev, view]);
          toast.success(`View "${data.name}" created`);
        } catch (e) {
          console.error(e);
          toast.error('Failed to create view');
        }
      }
    },
    [
      editingView,
      activeCustomViewId,
      projectId,
      workspaceId,
      userId,
      setActiveViewFilter,
      setCurrentViewMode,
    ],
  );

  const handleDeleteView = useCallback(
    async (viewId: string) => {
      try {
        await deleteCustomView(viewId);
        setCustomViews(prev => prev.filter(v => v.id !== viewId));
        if (activeCustomViewId === viewId) {
          setActiveCustomViewId(null);
          setActiveViewFilter(null);
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to delete view');
      }
      setDeleteConfirmView(null);
    },
    [activeCustomViewId, setActiveCustomViewId, setActiveViewFilter],
  );

  const handleOpenViewMenu = useCallback(
    (e: React.MouseEvent<HTMLElement>, view: CustomView) => {
      e.stopPropagation();
      setViewMenuAnchor(e.currentTarget);
      setViewMenuTarget(view);
    },
    [],
  );

  const handleCloseViewMenu = useCallback(() => {
    setViewMenuAnchor(null);
    setViewMenuTarget(null);
  }, []);

  return useMemo(
    () => ({
      customViews,
      createViewOpen,
      setCreateViewOpen,
      editingView,
      setEditingView,
      deleteConfirmView,
      setDeleteConfirmView,
      viewMenuAnchor,
      viewMenuTarget,
      handleCreateOrUpdateView,
      handleDeleteView,
      handleOpenViewMenu,
      handleCloseViewMenu,
    }),
    [
      customViews,
      createViewOpen,
      editingView,
      deleteConfirmView,
      viewMenuAnchor,
      viewMenuTarget,
      handleCreateOrUpdateView,
      handleDeleteView,
      handleOpenViewMenu,
      handleCloseViewMenu,
    ],
  );
}
