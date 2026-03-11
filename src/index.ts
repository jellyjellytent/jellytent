/**
 * Jellytent - Enterprise AI Video Chat Agent
 * @module @jellyjelly/jellytent
 * @version 0.4.0
 */

export { Jellytent } from './core/jellytent';
export { Agent } from './core/agent';
export { AvatarEngine } from './avatar/engine';
export { VoicePipeline } from './voice/pipeline';
export { LLMClient } from './llm/client';
export { PluginManager } from './plugins/manager';

// Plugin types
export type { Plugin, PluginContext, PluginResult } from './plugins/types';

// Observability
export { MetricsCollector } from './observability/metrics';
export { TracingProvider } from './observability/tracing';

// Core types
export * from './types';
export type {
  JellytentConfig,
  JellytentEvents,
} from './core/jellytent';
