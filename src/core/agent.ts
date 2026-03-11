import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, AgentConfigSchema, AgentState, Message, TransportMessage, ConnectionError } from '../types';
import { WebSocketTransport } from '../transport/websocket';
import { withSpan } from '../observability/tracing';
import { logger } from '../utils/logger';

interface AgentEvents {
  'state:change': (state: AgentState, prevState: AgentState) => void;
  'message': (message: Message) => void;
  'error': (error: Error) => void;
  'connected': () => void;
  'disconnected': (reason: { reason: string; code?: number }) => void;
}

export class Agent extends EventEmitter<AgentEvents> {
  private readonly config: AgentConfig;
  private state: AgentState = 'idle';
  private messages: Message[] = [];
  private transport: WebSocketTransport | null = null;
  private readonly sessionId: string;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

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
      logger.debug('State transition', { from: prev, to: state, sessionId: this.sessionId });
      this.emit('state:change', state, prev);
    }
  }

  async connect(): Promise<void> {
    return withSpan('agent.connect', async (span) => {
      if (this.transport?.isConnected()) {
        logger.warn('Already connected');
        return;
      }

      this.setState('connecting');
      span?.setAttribute('endpoint', this.config.endpoint ?? 'default');

      try {
        this.transport = new WebSocketTransport({
          url: this.config.endpoint!,
          apiKey: this.config.apiKey,
          sessionId: this.sessionId,
          timeout: this.config.connectionTimeout,
        });

        await this.transport.connect();
        this.setupTransportHandlers();
        this.reconnectAttempts = 0;
        this.setState('connected');
        this.emit('connected');
        logger.info('Connected successfully', { sessionId: this.sessionId });
      } catch (error) {
        logger.error('Connection failed', { error, sessionId: this.sessionId });
        this.setState('error');
        throw new ConnectionError('Failed to connect to server', error as Error);
      }
    });
  }

  private setupTransportHandlers(): void {
    if (!this.transport) return;

    this.transport.on('message', (data: TransportMessage) => {
      this.handleMessage(data);
    });

    this.transport.on('close', (code, reason) => {
      logger.info('Connection closed', { code, reason, sessionId: this.sessionId });
      this.handleDisconnect(code, reason);
    });

    this.transport.on('error', (error) => {
      logger.error('Transport error', { error, sessionId: this.sessionId });
      this.emit('error', error);
    });
  }

  private handleMessage(data: TransportMessage): void {
    withSpan('agent.handleMessage', (span) => {
      span?.setAttribute('message.type', data.type);

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
    });
  }

  private handleControlMessage(payload: Record<string, unknown>): void {
    const action = payload['action'];

    switch (action) {
      case 'processing_start':
        this.setState('processing');
        break;
      case 'speaking_start':
        this.setState('speaking');
        break;
      case 'speaking_end':
        this.setState('connected');
        break;
      case 'listening_start':
        this.setState('listening');
        break;
    }
  }

  private handleDisconnect(code: number, reason: string): void {
    this.setState('disconnected');
    this.emit('disconnected', { reason, code });

    if (this.config.reconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts ?? 5)) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    const jitter = Math.random() * 1000;

    logger.info('Scheduling reconnect', {
      attempt: this.reconnectAttempts,
      delay: delay + jitter,
      sessionId: this.sessionId,
    });

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        // Reconnect failed, will retry
      }
    }, delay + jitter);
  }

  async send(content: string): Promise<void> {
    return withSpan('agent.send', async (span) => {
      this.ensureConnected();

      const message: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      this.messages.push(message);
      this.setState('processing');

      span?.setAttribute('message.length', content.length);

      await this.transport!.send({
        type: 'text',
        payload: content,
        seq: this.messages.length,
        timestamp: Date.now(),
      });
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

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
    logger.debug('History cleared', { sessionId: this.sessionId });
  }

  private ensureConnected(): void {
    if (!this.transport?.isConnected()) {
      throw new ConnectionError('Not connected to server');
    }
  }
}
