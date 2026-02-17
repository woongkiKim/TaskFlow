import { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { fetchTasks, addTaskToDB, toggleTaskStatusInDB, updateTaskTextInDB, deleteTaskFromDB, updateTaskDetailInDB, updateTaskOrdersInDB } from '../services/taskService';
import { toast } from 'sonner';
import type { Task, TaskType, TaskOwner } from '../types';

export const useDashboard = () => {
    const { user } = useAuth();
    const { lang, t } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // Date formatting
    const dateLocale = lang === 'ko' ? ko : undefined;
    const todayDate = format(new Date(), lang === 'ko' ? 'yyyy년 M월 d일 EEEE' : 'EEEE, MMMM d', { locale: dateLocale });

    const loadTasks = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await fetchTasks(user.uid);
            setTasks(data);
        } catch (error) {
            console.error("Failed to load tasks:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const addTask = async (data: {
        text: string; description?: string; priority?: string;
        category?: string; categoryColor?: string; dueDate?: string;
        tags?: string[]; date?: Date;
        assigneeId?: string; assigneeName?: string; assigneePhoto?: string;
        projectId?: string; workspaceId?: string;
        sprintId?: string; type?: TaskType; owners?: TaskOwner[];
        blockerStatus?: 'none' | 'blocked'; blockerDetail?: string;
        nextAction?: string; links?: string[];
    }) => {
        if (!user) return;
        try {
            const savedTask = await addTaskToDB(data.text, user.uid, data.date, data.tags, {
                priority: data.priority,
                description: data.description,
                dueDate: data.dueDate,
                category: data.category,
                categoryColor: data.categoryColor,
                projectId: data.projectId,
                workspaceId: data.workspaceId,
                assigneeId: data.assigneeId,
                assigneeName: data.assigneeName,
                assigneePhoto: data.assigneePhoto,
                sprintId: data.sprintId,
                type: data.type,
                owners: data.owners,
                blockerStatus: data.blockerStatus,
                blockerDetail: data.blockerDetail,
                nextAction: data.nextAction,
                links: data.links,
            });
            setTasks(prev => [savedTask, ...prev]);
            toast.success(t('taskAdded') as string || 'Task added');
        } catch (error) {
            console.error(error);
            toast.error(t('addFailed') as string || 'Failed to add task');
        }
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        // Optimistic Update
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed, status: t.completed ? 'todo' : 'done' } : t));

        try {
            await toggleTaskStatusInDB(id, task.completed);
        } catch (error) {
            console.error(error);
            setTasks(originalTasks); // Revert
            toast.error(t('toggleFailed') as string || 'Failed to update task');
        }
    };

    const updateTask = async (id: string, newText: string) => {
        // Optimistic Update
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));

        try {
            await updateTaskTextInDB(id, newText);
            toast.success(t('taskUpdated') as string || 'Task updated');
        } catch (error) {
            console.error(error);
            setTasks(originalTasks); // Revert
            toast.error(t('editFailed') as string || 'Failed to update task');
        }
    };

    const updateTaskDetail = async (id: string, updates: Partial<Task>) => {
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        try {
            // Need to convert Partial<Task> to what updateTaskDetailInDB expects (Partial<Pick<...>>)
            // We assume updateTaskDetailInDB accepts the fields we pass.
            // But strict typing in taskService might block 'id' or other fields not in Pick.
            // We should filter or cast.
            // taskService.ts: updateTaskDetailInDB(id, updates: Partial<Pick<...>>)
            // We'll cast to any for simplicity here or strict pick if possible.
            // For now, let's rely on structural typing.
            await updateTaskDetailInDB(id, updates as any);
            // toast.success('Task updated'); // Optional verbose
        } catch (error) {
            console.error(error);
            setTasks(originalTasks); // Revert
            toast.error(t('editFailed') as string || 'Failed to update task');
        }
    };

    const deleteTask = async (id: string) => {
        // Optimistic Update
        const originalTasks = [...tasks];
        setTasks(prev => prev.filter(t => t.id !== id));

        try {
            await deleteTaskFromDB(id);
            toast.success(t('taskDeleted') as string || 'Task deleted');
        } catch (error) {
            console.error(error);
            setTasks(originalTasks); // Revert
            toast.error(t('deleteFailed') as string || 'Failed to delete task');
        }
    };

    const reorderTasks = async (orderedIds: string[]) => {
        if (orderedIds.length < 2) return;
        const updates = orderedIds.map((id, order) => ({ id, order }));
        const orderMap = new Map(updates.map(u => [u.id, u.order]));
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(task => (
            orderMap.has(task.id) ? { ...task, order: orderMap.get(task.id) } : task
        )));
        try {
            await updateTaskOrdersInDB(updates);
        } catch (error) {
            console.error(error);
            setTasks(originalTasks);
            toast.error(t('editFailed') as string || 'Failed to reorder tasks');
        }
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    };


    // Computed properties
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        tasks.forEach(t => {
            t.tags?.forEach(tag => tagSet.add(tag));
            if (t.category) tagSet.add(t.category);
        });
        return Array.from(tagSet);
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        if (!selectedTag) return tasks;
        return tasks.filter(t =>
            t.tags?.includes(selectedTag) || t.category === selectedTag
        );
    }, [tasks, selectedTag]);

    const stats = useMemo(() => {
        const completedCount = tasks.filter((t) => t.completed).length;
        const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
        return { completedCount, totalCount: tasks.length, progress };
    }, [tasks]);

    return {
        user,
        lang,
        t,
        tasks,
        loading,
        selectedTag,
        setSelectedTag,
        dateLocale,
        todayDate,
        stats,
        allTags,
        filteredTasks,
        addTask,
        toggleTask,
        updateTask,
        updateTaskDetail, // Added
        reorderTasks,
        deleteTask,
        handleTaskUpdate
    };
};
