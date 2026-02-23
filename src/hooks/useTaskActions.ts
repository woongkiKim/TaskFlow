// src/hooks/useTaskActions.ts
// Extracted task CRUD operations and order management from TasksPage.
// Provides optimistic updates with rollback on failure.

import { useState, useCallback } from 'react';
import type { Task, TaskType, TaskOwner, KanbanColumn } from '../types';
import {
    addTaskToDB, toggleTaskStatusInDB, updateTaskTextInDB,
    deleteTaskFromDB, updateTaskKanbanStatusInDB, updateTaskOrdersInDB,
    rolloverSprintTasks, fetchProjectTasks,
} from '../services/taskService';
import { updateProjectColumns } from '../services/projectService';
import { handleError } from '../utils/errorHandler';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const sortTasksByOrder = (arr: Task[]) => [...arr].sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return b.createdAt.localeCompare(a.createdAt);
});

interface TaskActionsDeps {
    user: { uid: string; displayName?: string | null; photoURL?: string | null } | null;
    t: (key: string) => string | Record<string, string>;
    lang: string;
    currentProject?: { id: string; name: string; color: string; kanbanColumns?: KanbanColumn[] } | null;
    currentWorkspace?: { id: string } | null;
    currentSprint?: { id: string; kanbanColumns?: KanbanColumn[] } | null;
    setCurrentProject?: (p: typeof TaskActionsDeps.prototype.currentProject) => void;
    updateCurrentSprint?: (partial: Record<string, unknown>) => Promise<void>;
}

