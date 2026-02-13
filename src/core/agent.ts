import { AgentConfig, AgentState, Message } from '../types';

export class Agent {
  private config: AgentConfig;
  private state: AgentState = 'idle';
  private messages: Message[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getState(): AgentState {
    return this.state;
  }

  async processMessage(content: string): Promise<string> {
    this.state = 'thinking';

    this.messages.push({
      role: 'user',
      content,
      timestamp: Date.now()
    });

    // TODO: Implement actual LLM call
    const response = `Received: ${content}`;

    this.messages.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });

    this.state = 'idle';
    return response;
  }

  getHistory(): Message[] {
    return [...this.messages];
  }
}
