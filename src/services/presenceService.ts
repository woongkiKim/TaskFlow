// src/services/presenceService.ts
// PresenceService — stub implementation
// Real-time presence requires WebSocket support (e.g., Django Channels).
// For now, this is a no-op stub to prevent build errors.

import type { DocumentPresence } from '../types';

/**
 * Updates the user's presence for a specific document.
 * TODO: Implement via Django Channels WebSocket
 */
export const updatePresence = async (
  _docId: string,
  _userId: string,
  _userName: string,
  _userPhoto?: string
): Promise<void> => {
  // No-op: WebSocket-based presence not yet implemented
};

/**
 * Removes the user's presence for a document.
 */
export const removePresence = async (_docId: string, _userId: string): Promise<void> => {
  // No-op
};

/**
 * Subscribes to the list of active users for a document.
 * Returns an unsubscribe function.
 */
export const subscribeToPresence = (
  _docId: string,
  _onUpdate: (presence: DocumentPresence[]) => void
): (() => void) => {
  // No-op: returns empty unsubscribe
  return () => {};
};