export function useTaskActions(
    tasks: Task[],
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
    deps: TaskActionsDeps,
) {
    const { user, t, lang, currentProject, currentWorkspace, currentSprint } = deps;

    // ─── Soft Delete with Undo ───
    const [pendingDelete, setPendingDelete] = useState<{ task: Task; timeoutId: ReturnType<typeof setTimeout> } | null>(null);

    // ─── Add Task (inline) ───
    const handleAddInline = useCallback(async (text: string, tags: string[]) => {
        if (!user) return;
        try {
            const savedTask = await addTaskToDB(text, user.uid, undefined, tags.length > 0 ? tags : undefined, {
                projectId: currentProject?.id,
                workspaceId: currentWorkspace?.id,
                sprintId: currentSprint?.id,
                assigneeId: user.uid,
                assigneeName: user.displayName || 'User',
                assigneePhoto: user.photoURL || '',
            });
            setTasks(prev => [savedTask, ...prev]);
        } catch (e) { handleError(e, { fallbackMessage: t('addFailed') as string }); }
    }, [user, currentProject, currentWorkspace, currentSprint, t, setTasks]);

    // ─── Add Task (quick) ───
    const handleQuickAdd = useCallback(async (text: string, statusOverride?: string) => {
        if (!user || !text.trim()) return;
        try {
            const savedTask = await addTaskToDB(text.trim(), user.uid, undefined, undefined, {
                projectId: currentProject?.id,
                workspaceId: currentWorkspace?.id,
                sprintId: currentSprint?.id,
                assigneeId: user.uid,
                assigneeName: user.displayName || 'User',
                assigneePhoto: user.photoURL || '',
                status: statusOverride || 'todo',
            });
            setTasks(prev => [savedTask, ...prev]);
        } catch (e) { handleError(e, { fallbackMessage: t('quickAddFailed') as string }); }
    }, [user, currentProject, currentWorkspace, currentSprint, t, setTasks]);

    // ─── Add Task (board inline with status) ───
    const handleBoardInlineAdd = useCallback(async (text: string, status: string) => {
        if (!user || !text.trim()) return;
        try {
            const savedTask = await addTaskToDB(text.trim(), user.uid, undefined, undefined, {
                projectId: currentProject?.id,
                workspaceId: currentWorkspace?.id,
                sprintId: currentSprint?.id,
                assigneeId: user.uid,
                assigneeName: user.displayName || 'User',
                assigneePhoto: user.photoURL || '',
                status,
            });
            setTasks(prev => [savedTask, ...prev]);
        } catch (e) { handleError(e, { fallbackMessage: t('quickAddFailed') as string }); }
    }, [user, currentProject, currentWorkspace, currentSprint, t, setTasks]);

    // ─── Add Task (dialog) ───
    const handleAddDialog = useCallback(async (data: {
        text: string; description?: string; priority?: string;
        category?: string; categoryColor?: string; dueDate?: string; tags?: string[];
        date?: Date; assigneeId?: string; assigneeName?: string; assigneePhoto?: string;
        sprintId?: string; type?: TaskType; owners?: TaskOwner[];
        blockerStatus?: 'none' | 'blocked'; blockerDetail?: string;
        nextAction?: string; links?: string[];
    }) => {
        if (!user) return;
        try {
            const savedTask = await addTaskToDB(data.text, user.uid, data.date, data.tags, {
                priority: data.priority, description: data.description, dueDate: data.dueDate,
                category: data.category, categoryColor: data.categoryColor, status: 'todo',
                projectId: currentProject?.id, workspaceId: currentWorkspace?.id,
                sprintId: data.sprintId || currentSprint?.id,
                assigneeId: data.assigneeId || user.uid,
                assigneeName: data.assigneeName || user.displayName || 'User',
                assigneePhoto: data.assigneePhoto || user.photoURL || '',
                type: data.type, owners: data.owners,
                blockerStatus: data.blockerStatus, blockerDetail: data.blockerDetail,
                nextAction: data.nextAction, links: data.links,
            });
            setTasks(prev => [savedTask, ...prev]);
        } catch (e) { handleError(e, { fallbackMessage: t('addFailed') as string }); }
    }, [user, currentProject, currentWorkspace, currentSprint, t, setTasks]);

    // ─── Toggle completion ───
    const handleToggle = useCallback(async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const prev = [...tasks];
        const isCompleting = !task.completed;

        setTasks(tasks.map(t => t.id === id ? { ...t, completed: isCompleting, status: isCompleting ? 'done' as const : 'todo' as const } : t));

        if (isCompleting) {
            confetti({
                particleCount: 100, spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b'],
            });
            toast.success(t('taskCompleted') as string || 'Task completed! 🎉');
        }

        try { await toggleTaskStatusInDB(id, task.completed); } catch (e) { setTasks(prev); handleError(e); }
    }, [tasks, setTasks, t]);

    // ─── Edit text ───
    const handleEdit = useCallback(async (id: string, newText: string) => {
        const prev = [...tasks];
        setTasks(tasks.map(t => t.id === id ? { ...t, text: newText } : t));
        try { await updateTaskTextInDB(id, newText); } catch { setTasks(prev); }
    }, [tasks, setTasks]);

    // ─── Delete (with undo) ───
    const handleDelete = useCallback((id: string) => {
        const taskToDelete = tasks.find(t => t.id === id);
        if (!taskToDelete) return;

        // Cancel any previous pending delete
        if (pendingDelete) {
            clearTimeout(pendingDelete.timeoutId);
            deleteTaskFromDB(pendingDelete.task.id).catch(() => { });
        }

        setTasks(tasks.filter(t => t.id !== id));

        const timeoutId = setTimeout(() => {
            deleteTaskFromDB(id).catch(() => { });
            setPendingDelete(null);
        }, 5000);

        setPendingDelete({ task: taskToDelete, timeoutId });
    }, [tasks, setTasks, pendingDelete]);

    const handleUndoDelete = useCallback(() => {
        if (!pendingDelete) return;
        clearTimeout(pendingDelete.timeoutId);
        setTasks(prev => [pendingDelete.task, ...prev]);
        setPendingDelete(null);
    }, [pendingDelete, setTasks]);

    const handleSnackbarClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        if (pendingDelete) {
            clearTimeout(pendingDelete.timeoutId);
            deleteTaskFromDB(pendingDelete.task.id).catch(() => { });
            setPendingDelete(null);
        }
    }, [pendingDelete]);

    // ─── Kanban status change ───
    const handleKanbanStatusChange = useCallback(async (taskId: string, newStatus: string, dropBeforeTaskId?: string) => {
        const prev = [...tasks];
        const movingTask = tasks.find(t => t.id === taskId);
        if (!movingTask) return;

        const sourceStatus = movingTask.status || 'todo';
        const targetTasks = sortTasksByOrder(
            tasks.filter(t => t.id !== taskId && (t.status || 'todo') === newStatus)
        );

        let insertIndex = targetTasks.length;
        if (dropBeforeTaskId) {
            const idx = targetTasks.findIndex(t => t.id === dropBeforeTaskId);
            if (idx >= 0) insertIndex = idx;
        }

        const reorderedTarget = [...targetTasks];
        reorderedTarget.splice(insertIndex, 0, { ...movingTask, status: newStatus, completed: newStatus === 'done' });

        const targetUpdates = reorderedTarget.map((t, order) => ({ id: t.id, order }));
        const sourceUpdates = sourceStatus !== newStatus
            ? sortTasksByOrder(tasks.filter(t => t.id !== taskId && (t.status || 'todo') === sourceStatus))
                .map((t, order) => ({ id: t.id, order }))
            : [];

        const orderMap = new Map([...sourceUpdates, ...targetUpdates].map(u => [u.id, u.order]));
        setTasks(tasks.map(t => {
            if (t.id === taskId) return { ...t, status: newStatus, completed: newStatus === 'done', order: orderMap.get(t.id) };
            if (orderMap.has(t.id)) return { ...t, order: orderMap.get(t.id) };
            return t;
        }));

        try {
            await updateTaskKanbanStatusInDB(taskId, newStatus);
            await updateTaskOrdersInDB([...sourceUpdates, ...targetUpdates]);
        } catch {
            setTasks(prev);
        }
    }, [tasks, setTasks]);

    // ─── Column management ───
    const handleColumnsChange = useCallback(async (newColumns: KanbanColumn[]) => {
        if (currentSprint) {
            try { await deps.updateCurrentSprint?.({ kanbanColumns: newColumns }); } catch (e) { console.error(e); }
        } else if (currentProject) {
            const updated = { ...currentProject, kanbanColumns: newColumns };
            deps.setCurrentProject?.(updated as typeof currentProject);
            try { await updateProjectColumns(currentProject.id, newColumns); } catch (e) { console.error(e); }
        }
    }, [currentSprint, currentProject, deps]);

    // ─── Task update (from detail dialog) ───
    const handleTaskUpdate = useCallback((updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    }, [setTasks]);

    // ─── Order management ───
    const applyOrderUpdates = useCallback(async (orderedIds: string[]) => {
        if (orderedIds.length < 2) return;
        const updates = orderedIds.map((id, order) => ({ id, order }));
        const orderMap = new Map(updates.map(u => [u.id, u.order]));
        const prev = [...tasks];
        setTasks(prevTasks => prevTasks.map(task => (
            orderMap.has(task.id) ? { ...task, order: orderMap.get(task.id) } : task
        )));
        try { await updateTaskOrdersInDB(updates); } catch { setTasks(prev); }
    }, [tasks, setTasks]);

    const handleMoveListTask = useCallback((taskId: string, direction: 'up' | 'down', orderedIds: string[]) => {
        const index = orderedIds.indexOf(taskId);
        if (index < 0) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= orderedIds.length) return;
        const next = [...orderedIds];
        [next[index], next[target]] = [next[target], next[index]];
        void applyOrderUpdates(next);
    }, [applyOrderUpdates]);

    const handleReorderTodayTasks = useCallback((orderedIds: string[]) => {
        void applyOrderUpdates(orderedIds);
    }, [applyOrderUpdates]);

    const handleMoveBoardTask = useCallback((taskId: string, status: string, direction: 'up' | 'down') => {
        const statusTasks = sortTasksByOrder(tasks.filter(t => (t.status || 'todo') === status));
        const orderedIds = statusTasks.map(t => t.id);
        const index = orderedIds.indexOf(taskId);
        if (index < 0) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= orderedIds.length) return;
        const next = [...orderedIds];
        [next[index], next[target]] = [next[target], next[index]];
        void applyOrderUpdates(next);
    }, [tasks, applyOrderUpdates]);

    const handleReorderBoardTasks = useCallback((orderedIds: string[]) => {
        void applyOrderUpdates(orderedIds);
    }, [applyOrderUpdates]);

    // ─── Sub-issue creation ───
    const handleCreateSubIssue = useCallback(async (parentTask: Task, subIssueText: string) => {
        if (!user) return;
        try {
            const savedTask = await addTaskToDB(subIssueText, user.uid, undefined, undefined, {
                status: 'todo',
                projectId: parentTask.projectId,
                workspaceId: parentTask.workspaceId,
                sprintId: parentTask.sprintId,
                parentTaskId: parentTask.id,
                parentTaskText: parentTask.text,
                assigneeId: user.uid,
                assigneeName: user.displayName || 'User',
                assigneePhoto: user.photoURL || '',
            });
            setTasks(prev => [savedTask, ...prev]);
            toast.success('Sub-issue created: ' + subIssueText);
        } catch (e) { handleError(e, { fallbackMessage: 'Failed to create sub-issue' }); }
    }, [user, setTasks]);

    // ─── Sprint Rollover ───
    const handleRolloverTasks = useCallback(async (targetSprintId: string, onSuccess?: () => void) => {
        if (!currentSprint || !targetSprintId) return;
        try {
            const count = await rolloverSprintTasks(currentSprint.id, targetSprintId);
            toast.success(lang === 'ko' ? `${count}개의 할 일이 연기되었습니다.` : `${count} tasks rolled over successfully.`);
            onSuccess?.();
            const data = currentProject ? await fetchProjectTasks(currentProject.id) : [];
            setTasks(data);
        } catch (e) {
            handleError(e, { fallbackMessage: 'Rollover failed' });
        }
    }, [currentSprint, currentProject, lang, setTasks]);

    return {
        // Soft-delete undo state
        pendingDelete,
        // Handlers
        handleAddInline,
        handleQuickAdd,
        handleBoardInlineAdd,
        handleAddDialog,
        handleToggle,
        handleEdit,
        handleDelete,
        handleUndoDelete,
        handleSnackbarClose,
        handleKanbanStatusChange,
        handleColumnsChange,
        handleTaskUpdate,
        handleMoveListTask,
        handleReorderTodayTasks,
        handleMoveBoardTask,
        handleReorderBoardTasks,
        handleCreateSubIssue,
        handleRolloverTasks,
    };
}
