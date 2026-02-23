export interface AgentConfig {
  apiKey: string;
  endpoint?: string;
  sessionId?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type AgentState = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface AgentEvents {
  'state:change': (state: AgentState) => void;
  'message': (message: Message) => void;
  'error': (error: Error) => void;
  'connected': () => void;
  'disconnected': () => void;
}

export interface TransportMessage {
  type: 'text' | 'audio' | 'control';
  payload: unknown;
  seq: number;
}

export interface VoiceConfig {
  sampleRate: number;
  channels: number;
  vadThreshold: number;
}
