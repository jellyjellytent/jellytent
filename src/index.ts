/**
 * Jellytent - AI Video Chat Agent
 * @module @jellyjelly/jellytent
 * @version 0.3.0
 */

export { Jellytent } from './core/jellytent';
export { Agent } from './core/agent';
export { AvatarEngine } from './avatar/engine';
export { VoicePipeline } from './voice/pipeline';
export { LLMClient } from './llm/client';

export * from './types';
export type { JellytentConfig, JellytentEvents } from './core/jellytent';
