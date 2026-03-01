import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, AgentConfigSchema, AgentState, Message, TransportMessage } from '../types';
import { WebSocketTransport } from '../transport/websocket';
import { logger } from '../utils/logger';

interface AgentEvents {
  'state:change': (state: AgentState) => void;
  'message': (message: Message) => void;
  'error': (error: Error) => void;
  'connected': () => void;
  'disconnected': () => void;
}

export class Agent extends EventEmitter<AgentEvents> {
  private config: AgentConfig;
  private state: AgentState = 'idle';
  private messages: Message[] = [];
  private transport: WebSocketTransport | null = null;
  private sessionId: string;
  private reconnectAttempts = 0;

  constructor(config: AgentConfig) {
    super();
    this.config = AgentConfigSchema.parse(config);
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
      const prev = this.state;
      this.state = state;
      logger.debug('State transition', { from: prev, to: state });
      this.emit('state:change', state);
    }
  }

  async connect(): Promise<void> {
    if (this.transport?.isConnected()) {
      logger.warn('Already connected');
      return;
    }

    this.setState('connecting');
    logger.info('Connecting to server', { endpoint: this.config.endpoint });

    try {
      this.transport = new WebSocketTransport({
        url: this.config.endpoint!,
        apiKey: this.config.apiKey,
        sessionId: this.sessionId,
      });

      await this.transport.connect();
      this.setupTransportHandlers();
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.emit('connected');
      logger.info('Connected successfully');
    } catch (error) {
      logger.error('Connection failed', { error });
      this.setState('error');
      throw error;
    }
  }

  private setupTransportHandlers(): void {
    if (!this.transport) return;

    this.transport.on('message', (data: TransportMessage) => {
      this.handleMessage(data);
    });

    this.transport.on('close', () => {
      logger.info('Connection closed');
      this.handleDisconnect();
    });

    this.transport.on('error', (error) => {
      logger.error('Transport error', { error });
      this.emit('error', error);
    });
  }

  private handleMessage(data: TransportMessage): void {
    if (data.type === 'text') {
      const message: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.payload as string,
        timestamp: Date.now(),
      };

      this.messages.push(message);
      this.setState('connected');
      this.emit('message', message);
    } else if (data.type === 'control') {
      this.handleControlMessage(data.payload as Record<string, unknown>);
    }
  }

  private handleControlMessage(payload: Record<string, unknown>): void {
    const action = payload['action'];

    if (action === 'processing_start') {
      this.setState('processing');
    } else if (action === 'speaking_start') {
      this.setState('speaking');
    } else if (action === 'speaking_end') {
      this.setState('connected');
    }
  }

  private async handleDisconnect(): Promise<void> {
    this.setState('idle');
    this.emit('disconnected');

    if (this.config.reconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts ?? 5)) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      logger.info('Reconnecting', { attempt: this.reconnectAttempts, delay });

      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        await this.connect();
      } catch {
        // Reconnect failed, will retry
      }
    }
  }

  async send(content: string): Promise<void> {
    this.ensureConnected();

    const message: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    this.messages.push(message);
    this.setState('processing');

    await this.transport!.send({
      type: 'text',
      payload: content,
      seq: this.messages.length,
      timestamp: Date.now(),
    });
  }

  async sendAudio(buffer: ArrayBuffer): Promise<void> {
    this.ensureConnected();

    await this.transport!.send({
      type: 'audio',
      payload: buffer,
      seq: Date.now(),
      timestamp: Date.now(),
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
    logger.debug('History cleared');
  }

  private ensureConnected(): void {
    if (!this.transport?.isConnected()) {
      throw new Error('Not connected');
    }
  }
}
