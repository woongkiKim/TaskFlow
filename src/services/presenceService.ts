// src/services/presenceService.ts
// Note: Real-time presence requires WebSocket/SSE support.
// This REST API version provides basic polling-based presence.
// For full real-time functionality, consider django-channels.

/**
 * Updates the user's presence for a specific document.
 * In a REST API context, this creates/updates a presence record.
 */
export const updatePresence = async (
    docId: string,
    userId: string,
    userName: string,
    userPhoto?: string
) => {
    // Presence can be implemented via a dedicated endpoint or polling
    // For now, store in localStorage as a lightweight solution
    const key = `presence_${docId}_${userId}`;
    localStorage.setItem(key, JSON.stringify({
        docId, userId, userName,
        userPhoto: userPhoto || null,
        lastSeen: new Date().toISOString(),
    }));
};

/**
 * Removes the user's presence for a document.
 */
export const removePresence = async (docId: string, userId: string) => {
    const key = `presence_${docId}_${userId}`;
    localStorage.removeItem(key);
};

/**
 * Subscribes to the list of active users for a document.
 * In REST mode, this uses polling instead of real-time snapshots.
 * Returns an unsubscribe function matching the Firestore API.
 */
export const subscribeToPresence = (
    docId: string,
    onUpdate: (presence: Array<{ docId: string; userId: string; userName: string; userPhoto?: string; lastSeen: string }>) => void
) => {
    // Lightweight polling fallback — in production, replace with WebSocket (django-channels)
    const interval = setInterval(() => {
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000;
        const presence: Array<{ docId: string; userId: string; userName: string; userPhoto?: string; lastSeen: string }> = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`presence_${docId}_`)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    if (new Date(data.lastSeen).getTime() > twoMinutesAgo) {
                        presence.push(data);
                    }
                } catch { /* skip invalid */ }
            }
        }
        onUpdate(presence);
    }, 10000); // poll every 10s

    // Return unsubscribe function
    return () => clearInterval(interval);
};
