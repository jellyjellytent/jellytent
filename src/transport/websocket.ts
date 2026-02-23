import EventEmitter from 'eventemitter3';
import WebSocket from 'ws';
import { TransportMessage } from '../types';

interface TransportConfig {
  url: string;
  apiKey: string;
  sessionId: string;
}

interface TransportEvents {
  'message': (message: TransportMessage) => void;
  'close': () => void;
  'error': (error: Error) => void;
}

export class WebSocketTransport extends EventEmitter<TransportEvents> {
  private config: TransportConfig;
  private ws: WebSocket | null = null;
  private seq: number = 0;

  constructor(config: TransportConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.url);
      url.searchParams.set('session', this.config.sessionId);

      this.ws = new WebSocket(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Session-Id': this.config.sessionId,
        },
      });

      this.ws.on('open', () => {
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as TransportMessage;
          this.emit('message', message);
        } catch (e) {
          this.emit('error', new Error('Failed to parse message'));
        }
      });

      this.ws.on('close', () => {
        this.emit('close');
      });

      this.ws.on('error', (error) => {
        reject(error);
        this.emit('error', error);
      });
    });
  }

  async send(message: TransportMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    message.seq = ++this.seq;

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(message), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
