// src/services/googleChatService.ts
import type { GoogleChatConfig, WebhookPayload } from '../types/integrations';

/**
 * Google Chat integration service.
 * Uses Incoming Webhooks (Space webhooks).
 * Docs: https://developers.google.com/chat/how-tos/webhooks
 */
export const googleChatService = {

  /**
   * Send a message to Google Chat via Incoming Webhook.
   */
  async sendMessage(config: GoogleChatConfig, payload: WebhookPayload): Promise<boolean> {
    if (!config.enabled || !config.webhookUrl) return false;
    try {
      const body: Record<string, unknown> = { text: payload.text };

      // Google Chat Card format if provided
      if (payload.cards) {
        body.cardsV2 = payload.cards;
      }

      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(body),
      });
      return true;
    } catch (err) {
      console.error('[GoogleChatService] sendMessage failed:', err);
      return false;
    }
  },

  /**
   * Verify that a webhook URL is valid by sending a test message.
   */
  async testConnection(webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ text: '✅ TaskFlow가 Google Chat에 연결되었습니다!' }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${text}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  // ── Notification Formatters ──

  formatTaskCreated(taskText: string, projectName?: string, creatorName?: string): WebhookPayload {
    const header = `📋 *새 작업 생성*${projectName ? ` — ${projectName}` : ''}`;
    return {
      text: `${header}\n${taskText}${creatorName ? `\n👤 ${creatorName}` : ''}`,
      cards: [{
        cardId: 'task-created',
        card: {
          header: { title: '📋 새 작업 생성', subtitle: projectName || 'TaskFlow' },
          sections: [{
            widgets: [
              { decoratedText: { text: taskText, topLabel: '작업' } },
              ...(creatorName ? [{ decoratedText: { text: creatorName, topLabel: '생성자' } }] : []),
            ],
          }],
        },
      }],
    };
  },

  formatTaskCompleted(taskText: string, projectName?: string, completedBy?: string): WebhookPayload {
    return {
      text: `✅ *작업 완료*${projectName ? ` — ${projectName}` : ''}\n${taskText}${completedBy ? `\n👤 ${completedBy}` : ''}`,
      cards: [{
        cardId: 'task-completed',
        card: {
          header: { title: '✅ 작업 완료', subtitle: projectName || 'TaskFlow' },
          sections: [{
            widgets: [
              { decoratedText: { text: taskText, topLabel: '작업' } },
              ...(completedBy ? [{ decoratedText: { text: completedBy, topLabel: '완료자' } }] : []),
            ],
          }],
        },
      }],
    };
  },

  formatTaskAssigned(taskText: string, assigneeName: string, assignerName?: string): WebhookPayload {
    return {
      text: `👤 *작업 할당* → ${assigneeName}${assignerName ? ` (by ${assignerName})` : ''}\n${taskText}`,
    };
  },

  formatStatusChange(taskText: string, newStatus: string, changedBy?: string): WebhookPayload {
    const emoji = newStatus === 'done' ? '✅' : newStatus === 'in_progress' ? '🔄' : '📝';
    return {
      text: `${emoji} *상태 변경 → ${newStatus}*${changedBy ? ` by ${changedBy}` : ''}\n${taskText}`,
    };
  },

  formatComment(taskText: string, comment: string, commenter: string): WebhookPayload {
    return {
      text: `💬 *새 댓글* by ${commenter}\n작업: ${taskText}\n"${comment}"`,
    };
  },
};
