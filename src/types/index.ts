import { z } from 'zod';

export const AgentConfigSchema = z.object({
  apiKey: z.string().min(1),
  endpoint: z.string().url().optional(),
  sessionId: z.string().uuid().optional(),
  reconnect: z.boolean().default(true),
  maxReconnectAttempts: z.number().int().positive().default(5),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AvatarConfigSchema = z.object({
  enabled: z.boolean().default(true),
  style: z.enum(['luminescent', 'minimal', 'classic']).default('luminescent'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  size: z.number().positive().default(256),
});

export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;

export const VoiceConfigSchema = z.object({
  sampleRate: z.number().int().default(16000),
  channels: z.literal(1).default(1),
  vadSensitivity: z.number().min(0).max(1).default(0.5),
  echoCancellation: z.boolean().default(true),
  noiseSuppression: z.boolean().default(true),
});

export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

export const LLMConfigSchema = z.object({
  provider: z.enum(['jellyjelly', 'openai', 'anthropic']).default('jellyjelly'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(2048),
  systemPrompt: z.string().optional(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  audioUrl?: string;
  duration?: number;
  tokens?: number;
  model?: string;
}

export type AgentState =
  | 'uninitialized'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export interface ResponsePayload {
  id: string;
  text: string;
  audio?: ArrayBuffer;
  timestamp: number;
  isFinal: boolean;
}

export interface AvatarState {
  frame: number;
  mouthOpen: number;
  tentaclePhase: number[];
  glowIntensity: number;
  position: { x: number; y: number };
}

export interface TransportMessage<T = unknown> {
  type: 'text' | 'audio' | 'control' | 'ping' | 'pong';
  payload: T;
  seq: number;
  timestamp: number;
}
