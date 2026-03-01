import EventEmitter from 'eventemitter3';
import { z } from 'zod';
import { Agent } from './agent';
import { AvatarEngine } from '../avatar/engine';
import { VoicePipeline } from '../voice/pipeline';
import { LLMClient } from '../llm/client';
import { loadWasmModule } from '../voice/wasm-loader';
import {
  AgentState,
  ResponsePayload,
  AvatarState,
  AvatarConfigSchema,
  VoiceConfigSchema,
  LLMConfigSchema,
} from '../types';

const JellytentConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  endpoint: z.string().url().default('wss://api.jellyjelly.io/v1/agent'),
  sessionId: z.string().optional(),
  avatar: AvatarConfigSchema.optional(),
  voice: VoiceConfigSchema.optional(),
  llm: LLMConfigSchema.optional(),
});

export type JellytentConfig = z.input<typeof JellytentConfigSchema>;

export interface JellytentEvents {
  'state:change': (state: AgentState) => void;
  'connected': () => void;
  'disconnected': (reason: { reason: string }) => void;
  'response': (response: ResponsePayload) => void;
  'response:start': () => void;
  'response:end': () => void;
  'avatar:update': (state: AvatarState) => void;
  'voice:activity': (active: { active: boolean }) => void;
  'error': (error: Error) => void;
}

export class Jellytent extends EventEmitter<JellytentEvents> {
  private config: z.infer<typeof JellytentConfigSchema>;
  private agent: Agent | null = null;
  private avatar: AvatarEngine | null = null;
  private voicePipeline: VoicePipeline | null = null;
  private llmClient: LLMClient | null = null;
  private initialized = false;

  constructor(config: JellytentConfig) {
    super();
    this.config = JellytentConfigSchema.parse(config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('Already initialized');
    }

    // Load WASM module for audio processing
    const wasmModule = await loadWasmModule();

    // Initialize voice pipeline with WASM
    this.voicePipeline = new VoicePipeline({
      wasmModule,
      config: this.config.voice ?? {},
    });

    // Initialize avatar engine
    if (this.config.avatar?.enabled !== false) {
      this.avatar = new AvatarEngine(this.config.avatar ?? {});
      this.avatar.on('frame', (state) => {
        this.emit('avatar:update', state);
      });
    }

    // Initialize LLM client
    this.llmClient = new LLMClient(this.config.llm ?? {});

    // Create agent
    this.agent = new Agent({
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint,
      sessionId: this.config.sessionId,
    });

    this.setupAgentHandlers();
    this.initialized = true;
  }

  private setupAgentHandlers(): void {
    if (!this.agent) return;

    this.agent.on('state:change', (state) => {
      this.emit('state:change', state);

      if (state === 'speaking' && this.avatar) {
        this.avatar.startSpeakingAnimation();
      } else if (state !== 'speaking' && this.avatar) {
        this.avatar.stopSpeakingAnimation();
      }
    });

    this.agent.on('connected', () => this.emit('connected'));
    this.agent.on('disconnected', () => this.emit('disconnected', { reason: 'connection_lost' }));
    this.agent.on('error', (error) => this.emit('error', error));

    this.agent.on('message', (message) => {
      this.emit('response', {
        id: message.id,
        text: message.content,
        timestamp: message.timestamp,
        isFinal: true,
      });
    });
  }

  async connect(): Promise<void> {
    this.ensureInitialized();
    await this.agent!.connect();
  }

  async disconnect(): Promise<void> {
    this.ensureInitialized();
    this.stopAudioStream();
    await this.agent!.disconnect();
  }

  async sendText(text: string): Promise<void> {
    this.ensureInitialized();
    await this.agent!.send(text);
  }

  startAudioStream(): void {
    this.ensureInitialized();

    this.voicePipeline!.on('vad:change', (active) => {
      this.emit('voice:activity', { active });
    });

    this.voicePipeline!.on('audio:processed', (buffer) => {
      this.agent!.sendAudio(buffer);
    });

    this.voicePipeline!.start();
  }

  stopAudioStream(): void {
    this.voicePipeline?.stop();
  }

  getState(): AgentState {
    return this.agent?.getState() ?? 'uninitialized';
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.agent) {
      throw new Error('Jellytent not initialized. Call initialize() first.');
    }
  }
}
