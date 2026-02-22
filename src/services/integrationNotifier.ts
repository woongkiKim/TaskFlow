// src/services/integrationNotifier.ts
import type { Workspace } from '../types';
import { slackService } from './slackService';
import { googleChatService } from './googleChatService';
import * as notificationService from './notificationService';

/**
 * Unified event notifier.
 * Sends notifications to all enabled external channels (Slack & Google Chat)
 * AND creates personal in-app notifications for relevant users.
 */
export const integrationNotifier = {

  async notifyTaskCreated(
    workspace: Workspace,
    taskText: string,
    actor: { uid: string; name: string; photo?: string },
    projectName?: string,
    recipientUids?: string[],
  ) {
    const promises: Promise<void | boolean>[] = [];

    // 1. External Channels
    const slack = workspace.integrations?.slack;
    if (slack?.enabled && slack.notifyOnTaskCreated) {
      promises.push(slackService.sendMessage(slack, slackService.formatTaskCreated(taskText, projectName, actor.name)));
    }
    const gchat = workspace.integrations?.googleChat;
    if (gchat?.enabled && gchat.notifyOnTaskCreated) {
      promises.push(googleChatService.sendMessage(gchat, googleChatService.formatTaskCreated(taskText, projectName, actor.name)));
    }

    // 2. Personal In-app (Notify Workspace Members or specific recipients)
    const inApp = workspace.integrations?.inApp;
    const shouldNotify = !inApp || (inApp.enabled && inApp.notifyOnTaskCreated);
    if (shouldNotify && recipientUids && recipientUids.length > 0) {
      promises.push(notificationService.createNotificationsForMany(recipientUids, {
        type: 'task_status_changed', // Use appropriate type
        title: `${actor.name} created a new task`,
        body: taskText,
        actorUid: actor.uid,
        actorName: actor.name,
        actorPhoto: actor.photo,
        workspaceId: workspace.id,
        projectName,
        taskText,
      }));
    }

    await Promise.allSettled(promises);
  },

  async notifyTaskCompleted(
    workspace: Workspace,
    taskText: string,
    actor: { uid: string; name: string; photo?: string },
    recipientUids: string[],
    taskId: string,
    projectName?: string,
  ) {
    const promises: Promise<any>[] = [];

    // 1. External
    const slack = workspace.integrations?.slack;
    if (slack?.enabled && slack.notifyOnTaskCompleted) {
      promises.push(slackService.sendMessage(slack, slackService.formatTaskCompleted(taskText, projectName, actor.name)));
    }
    const gchat = workspace.integrations?.googleChat;
    if (gchat?.enabled && gchat.notifyOnTaskCompleted) {
      promises.push(googleChatService.sendMessage(gchat, googleChatService.formatTaskCompleted(taskText, projectName, actor.name)));
    }

    // 2. Personal
    const inApp = workspace.integrations?.inApp;
    const shouldNotify = !inApp || (inApp.enabled && inApp.notifyOnTaskCompleted);
    if (shouldNotify) {
      promises.push(notificationService.notifyTaskCompleted(
        actor, recipientUids, taskId, taskText, workspace.id, undefined, projectName
      ));
    }

    await Promise.allSettled(promises);
  },

  async notifyTaskAssigned(
    workspace: Workspace,
    taskText: string,
    assigneeUid: string,
    assigneeName: string,
    actor: { uid: string; name: string; photo?: string },
    taskId: string,
    projectName?: string,
  ) {
    const promises: Promise<any>[] = [];

    // 1. External
    const slack = workspace.integrations?.slack;
    if (slack?.enabled && slack.notifyOnTaskAssigned) {
      promises.push(slackService.sendMessage(slack, slackService.formatTaskAssigned(taskText, assigneeName, actor.name)));
    }
    const gchat = workspace.integrations?.googleChat;
    if (gchat?.enabled && gchat.notifyOnTaskAssigned) {
      promises.push(googleChatService.sendMessage(gchat, googleChatService.formatTaskAssigned(taskText, assigneeName, actor.name)));
    }

    // 2. Personal (Assigned User)
    const inApp = workspace.integrations?.inApp;
    const shouldNotify = !inApp || (inApp.enabled && inApp.notifyOnTaskAssigned);
    if (shouldNotify) {
      promises.push(notificationService.notifyTaskAssigned(
        actor, assigneeUid, taskId, taskText, workspace.id, undefined, projectName
      ));
    }

    await Promise.allSettled(promises);
  },

  async notifyStatusChange(
    workspace: Workspace,
    taskText: string,
    newStatus: string,
    actor: { uid: string; name: string; photo?: string },
    recipientUids: string[],
    taskId: string,
    projectName?: string,
  ) {
    const promises: Promise<any>[] = [];

    // 1. External
    const slack = workspace.integrations?.slack;
    if (slack?.enabled && slack.notifyOnStatusChange) {
      promises.push(slackService.sendMessage(slack, slackService.formatStatusChange(taskText, newStatus, actor.name)));
    }
    const gchat = workspace.integrations?.googleChat;
    if (gchat?.enabled && gchat.notifyOnStatusChange) {
      promises.push(googleChatService.sendMessage(gchat, googleChatService.formatStatusChange(taskText, newStatus, actor.name)));
    }

    // 2. Personal
    const inApp = workspace.integrations?.inApp;
    const shouldNotify = !inApp || (inApp.enabled && inApp.notifyOnStatusChange);
    if (shouldNotify) {
      promises.push(notificationService.notifyTaskStatusChanged(
        actor, recipientUids, taskId, taskText, newStatus, workspace.id, undefined, projectName
      ));
    }

    await Promise.allSettled(promises);
  },

  async notifyComment(
    workspace: Workspace,
    taskText: string,
    comment: string,
    actor: { uid: string; name: string; photo?: string },
    recipientUids: string[],
    taskId: string,
  ) {
    const promises: Promise<void | boolean>[] = [];

    // 1. External
    const slack = workspace.integrations?.slack;
    if (slack?.enabled && slack.notifyOnComment) {
      promises.push(slackService.sendMessage(slack, slackService.formatComment(taskText, comment, actor.name)));
    }
    const gchat = workspace.integrations?.googleChat;
    if (gchat?.enabled && gchat.notifyOnComment) {
      promises.push(googleChatService.sendMessage(gchat, googleChatService.formatComment(taskText, comment, actor.name)));
    }

    // 2. Personal
    const inApp = workspace.integrations?.inApp;
    const shouldNotify = !inApp || (inApp.enabled && inApp.notifyOnComment);
    if (shouldNotify) {
      promises.push(notificationService.createNotificationsForMany(recipientUids, {
        type: 'comment_added',
        title: `${actor.name} commented on your task`,
        body: comment,
        actorUid: actor.uid,
        actorName: actor.name,
        actorPhoto: actor.photo,
        workspaceId: workspace.id,
        taskId,
        taskText,
      }));
    }

    await Promise.allSettled(promises);
  },
};
