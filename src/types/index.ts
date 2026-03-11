import { z } from 'zod';

// ============================================================================
// Configuration Schemas
// ============================================================================

export const AgentConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  endpoint: z.string().url().optional(),
  sessionId: z.string().uuid().optional(),
  reconnect: z.boolean().default(true),
  maxReconnectAttempts: z.number().int().positive().default(5),
  connectionTimeout: z.number().int().positive().default(10000),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AvatarConfigSchema = z.object({
  enabled: z.boolean().default(true),
  style: z.enum(['luminescent', 'minimal', 'classic']).default('luminescent'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  size: z.number().positive().default(256),
  frameRate: z.number().int().min(30).max(120).default(60),
});

export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;

export const VoiceConfigSchema = z.object({
  sampleRate: z.number().int().default(16000),
  channels: z.literal(1).default(1),
  vadSensitivity: z.number().min(0).max(1).default(0.5),
  echoCancellation: z.boolean().default(true),
  noiseSuppression: z.boolean().default(true),
  sttProvider: z.enum(['whisper', 'deepgram', 'custom']).default('whisper'),
  ttsProvider: z.enum(['coqui', 'elevenlabs', 'custom']).default('coqui'),
});

export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

export const LLMConfigSchema = z.object({
  provider: z.enum(['jellyjelly', 'openai', 'anthropic']).default('jellyjelly'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(2048),
  systemPrompt: z.string().optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
  })).optional(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export const TelemetryConfigSchema = z.object({
  enabled: z.boolean().default(false),
  endpoint: z.string().url().optional(),
  serviceName: z.string().default('jellytent'),
  sampleRate: z.number().min(0).max(1).default(0.1),
  exportInterval: z.number().int().positive().default(10000),
});

export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  audioUrl?: string;
  duration?: number;
  tokens?: number;
  model?: string;
  toolCalls?: ToolCall[];
  pluginSource?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ============================================================================
// State Types
// ============================================================================

export type AgentState =
  | 'uninitialized'
  | 'initializing'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'
  | 'disconnected';

export interface ResponsePayload {
  id: string;
  text: string;
  audio?: ArrayBuffer;
  timestamp: number;
  isFinal: boolean;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  model?: string;
  tokens?: number;
  processingTime?: number;
}

export interface AvatarState {
  frame: number;
  mouthOpen: number;
  tentaclePhase: number[];
  glowIntensity: number;
  pulsePhase: number;
  position: { x: number; y: number };
  rotation: number;
}

// ============================================================================
// Transport Types
// ============================================================================

export type TransportMessageType =
  | 'text'
  | 'audio'
  | 'control'
  | 'ping'
  | 'pong'
  | 'error'
  | 'ack';

export interface TransportMessage<T = unknown> {
  type: TransportMessageType;
  payload: T;
  seq: number;
  timestamp: number;
  correlationId?: string;
}

export interface TransportError {
  code: string;
  message: string;
  retryable: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export class JellytentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'JellytentError';
  }
}

export class ConnectionError extends JellytentError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR', true, cause);
    this.name = 'ConnectionError';
  }
}

export class AuthenticationError extends JellytentError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', false);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends JellytentError {
  constructor(
    message: string,
    public readonly retryAfter: number,
  ) {
    super(message, 'RATE_LIMIT_ERROR', true);
    this.name = 'RateLimitError';
  }
}
