import {
    collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc,
} from "firebase/firestore";
import { db } from '../FBase';
import { format } from 'date-fns';
import type { AutomationRule, AutomationAction } from '../types';

const COLLECTION_NAME = "automationRules";
const TASK_COLLECTION = "tasks";

// ─── CRUD ────────────────────────────────────────────────────

export const fetchAutomationRules = async (workspaceId: string): Promise<AutomationRule[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("workspaceId", "==", workspaceId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationRule));
    } catch (e) {
        console.error("Error fetching automation rules:", e);
        return [];
    }
};

export const createAutomationRule = async (
    rule: Omit<AutomationRule, 'id'>
): Promise<AutomationRule> => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), rule);
    return { id: docRef.id, ...rule };
};

export const deleteAutomationRule = async (ruleId: string): Promise<void> => {
    await deleteDoc(doc(db, COLLECTION_NAME, ruleId));
};

export const toggleAutomationRule = async (ruleId: string, isEnabled: boolean): Promise<void> => {
    await updateDoc(doc(db, COLLECTION_NAME, ruleId), { isEnabled });
};

// ─── Trigger Engine ──────────────────────────────────────────

/**
 * Evaluate automation rules against a task update and apply matching actions.
 * Called client-side after every task status update.
 *
 * @param workspaceId - The workspace to fetch rules for
 * @param taskId      - The task that was just updated
 * @param newStatus   - The new status that was set on the task
 * @param oldStatus   - (Optional) previous status, for `from` matching
 */
export const triggerAutomations = async (
    workspaceId: string,
    taskId: string,
    newStatus: string,
    oldStatus?: string,
): Promise<void> => {
    try {
        const rules = await fetchAutomationRules(workspaceId);
        const enabledRules = rules.filter(r => r.isEnabled);

        for (const rule of enabledRules) {
            if (rule.trigger.type !== 'status_change') continue;
            if (rule.trigger.to !== newStatus) continue;
            if (rule.trigger.from && oldStatus && rule.trigger.from !== oldStatus) continue;

            // Rule matches — apply all actions
            await applyActions(taskId, rule.actions);
        }
    } catch (e) {
        console.error("Error triggering automations:", e);
        // Don't throw — automations are best-effort and should not block the user
    }
};

// ─── Action Executor ─────────────────────────────────────────

const applyActions = async (taskId: string, actions: AutomationAction[]): Promise<void> => {
    const taskRef = doc(db, TASK_COLLECTION, taskId);
    const updates: Record<string, unknown> = {};
    const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

    for (const action of actions) {
        switch (action.type) {
            case 'assign_user':
                updates.assigneeId = action.userId;
                if (action.userName) updates.assigneeName = action.userName;
                if (action.userPhoto) updates.assigneePhoto = action.userPhoto;
                break;

            case 'add_label':
                // Labels are stored in the `tags` array on the task.
                // We'll need to merge, but since we can't arrayUnion cleanly
                // with other fields in a single updateDoc, we'll handle it simply:
                // Fetch is avoided; just set the tag. A smarter approach could
                // use arrayUnion, but we keep it simple here.
                // Using Firestore arrayUnion directly is cleaner:
                updates.tags = action.label; // Placeholder — overridden below
                break;

            case 'set_priority':
                updates.priority = action.priority;
                break;
        }
    }

    // Handle label actions with arrayUnion for proper merging
    const labelActions = actions.filter(a => a.type === 'add_label') as
        Extract<AutomationAction, { type: 'add_label' }>[];

    if (labelActions.length > 0) {
        // For labels, use a separate call with arrayUnion
        const { arrayUnion } = await import('firebase/firestore');
        const labelsToAdd = labelActions.map(a => a.label);

        // Remove the placeholder 'tags' from updates
        delete updates.tags;

        // Apply non-label updates first
        if (Object.keys(updates).length > 0) {
            updates.updatedAt = now;
            await updateDoc(taskRef, updates);
        }

        // Then apply label updates separately with arrayUnion
        await updateDoc(taskRef, {
            tags: arrayUnion(...labelsToAdd),
            updatedAt: now,
        });
    } else if (Object.keys(updates).length > 0) {
        updates.updatedAt = now;
        await updateDoc(taskRef, updates);
    }
};
