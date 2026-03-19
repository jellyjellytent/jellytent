/**
 * Jellytent - Enterprise AI Video Chat Agent
 * @module @jellyjelly/jellytent
 * @version 0.5.0-beta.1
 */

export { Jellytent } from './core/jellytent';
export { Agent } from './core/agent';
export { AvatarEngine } from './avatar/engine';
export { VoicePipeline } from './voice/pipeline';
export { LLMClient } from './llm/client';
export { PluginManager } from './plugins/manager';

// Memory system (NEW - WIP)
export { MemoryManager } from './memory/manager';
export { ConversationMemory } from './memory/conversation';
// TODO: Export RAG components once stable
// export { RAGPipeline } from './memory/rag';

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

// Experimental exports (unstable API)
// TODO: Move to stable once tested
// export { WebRTCTransport } from './experimental/webrtc-transport';
// export { EmotionDetector } from './experimental/emotion';
