import EventEmitter from 'eventemitter3';
import { z } from 'zod';
import { Agent } from './agent';
import { AvatarEngine } from '../avatar/engine';
import { VoicePipeline } from '../voice/pipeline';
import { LLMClient } from '../llm/client';
import { PluginManager } from '../plugins/manager';
import { MetricsCollector } from '../observability/metrics';
import { TracingProvider, createSpan } from '../observability/tracing';
import { loadWasmModule } from '../voice/wasm-loader';
import {
  AgentState,
  ResponsePayload,
  AvatarState,
  AvatarConfigSchema,
  VoiceConfigSchema,
  LLMConfigSchema,
  TelemetryConfigSchema,
  JellytentError,
} from '../types';
import { Plugin } from '../plugins/types';
import { logger } from '../utils/logger';

const JellytentConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  endpoint: z.string().url().default('wss://api.jellyjelly.io/v1/agent'),
  sessionId: z.string().optional(),
  avatar: AvatarConfigSchema.optional(),
  voice: VoiceConfigSchema.optional(),
  llm: LLMConfigSchema.optional(),
  telemetry: TelemetryConfigSchema.optional(),
});

export type JellytentConfig = z.input<typeof JellytentConfigSchema>;

export interface JellytentEvents {
  'state:change': (state: AgentState, prevState: AgentState) => void;
  'connected': () => void;
  'disconnected': (reason: { reason: string; code?: number }) => void;
  'response': (response: ResponsePayload) => void;
  'response:start': (id: string) => void;
  'response:chunk': (id: string, chunk: string) => void;
  'response:end': (id: string) => void;
  'avatar:update': (state: AvatarState) => void;
  'voice:activity': (active: { active: boolean; confidence: number }) => void;
  'plugin:loaded': (name: string) => void;
  'plugin:error': (name: string, error: Error) => void;
  'error': (error: Error) => void;
}

export class Jellytent extends EventEmitter<JellytentEvents> {
  private readonly config: z.infer<typeof JellytentConfigSchema>;
  private agent: Agent | null = null;
  private avatar: AvatarEngine | null = null;
  private voicePipeline: VoicePipeline | null = null;
  private llmClient: LLMClient | null = null;
  private pluginManager: PluginManager | null = null;
  private metrics: MetricsCollector | null = null;
  private tracing: TracingProvider | null = null;
  private initialized = false;
  private currentState: AgentState = 'uninitialized';

  constructor(config: JellytentConfig) {
    super();
    this.config = JellytentConfigSchema.parse(config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new JellytentError('Already initialized', 'ALREADY_INITIALIZED');
    }

    this.setState('initializing');
    const initSpan = createSpan('jellytent.initialize');

    try {
      // Initialize telemetry first
      if (this.config.telemetry?.enabled) {
        this.metrics = new MetricsCollector(this.config.telemetry);
        this.tracing = new TracingProvider(this.config.telemetry);
        await this.tracing.initialize();
        logger.info('Telemetry initialized');
      }

      // Load WASM module for audio processing
      const wasmModule = await loadWasmModule();
      logger.info('WASM module loaded');

      // Initialize plugin manager
      this.pluginManager = new PluginManager({
        metrics: this.metrics,
        logger: logger.child('plugins'),
      });

      // Initialize voice pipeline with WASM
      this.voicePipeline = new VoicePipeline({
        wasmModule,
        config: this.config.voice ?? {},
        metrics: this.metrics,
      });

      // Initialize avatar engine
      if (this.config.avatar?.enabled !== false) {
        this.avatar = new AvatarEngine(this.config.avatar ?? {});
        this.avatar.on('frame', (state) => {
          this.emit('avatar:update', state);
        });
        logger.info('Avatar engine initialized');
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
      this.setState('idle');

      initSpan?.setAttribute('success', true);
      logger.info('Jellytent initialized successfully');
    } catch (error) {
      initSpan?.setAttribute('success', false);
      initSpan?.recordException(error as Error);
      this.setState('error');
      throw error;
    } finally {
      initSpan?.end();
    }
  }

  private setupAgentHandlers(): void {
    if (!this.agent) return;

    this.agent.on('state:change', (state, prevState) => {
      this.currentState = state;
      this.emit('state:change', state, prevState);
      this.metrics?.recordStateChange(state);

      if (state === 'speaking' && this.avatar) {
        this.avatar.startSpeakingAnimation();
      } else if (prevState === 'speaking' && this.avatar) {
        this.avatar.stopSpeakingAnimation();
      }
    });

    this.agent.on('connected', () => {
      this.metrics?.incrementCounter('connections_total');
      this.emit('connected');
    });

    this.agent.on('disconnected', (reason) => {
      this.emit('disconnected', reason);
    });

    this.agent.on('error', (error) => {
      this.metrics?.incrementCounter('errors_total', { type: error.name });
      this.emit('error', error);
    });

    this.agent.on('message', async (message) => {
      // Run through plugin pipeline
      let processedContent = message.content;

      if (this.pluginManager) {
        const result = await this.pluginManager.processResponse(message.content);
        processedContent = result.content;
      }

      this.emit('response', {
        id: message.id,
        text: processedContent,
        timestamp: message.timestamp,
        isFinal: true,
        metadata: {
          processingTime: Date.now() - message.timestamp,
        },
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

    const startTime = Date.now();

    // Process through plugins
    if (this.pluginManager) {
      const result = await this.pluginManager.processMessage(text);
      if (result.handled) {
        return;
      }
      text = result.content;
    }

    await this.agent!.send(text);

    this.metrics?.recordLatency('message_send', Date.now() - startTime);
  }

  startAudioStream(): void {
    this.ensureInitialized();

    this.voicePipeline!.on('vad:change', (active, confidence) => {
      this.emit('voice:activity', { active, confidence });
      this.metrics?.recordVadEvent(active);
    });

    this.voicePipeline!.on('audio:processed', (buffer) => {
      this.agent!.sendAudio(buffer);
    });

    this.voicePipeline!.start();
    logger.info('Audio stream started');
  }

  stopAudioStream(): void {
    this.voicePipeline?.stop();
    logger.info('Audio stream stopped');
  }

  registerPlugin(plugin: Plugin): void {
    this.ensureInitialized();
    this.pluginManager!.register(plugin);
    this.emit('plugin:loaded', plugin.name);
  }

  unregisterPlugin(name: string): void {
    this.ensureInitialized();
    this.pluginManager!.unregister(name);
  }

  getState(): AgentState {
    return this.currentState;
  }

  getSessionId(): string | undefined {
    return this.agent?.getSessionId();
  }

  private setState(state: AgentState): void {
    const prev = this.currentState;
    this.currentState = state;
    if (prev !== state) {
      this.emit('state:change', state, prev);
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.agent) {
      throw new JellytentError(
        'Jellytent not initialized. Call initialize() first.',
        'NOT_INITIALIZED',
      );
    }
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    this.avatar?.destroy();
    this.voicePipeline?.stop();
    await this.tracing?.shutdown();
    this.removeAllListeners();

    this.agent = null;
    this.avatar = null;
    this.voicePipeline = null;
    this.llmClient = null;
    this.pluginManager = null;
    this.initialized = false;

    logger.info('Jellytent destroyed');
  }
}
