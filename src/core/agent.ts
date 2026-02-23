import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, AgentState, Message, AgentEvents } from '../types';
import { WebSocketTransport } from '../transport/websocket';

export class Agent extends EventEmitter<AgentEvents> {
  private config: AgentConfig;
  private state: AgentState = 'idle';
  private messages: Message[] = [];
  private transport: WebSocketTransport | null = null;
  private sessionId: string;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.sessionId = config.sessionId ?? uuidv4();
  }

  getState(): AgentState {
    return this.state;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private setState(state: AgentState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('state:change', state);
    }
  }

  async connect(): Promise<void> {
    if (this.transport) {
      throw new Error('Already connected');
    }

    this.setState('connecting');

    try {
      this.transport = new WebSocketTransport({
        url: this.config.endpoint!,
        apiKey: this.config.apiKey,
        sessionId: this.sessionId,
      });

      await this.transport.connect();
      this.setupTransportHandlers();
      this.setState('connected');
      this.emit('connected');
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  private setupTransportHandlers(): void {
    if (!this.transport) return;

    this.transport.on('message', (data) => {
      const message: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.payload as string,
        timestamp: Date.now(),
      };

      this.messages.push(message);
      this.emit('message', message);
    });

    this.transport.on('close', () => {
      this.setState('idle');
      this.emit('disconnected');
    });

    this.transport.on('error', (error) => {
      this.setState('error');
      this.emit('error', error);
    });
  }

  async send(content: string): Promise<void> {
    if (!this.transport || this.state !== 'connected') {
      throw new Error('Not connected');
    }

    const message: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    this.messages.push(message);
    this.setState('thinking');

    await this.transport.send({
      type: 'text',
      payload: content,
      seq: this.messages.length,
    });
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.setState('idle');
  }

  getHistory(): Message[] {
    return [...this.messages];
  }

  clearHistory(): void {
    this.messages = [];
  }
}
