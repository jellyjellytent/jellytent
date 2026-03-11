import EventEmitter from 'eventemitter3';
import WebSocket from 'ws';
import { TransportMessage, ConnectionError } from '../types';
import { withSpan } from '../observability/tracing';
import { logger } from '../utils/logger';

interface TransportConfig {
  url: string;
  apiKey: string;
  sessionId: string;
  pingInterval?: number;
  timeout?: number;
}

interface TransportEvents {
  'message': (message: TransportMessage) => void;
  'close': (code: number, reason: string) => void;
  'error': (error: Error) => void;
}

const DEFAULT_PING_INTERVAL = 30000;
const DEFAULT_PONG_TIMEOUT = 10000;
const DEFAULT_CONNECTION_TIMEOUT = 10000;

export class WebSocketTransport extends EventEmitter<TransportEvents> {
  private readonly config: TransportConfig;
  private ws: WebSocket | null = null;
  private seq: number = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: TransportMessage[] = [];
  private pendingAcks: Map<number, { resolve: () => void; reject: (err: Error) => void }> = new Map();

  constructor(config: TransportConfig) {
    super();
    this.config = {
      ...config,
      pingInterval: config.pingInterval ?? DEFAULT_PING_INTERVAL,
      timeout: config.timeout ?? DEFAULT_CONNECTION_TIMEOUT,
    };
  }

  async connect(): Promise<void> {
    return withSpan('transport.connect', async (span) => {
      return new Promise((resolve, reject) => {
        const url = new URL(this.config.url);
        url.searchParams.set('session', this.config.sessionId);

        logger.debug('Opening WebSocket connection', { url: url.toString() });
        span?.setAttribute('ws.url', url.hostname);

        this.ws = new WebSocket(url.toString(), {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Session-Id': this.config.sessionId,
            'X-Client-Version': '0.4.0',
            'X-Client-Platform': process.platform,
          },
          handshakeTimeout: this.config.timeout,
        });

        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(new ConnectionError('Connection timeout'));
        }, this.config.timeout);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.startPingLoop();
          this.flushMessageQueue();
          span?.setAttribute('connected', true);
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          this.cleanup();
          this.emit('close', code, reason.toString());
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          span?.setAttribute('error', true);
          reject(error);
          this.emit('error', error);
        });

        this.ws.on('pong', () => {
          this.clearPongTimer();
        });
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      // Handle binary audio data
      if (Buffer.isBuffer(data)) {
        this.emit('message', {
          type: 'audio',
          payload: data.buffer,
          seq: 0,
          timestamp: Date.now(),
        });
        return;
      }

      const message = JSON.parse(data.toString()) as TransportMessage;

      // Handle acknowledgments
      if (message.type === 'ack' && message.correlationId) {
        const pending = this.pendingAcks.get(parseInt(message.correlationId));
        if (pending) {
          pending.resolve();
          this.pendingAcks.delete(parseInt(message.correlationId));
        }
        return;
      }

      this.emit('message', message);
    } catch (error) {
      logger.error('Failed to parse message', { error });
    }
  }

  private startPingLoop(): void {
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      }
    }, this.config.pingInterval);
  }

  private sendPing(): void {
    if (!this.ws) return;

    this.ws.ping();

    this.pongTimer = setTimeout(() => {
      logger.warn('Pong timeout, closing connection');
      this.ws?.close(4000, 'Pong timeout');
    }, DEFAULT_PONG_TIMEOUT);
  }

  private clearPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.clearPongTimer();

    // Reject all pending acks
    for (const [, pending] of this.pendingAcks) {
      pending.reject(new Error('Connection closed'));
    }
    this.pendingAcks.clear();

    this.ws = null;
  }

  async send(message: TransportMessage): Promise<void> {
    message.seq = ++this.seq;

    if (!this.isConnected()) {
      this.messageQueue.push(message);
      return;
    }

    return this.sendImmediate(message);
  }

  private async sendImmediate(message: TransportMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload = message.type === 'audio'
        ? Buffer.from(message.payload as ArrayBuffer)
        : JSON.stringify(message);

      this.ws!.send(payload, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async flushMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        await this.sendImmediate(message);
      } catch (error) {
        logger.error('Failed to send queued message', { error, seq: message.seq });
      }
    }
  }

  async close(): Promise<void> {
    this.cleanup();
    if (this.ws) {
      return new Promise((resolve) => {
        this.ws!.once('close', () => resolve());
        this.ws!.close(1000, 'Client disconnect');
      });
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
