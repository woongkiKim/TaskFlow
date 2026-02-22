// src/types/integrations.ts

/** Supported integration provider types */
export type IntegrationProvider = 'slack' | 'google_chat' | 'figma' | 'in_app';

/** Base integration config — stored per workspace */
export interface IntegrationConfig {
  enabled: boolean;
  connectedAt?: string;
  connectedBy?: string;
}

/** In-App Notification configuration */
export interface InAppConfig extends IntegrationConfig {
  notifyOnTaskCreated: boolean;
  notifyOnTaskCompleted: boolean;
  notifyOnTaskAssigned: boolean;
  notifyOnStatusChange: boolean;
  notifyOnComment: boolean;
}

/** Slack-specific configuration */
export interface SlackConfig extends IntegrationConfig {
  webhookUrl: string;
  channel?: string;            // display name only, e.g. #general
  notifyOnTaskCreated: boolean;
  notifyOnTaskCompleted: boolean;
  notifyOnTaskAssigned: boolean;
  notifyOnStatusChange: boolean;
  notifyOnComment: boolean;
}

/** Google Chat-specific configuration */
export interface GoogleChatConfig extends IntegrationConfig {
  webhookUrl: string;
  spaceName?: string;          // display name only
  notifyOnTaskCreated: boolean;
  notifyOnTaskCompleted: boolean;
  notifyOnTaskAssigned: boolean;
  notifyOnStatusChange: boolean;
  notifyOnComment: boolean;
}

/** Figma-specific configuration */
export interface FigmaConfig extends IntegrationConfig {
  accessToken: string;
  teamId?: string;
  projectFiles: FigmaFileLink[];
}

export interface FigmaFileLink {
  fileKey: string;
  fileName: string;
  thumbnailUrl?: string;
  projectId?: string;        // linked TaskFlow project id
  lastAccessedAt?: string;
}

/** Figma file metadata from API */
export interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
  version: string;
}

/** Figma comment from API */
export interface FigmaComment {
  id: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
  user: {
    handle: string;
    img_url: string;
  };
  order_id: string;
}

/** All integrations stored on workspace */
export interface WorkspaceIntegrations {
  slack?: SlackConfig;
  googleChat?: GoogleChatConfig;
  figma?: FigmaConfig;
  inApp?: InAppConfig;
}

/** Webhook message payload */
export interface WebhookPayload {
  text: string;
  blocks?: unknown[];        // Slack Block Kit
  cards?: unknown[];         // Google Chat Cards
}
