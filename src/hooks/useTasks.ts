import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchTasks } from '../services/taskService';
import type { Task } from '../types';

/**
 * Lightweight read-only hook for fetching tasks.
 * For full CRUD operations, use `useDashboard` instead.
 *
 * @param options.enabled - set to false to defer loading (default true)
 * @returns { tasks, loading, error, reload }
 */
export const useTasks = (options?: { enabled?: boolean }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const enabled = options?.enabled ?? true;

    const reload = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const data = await fetchTasks(user.uid);
            setTasks(data);
        } catch (e) {
            console.error('Failed to load tasks:', e);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (enabled) {
            reload();
        }
    }, [reload, enabled]);

    return { tasks, loading, error, reload };
};
