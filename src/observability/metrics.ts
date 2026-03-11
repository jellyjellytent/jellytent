import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { TelemetryConfig, AgentState } from '../types';

export class MetricsCollector {
  private readonly registry: Registry;
  private readonly config: TelemetryConfig;

  // Counters
  private readonly messagesTotal: Counter;
  private readonly audioFramesTotal: Counter;
  private readonly errorsTotal: Counter;
  private readonly connectionsTotal: Counter;
  private readonly vadActivationsTotal: Counter;
  private readonly pluginsLoadedTotal: Counter;
  private readonly pluginErrorsTotal: Counter;

  // Histograms
  private readonly latencySeconds: Histogram;
  private readonly audioProcessingSeconds: Histogram;

  // Gauges
  private readonly activeSessions: Gauge;
  private readonly currentState: Gauge;

  constructor(config: Partial<TelemetryConfig>) {
    this.config = {
      enabled: true,
      serviceName: 'jellytent',
      sampleRate: 0.1,
      exportInterval: 10000,
      ...config,
    };

    this.registry = new Registry();

    // Collect default Node.js metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'jellytent_',
    });

    // Initialize counters
    this.messagesTotal = new Counter({
      name: 'jellytent_messages_total',
      help: 'Total number of messages processed',
      labelNames: ['direction', 'type'],
      registers: [this.registry],
    });

    this.audioFramesTotal = new Counter({
      name: 'jellytent_audio_frames_total',
      help: 'Total audio frames processed',
      registers: [this.registry],
    });

    this.errorsTotal = new Counter({
      name: 'jellytent_errors_total',
      help: 'Total errors',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.connectionsTotal = new Counter({
      name: 'jellytent_connections_total',
      help: 'Total WebSocket connections',
      registers: [this.registry],
    });

    this.vadActivationsTotal = new Counter({
      name: 'jellytent_vad_activations_total',
      help: 'VAD activation events',
      labelNames: ['state'],
      registers: [this.registry],
    });

    this.pluginsLoadedTotal = new Counter({
      name: 'jellytent_plugins_loaded_total',
      help: 'Total plugins loaded',
      registers: [this.registry],
    });

    this.pluginErrorsTotal = new Counter({
      name: 'jellytent_plugin_errors_total',
      help: 'Plugin errors',
      labelNames: ['plugin'],
      registers: [this.registry],
    });

    // Initialize histograms
    this.latencySeconds = new Histogram({
      name: 'jellytent_latency_seconds',
      help: 'Operation latency in seconds',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.audioProcessingSeconds = new Histogram({
      name: 'jellytent_audio_processing_seconds',
      help: 'Audio frame processing time',
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
      registers: [this.registry],
    });

    // Initialize gauges
    this.activeSessions = new Gauge({
      name: 'jellytent_active_sessions',
      help: 'Current active sessions',
      registers: [this.registry],
    });

    this.currentState = new Gauge({
      name: 'jellytent_current_state',
      help: 'Current agent state (encoded)',
      labelNames: ['state'],
      registers: [this.registry],
    });
  }

  incrementCounter(
    name: 'messages_total' | 'audio_frames_total' | 'errors_total' | 'connections_total' | 'plugins_loaded_total' | 'plugin_errors_total',
    labels?: Record<string, string>,
  ): void {
    switch (name) {
      case 'messages_total':
        this.messagesTotal.inc(labels);
        break;
      case 'audio_frames_total':
        this.audioFramesTotal.inc();
        break;
      case 'errors_total':
        this.errorsTotal.inc(labels);
        break;
      case 'connections_total':
        this.connectionsTotal.inc();
        break;
      case 'plugins_loaded_total':
        this.pluginsLoadedTotal.inc();
        break;
      case 'plugin_errors_total':
        this.pluginErrorsTotal.inc(labels);
        break;
    }
  }

  recordLatency(operation: string, durationMs: number): void {
    this.latencySeconds.observe({ operation }, durationMs / 1000);
  }

  recordAudioProcessing(durationMs: number): void {
    this.audioProcessingSeconds.observe(durationMs / 1000);
  }

  recordVadEvent(active: boolean): void {
    this.vadActivationsTotal.inc({ state: active ? 'active' : 'inactive' });
  }

  recordStateChange(state: AgentState): void {
    // Reset all state labels
    this.currentState.reset();
    this.currentState.set({ state }, 1);
  }

  setActiveSessions(count: number): void {
    this.activeSessions.set(count);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }
}
