export interface AgentConfig {
  apiKey: string;
  endpoint?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';
