// src/services/slackService.ts
import type { SlackConfig, WebhookPayload } from '../types/integrations';

/**
 * Slack integration service.
 * Uses Incoming Webhooks — no OAuth needed, just a webhook URL.
 * Webhook setup: https://api.slack.com/messaging/webhooks
 */
export const slackService = {

  /**
   * Send a message to Slack via Incoming Webhook.
   * Works from the browser since Slack webhook endpoints allow CORS.
   */
  async sendMessage(config: SlackConfig, payload: WebhookPayload): Promise<boolean> {
    if (!config.enabled || !config.webhookUrl) return false;
    try {
      const body: Record<string, unknown> = { text: payload.text };
      if (payload.blocks) body.blocks = payload.blocks;
      
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return true;
    } catch (err) {
      console.error('[SlackService] sendMessage failed:', err);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '✅ TaskFlow connected to Slack successfully!' }),
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
    return {
      text: `📋 *New Task Created*${projectName ? ` in _${projectName}_` : ''}${creatorName ? ` by ${creatorName}` : ''}\n> ${taskText}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📋 *New Task Created*${projectName ? ` in _${projectName}_` : ''}${creatorName ? ` by ${creatorName}` : ''}\n> ${taskText}`,
          },
        },
      ],
    };
  },

  formatTaskCompleted(taskText: string, projectName?: string, completedBy?: string): WebhookPayload {
    return {
      text: `✅ *Task Completed*${projectName ? ` in _${projectName}_` : ''}${completedBy ? ` by ${completedBy}` : ''}\n> ~${taskText}~`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Task Completed*${projectName ? ` in _${projectName}_` : ''}${completedBy ? ` by ${completedBy}` : ''}\n> ~${taskText}~`,
          },
        },
      ],
    };
  },

  formatTaskAssigned(taskText: string, assigneeName: string, assignerName?: string): WebhookPayload {
    return {
      text: `👤 *Task Assigned* to ${assigneeName}${assignerName ? ` by ${assignerName}` : ''}\n> ${taskText}`,
    };
  },

  formatStatusChange(taskText: string, newStatus: string, changedBy?: string): WebhookPayload {
    const emoji = newStatus === 'done' ? '✅' : newStatus === 'in_progress' ? '🔄' : '📝';
    return {
      text: `${emoji} *Status → ${newStatus}*${changedBy ? ` by ${changedBy}` : ''}\n> ${taskText}`,
    };
  },

  formatComment(taskText: string, comment: string, commenter: string): WebhookPayload {
    return {
      text: `💬 *New Comment* by ${commenter}\n> Task: ${taskText}\n> "${comment}"`,
    };
  },
};
