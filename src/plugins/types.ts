import { Logger } from '../utils/logger';

export interface PluginContext {
  logger: Logger;
  sessionId?: string;
  config: Record<string, unknown>;
}

export interface PluginResult {
  handled: boolean;
  content: string;
  action?: string;
  payload?: unknown;
}

export interface Plugin {
  /**
   * Unique plugin identifier
   */
  name: string;

  /**
   * Plugin version (semver)
   */
  version: string;

  /**
   * Plugin description
   */
  description?: string;

  /**
   * Priority for execution order (higher = earlier)
   */
  priority?: number;

  /**
   * Called when plugin is registered
   */
  onInit?(ctx: PluginContext): Promise<void>;

  /**
   * Called when plugin is unregistered
   */
  onDestroy?(ctx: PluginContext): Promise<void>;

  /**
   * Process incoming user message before sending to LLM
   * Return modified content or original if no changes
   */
  onMessage?(message: string, ctx: PluginContext): Promise<PluginResult | void>;

  /**
   * Process response from LLM before sending to user
   * Return modified content or original if no changes
   */
  onResponse?(response: string, ctx: PluginContext): Promise<string | void>;

  /**
   * Called when connection state changes
   */
  onStateChange?(state: string, ctx: PluginContext): Promise<void>;

  /**
   * Handle tool calls from LLM
   */
  onToolCall?(
    toolName: string,
    args: Record<string, unknown>,
    ctx: PluginContext,
  ): Promise<unknown>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: Record<string, string>;
  config?: {
    schema: Record<string, unknown>;
    defaults: Record<string, unknown>;
  };
}
