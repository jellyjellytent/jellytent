import EventEmitter from 'eventemitter3';
import WebSocket from 'ws';
import { TransportMessage } from '../types';
import { logger } from '../utils/logger';

interface TransportConfig {
  url: string;
  apiKey: string;
  sessionId: string;
  pingInterval?: number;
}

interface TransportEvents {
  'message': (message: TransportMessage) => void;
  'close': () => void;
  'error': (error: Error) => void;
}

const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 10000;

export class WebSocketTransport extends EventEmitter<TransportEvents> {
  private config: TransportConfig;
  private ws: WebSocket | null = null;
  private seq: number = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: TransportMessage[] = [];

  constructor(config: TransportConfig) {
    super();
    this.config = {
      ...config,
      pingInterval: config.pingInterval ?? PING_INTERVAL,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.url);
      url.searchParams.set('session', this.config.sessionId);

      logger.debug('Opening WebSocket connection', { url: url.toString() });

      this.ws = new WebSocket(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Session-Id': this.config.sessionId,
          'X-Client-Version': '0.3.0',
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.ws?.close();
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.startPingLoop();
        this.flushMessageQueue();
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        logger.debug('WebSocket closed', { code, reason: reason.toString() });
        this.cleanup();
        this.emit('close');
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
        this.emit('error', error);
      });

      this.ws.on('pong', () => {
        this.clearPongTimer();
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as TransportMessage;

      if (message.type === 'pong') {
        this.clearPongTimer();
        return;
      }

      this.emit('message', message);
    } catch {
      logger.error('Failed to parse message', { data: data.toString().slice(0, 100) });
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
      this.ws?.close();
    }, PONG_TIMEOUT);
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
        ? message.payload as ArrayBuffer
        : JSON.stringify(message);

      this.ws!.send(payload, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async flushMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.sendImmediate(message);
    }
  }

  async close(): Promise<void> {
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
