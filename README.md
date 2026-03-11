<p align="center">
  <img src="https://raw.githubusercontent.com/jellyjelly/brand/main/jellytent-logo.svg" alt="Jellytent" width="200" />
</p>

<h1 align="center">Jellytent</h1>

<p align="center">
  <strong>Enterprise-grade AI video chat agent for JellyJelly</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.4.0-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/typescript-5.3-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/rust-1.74-orange.svg" alt="Rust" />
  <img src="https://img.shields.io/badge/python-3.11-green.svg" alt="Python" />
  <img src="https://img.shields.io/badge/license-proprietary-red.svg" alt="License" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build" />
  <img src="https://img.shields.io/badge/coverage-84%25-green.svg" alt="Coverage" />
  <img src="https://img.shields.io/badge/kubernetes-ready-326CE5.svg" alt="Kubernetes" />
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#plugin-system">Plugins</a> •
  <a href="#observability">Observability</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#api-reference">API</a>
</p>

---

## Overview

Jellytent is a production-ready, enterprise-grade real-time video chat agent featuring an interactive jellyfish avatar. Version 0.4.0 introduces a powerful plugin system, comprehensive observability, Python ML components, and Kubernetes-native deployment.

Built for scale, Jellytent combines:
- **TypeScript** for application orchestration
- **Rust/WebAssembly** for real-time audio processing
- **Python** for ML-powered speech recognition and synthesis

### What's New in v0.4.0

- **Plugin System**: Extend functionality with custom plugins
- **Observability**: OpenTelemetry tracing + Prometheus metrics
- **Python ML**: Whisper STT, Coqui TTS, intent classification
- **Kubernetes**: Helm charts with auto-scaling
- **Enhanced Types**: Comprehensive error handling with retry support

---

## Features

### Feature Matrix

| Category | Feature | Description | Status |
|----------|---------|-------------|--------|
| **Core** | Real-time Voice | Full-duplex audio streaming | ✅ Stable |
| | WASM Audio DSP | Rust-compiled processing | ✅ Stable |
| | Animated Avatar | 60fps jellyfish animation | ✅ Stable |
| | WebSocket Transport | Auto-reconnect with backoff | ✅ Stable |
| | LLM Integration | Multi-provider support | ✅ Stable |
| **Enterprise** | Plugin System | Extensible architecture | ✅ Stable |
| | Observability | Tracing + Metrics | ✅ Stable |
| | Python ML | STT/TTS/NLU | ✅ Stable |
| | Kubernetes | Helm + HPA | ✅ Stable |
| | Multi-tenancy | Session isolation | ✅ Stable |

### Audio Processing Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Capture   │───▶│    WASM     │───▶│     VAD     │───▶│   Python    │
│   (16kHz)   │    │  Denoise    │    │  Detection  │    │   Whisper   │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                │
                   ┌─────────────┐    ┌─────────────┐    ┌──────▼──────┐
                   │   Avatar    │◀───│   Coqui     │◀───│     LLM     │
                   │   Animate   │    │    TTS      │    │   Gateway   │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

### Performance Benchmarks

**Audio Processing (WASM)**

| Operation | Latency (p50) | Latency (p99) |
|-----------|---------------|---------------|
| VAD (16ms frame) | 0.1ms | 0.3ms |
| Noise reduction | 0.3ms | 0.5ms |
| Resampling | 0.15ms | 0.25ms |

**End-to-End Latency**

| Operation | Latency (p50) | Latency (p99) |
|-----------|---------------|---------------|
| WebSocket connect | 45ms | 120ms |
| Text message round-trip | 180ms | 450ms |
| Voice message round-trip | 320ms | 680ms |

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      Jellytent SDK (TypeScript)                      │  │
│  │                                                                      │  │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │   │   Avatar   │  │   Voice    │  │    LLM     │  │  Plugins   │    │  │
│  │   │   Engine   │  │  Pipeline  │  │   Client   │  │  Manager   │    │  │
│  │   │            │  │            │  │            │  │            │    │  │
│  │   │  60fps     │  │  Capture   │  │  OpenAI    │  │  Hooks     │    │  │
│  │   │  Render    │  │  Process   │  │  Anthropic │  │  Lifecycle │    │  │
│  │   │  Animate   │  │  Stream    │  │  JellyJelly│  │  Context   │    │  │
│  │   └────────────┘  └─────┬──────┘  └────────────┘  └────────────┘    │  │
│  │                         │                                            │  │
│  │                  ┌──────┴──────┐                                     │  │
│  │                  │  WASM Core  │  ◀── Rust                          │  │
│  │                  │             │                                     │  │
│  │                  │  VAD        │                                     │  │
│  │                  │  Denoise    │                                     │  │
│  │                  │  Resample   │                                     │  │
│  │                  └─────────────┘                                     │  │
│  │                                                                      │  │
│  │   ┌────────────────────────────────────────────────────────────┐    │  │
│  │   │                    Observability                           │    │  │
│  │   │   Tracing (OTLP)  │  Metrics (Prometheus)  │  Logging      │    │  │
│  │   └────────────────────────────────────────────────────────────┘    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                         │                                  │
├─────────────────────────────────────────┼──────────────────────────────────┤
│                        WebSocket Transport                                 │
└─────────────────────────────────────────┼──────────────────────────────────┘
                                          │
┌─────────────────────────────────────────┼──────────────────────────────────┐
│                              SERVER TIER                                   │
├─────────────────────────────────────────┼──────────────────────────────────┤
│                                         ▼                                  │
│   ┌─────────────────────────────────────────────────────────────────┐     │
│   │                     Kubernetes Cluster                          │     │
│   │                                                                 │     │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │     │
│   │   │  Jellytent  │  │  Jellytent  │  │  Jellytent  │   (HPA)    │     │
│   │   │   Pod #1    │  │   Pod #2    │  │   Pod #3    │            │     │
│   │   └─────────────┘  └─────────────┘  └─────────────┘            │     │
│   │          │                │                │                    │     │
│   │          └────────────────┼────────────────┘                    │     │
│   │                           │                                     │     │
│   │   ┌───────────────────────▼───────────────────────┐            │     │
│   │   │              Service Mesh                      │            │     │
│   │   └───────────────────────┬───────────────────────┘            │     │
│   │                           │                                     │     │
│   │   ┌───────────┬───────────┼───────────┬───────────┐            │     │
│   │   │           │           │           │           │            │     │
│   │   ▼           ▼           ▼           ▼           ▼            │     │
│   │ ┌─────┐   ┌─────┐   ┌─────────┐   ┌─────┐   ┌─────────┐       │     │
│   │ │Redis│   │ STT │   │   LLM   │   │ TTS │   │   NLU   │       │     │
│   │ │     │   │(Py) │   │ Gateway │   │(Py) │   │  (Py)   │       │     │
│   │ └─────┘   └─────┘   └─────────┘   └─────┘   └─────────┘       │     │
│   │                                                                 │     │
│   └─────────────────────────────────────────────────────────────────┘     │
│                                                                            │
│   ┌─────────────────────────────────────────────────────────────────┐     │
│   │                    Observability Stack                          │     │
│   │                                                                 │     │
│   │   ┌───────────┐   ┌───────────┐   ┌───────────┐                │     │
│   │   │   Jaeger  │   │Prometheus │   │   Loki    │                │     │
│   │   │  Tracing  │   │  Metrics  │   │   Logs    │                │     │
│   │   └───────────┘   └───────────┘   └───────────┘                │     │
│   │                                                                 │     │
│   └─────────────────────────────────────────────────────────────────┘     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Module Architecture

```
@jellyjelly/jellytent
├── core/
│   ├── Jellytent          # Main orchestrator
│   └── Agent              # Connection & messaging
├── transport/
│   └── WebSocketTransport # WebSocket client
├── voice/
│   ├── VoicePipeline      # Audio processing
│   └── WasmLoader         # WASM module loader
├── avatar/
│   └── AvatarEngine       # Animation system
├── llm/
│   └── LLMClient          # LLM abstraction
├── plugins/
│   ├── PluginManager      # Plugin lifecycle
│   └── types              # Plugin interfaces
├── observability/
│   ├── MetricsCollector   # Prometheus metrics
│   └── TracingProvider    # OpenTelemetry tracing
└── types/
    └── index              # All TypeScript types
```

---

## Installation

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | ≥18.0.0 | Runtime |
| Rust | ≥1.74 | WASM build |
| Python | ≥3.11 | ML components |
| wasm-pack | Latest | WASM toolchain |
| Docker | ≥24.0 | Containerization |

### NPM Package

```bash
npm install @jellyjelly/jellytent
```

### Full Development Setup

```bash
# Clone repository
git clone https://github.com/jellyjelly/jellytent.git
cd jellytent

# Install Node.js dependencies
npm install

# Install Python ML dependencies
cd python && pip install -e ".[all,dev]" && cd ..

# Install Rust toolchain (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack

# Build everything
npm run build

# Verify installation
npm test
pytest python/tests
```

### Docker Installation

```bash
# Build multi-stage Docker image
docker build -t jellytent:0.4.0 -f docker/Dockerfile .

# Run with configuration
docker run -p 8080:8080 -p 9090:9090 \
  -e JELLYTENT_API_KEY=your_key \
  -e LOG_LEVEL=info \
  -e TELEMETRY_ENABLED=true \
  jellytent:0.4.0
```

### Kubernetes Installation

```bash
# Add Helm repository
helm repo add jellyjelly https://charts.jellyjelly.io
helm repo update

# Install with default values
helm install jellytent jellyjelly/jellytent \
  --set config.apiKey=$JELLYTENT_API_KEY

# Install with custom values
helm install jellytent jellyjelly/jellytent \
  -f values-production.yaml
```

---

## Quick Start

### Basic Usage

```typescript
import { Jellytent } from '@jellyjelly/jellytent';

const client = new Jellytent({
  apiKey: process.env.JELLYTENT_API_KEY!,
  avatar: { enabled: true, style: 'luminescent' },
  telemetry: { enabled: true },
});

await client.initialize();
await client.connect();

client.on('response', (response) => {
  console.log('Agent:', response.text);
});

await client.sendText('Hello!');
```

### With Plugins

```typescript
import { Jellytent, Plugin } from '@jellyjelly/jellytent';

// Define a custom plugin
const weatherPlugin: Plugin = {
  name: 'weather',
  version: '1.0.0',

  async onMessage(message, ctx) {
    if (message.toLowerCase().includes('weather')) {
      ctx.logger.info('Weather query detected');

      // Fetch weather data
      const weather = await fetchWeather();

      return {
        handled: false,  // Let LLM process with context
        content: `${message}\n\n[Current weather: ${weather}]`,
      };
    }
  },
};

const client = new Jellytent({
  apiKey: process.env.JELLYTENT_API_KEY!,
});

await client.initialize();
client.registerPlugin(weatherPlugin);
await client.connect();
```

### With Full Observability

```typescript
import { Jellytent } from '@jellyjelly/jellytent';

const client = new Jellytent({
  apiKey: process.env.JELLYTENT_API_KEY!,
  telemetry: {
    enabled: true,
    endpoint: 'http://otel-collector:4318',
    serviceName: 'my-app-jellytent',
    sampleRate: 0.1,  // Sample 10% of traces
  },
});

await client.initialize();

// Metrics available at runtime
const metrics = await client.getMetrics();  // Prometheus format
```

---

## Plugin System

### Plugin Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Register   │────▶│    onInit    │────▶│    Active    │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
       ┌─────────────────────────────────────────┤
       │                                         │
       ▼                                         ▼
┌──────────────┐                          ┌──────────────┐
│  onMessage   │◀────────────────────────▶│ onResponse   │
└──────────────┘                          └──────────────┘
       │                                         │
       └─────────────────────────────────────────┤
                                                 │
┌──────────────┐     ┌──────────────┐     ┌──────▼───────┐
│  Unregister  │◀────│  onDestroy   │◀────│   Disable    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Plugin Interface

```typescript
interface Plugin {
  // Required
  name: string;
  version: string;

  // Optional metadata
  description?: string;
  priority?: number;  // Higher = runs first

  // Lifecycle hooks
  onInit?(ctx: PluginContext): Promise<void>;
  onDestroy?(ctx: PluginContext): Promise<void>;

  // Message processing
  onMessage?(message: string, ctx: PluginContext): Promise<PluginResult | void>;
  onResponse?(response: string, ctx: PluginContext): Promise<string | void>;

  // State changes
  onStateChange?(state: string, ctx: PluginContext): Promise<void>;

  // Tool handling
  onToolCall?(
    toolName: string,
    args: Record<string, unknown>,
    ctx: PluginContext,
  ): Promise<unknown>;
}

interface PluginContext {
  logger: Logger;
  sessionId?: string;
  config: Record<string, unknown>;
}

interface PluginResult {
  handled: boolean;  // If true, stop processing
  content: string;   // Modified content
  action?: string;   // Optional action identifier
  payload?: unknown; // Optional data
}
```

### Example Plugins

#### Logging Plugin

```typescript
const loggingPlugin: Plugin = {
  name: 'logging',
  version: '1.0.0',
  priority: 100,  // Run first

  async onMessage(message, ctx) {
    ctx.logger.info('User message', { length: message.length });
  },

  async onResponse(response, ctx) {
    ctx.logger.info('Agent response', { length: response.length });
    return response;
  },
};
```

#### Content Filter Plugin

```typescript
const filterPlugin: Plugin = {
  name: 'content-filter',
  version: '1.0.0',

  async onResponse(response, ctx) {
    // Filter sensitive information
    return response.replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[REDACTED]');
  },
};
```

#### Command Handler Plugin

```typescript
const commandPlugin: Plugin = {
  name: 'commands',
  version: '1.0.0',

  async onMessage(message, ctx) {
    if (message.startsWith('/')) {
      const [command, ...args] = message.slice(1).split(' ');

      switch (command) {
        case 'help':
          return {
            handled: true,
            content: 'Available commands: /help, /clear, /status',
          };
        case 'clear':
          // Clear conversation history
          return { handled: true, content: 'History cleared.' };
        default:
          return { handled: false, content: message };
      }
    }
  },
};
```

---

## Observability

### Metrics

Jellytent exposes Prometheus-compatible metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `jellytent_messages_total` | Counter | direction, type | Total messages |
| `jellytent_audio_frames_total` | Counter | - | Audio frames processed |
| `jellytent_latency_seconds` | Histogram | operation | Operation latency |
| `jellytent_active_sessions` | Gauge | - | Current sessions |
| `jellytent_vad_activations_total` | Counter | state | VAD events |
| `jellytent_errors_total` | Counter | type | Error count |
| `jellytent_plugins_loaded_total` | Counter | - | Plugins loaded |
| `jellytent_plugin_errors_total` | Counter | plugin | Plugin errors |

#### Accessing Metrics

```typescript
// Programmatic access
const metricsCollector = client.getMetrics();
const prometheusText = await metricsCollector.getMetrics();

// HTTP endpoint (server mode)
// GET /metrics
```

#### Grafana Dashboard

Import our pre-built dashboard: `dashboards/jellytent-overview.json`

### Tracing

OpenTelemetry traces are emitted for all major operations:

```
jellytent.initialize
├── wasm.load
├── plugins.init
└── avatar.init

jellytent.connect
└── transport.connect
    └── websocket.handshake

agent.send
├── plugins.processMessage
├── transport.send
└── llm.complete (if applicable)

agent.handleMessage
├── plugins.processResponse
└── avatar.startSpeaking
```

#### Trace Configuration

```typescript
const client = new Jellytent({
  apiKey: '...',
  telemetry: {
    enabled: true,
    endpoint: 'http://jaeger:4318/v1/traces',
    serviceName: 'jellytent-prod',
    sampleRate: 0.1,
    exportInterval: 10000,
  },
});
```

### Logging

Structured JSON logging in production:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "jellytent",
  "message": "Connected successfully",
  "sessionId": "abc-123",
  "endpoint": "wss://api.jellyjelly.io"
}
```

Configuration:

```typescript
// Environment variable
LOG_LEVEL=debug  // debug | info | warn | error

// Or in code
import { logger } from '@jellyjelly/jellytent';
logger.configure({ level: 'debug', structured: true });
```

---

## Deployment

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  jellytent:
    build: .
    ports:
      - "8080:8080"
      - "9090:9090"
    environment:
      - JELLYTENT_API_KEY=${JELLYTENT_API_KEY}
      - LOG_LEVEL=debug
      - TELEMETRY_ENABLED=true
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
    depends_on:
      - otel-collector
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4318:4318"
    volumes:
      - ./otel-config.yaml:/etc/otel/config.yaml

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

### Kubernetes (Production)

#### Using Helm

```bash
# Install
helm install jellytent jellyjelly/jellytent \
  --namespace jellytent \
  --create-namespace \
  --set image.tag=0.4.0 \
  --set replicaCount=3 \
  --set config.apiKey=$JELLYTENT_API_KEY \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=3 \
  --set autoscaling.maxReplicas=20

# Upgrade
helm upgrade jellytent jellyjelly/jellytent \
  --reuse-values \
  --set image.tag=0.4.1

# Check status
kubectl get pods -n jellytent
kubectl get hpa -n jellytent
```

#### Helm Values (Production)

```yaml
# values-production.yaml
replicaCount: 3

image:
  repository: jellyjelly/jellytent
  tag: "0.4.0"
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

config:
  logLevel: info
  telemetry:
    enabled: true
    endpoint: http://otel-collector.monitoring:4318
    sampleRate: 0.1

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/websocket-services: jellytent
  hosts:
    - host: jellytent.yourcompany.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: jellytent-tls
      hosts:
        - jellytent.yourcompany.com

redis:
  enabled: true
  architecture: replication
  auth:
    enabled: true
```

### Auto-Scaling Behavior

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 60
    policies:
      - type: Pods
        value: 4
        periodSeconds: 60
      - type: Percent
        value: 100
        periodSeconds: 60
    selectPolicy: Max
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Percent
        value: 25
        periodSeconds: 120
```

---

## API Reference

### Jellytent Class

```typescript
class Jellytent extends EventEmitter<JellytentEvents> {
  constructor(config: JellytentConfig);

  // Lifecycle
  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  destroy(): Promise<void>;

  // Messaging
  sendText(text: string): Promise<void>;
  startAudioStream(): void;
  stopAudioStream(): void;

  // Plugins
  registerPlugin(plugin: Plugin): void;
  unregisterPlugin(name: string): void;

  // State
  getState(): AgentState;
  getSessionId(): string | undefined;
}
```

### Events

```typescript
interface JellytentEvents {
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
```

### Error Types

```typescript
class JellytentError extends Error {
  code: string;
  retryable: boolean;
  cause?: Error;
}

class ConnectionError extends JellytentError {}    // Retryable
class AuthenticationError extends JellytentError {} // Not retryable
class RateLimitError extends JellytentError {      // Retryable
  retryAfter: number;  // Seconds
}
```

---

## Python ML Components

### Installation

```bash
# Full installation
pip install jellytent-ml[all]

# Specific components
pip install jellytent-ml[stt]  # Whisper
pip install jellytent-ml[tts]  # Coqui TTS
pip install jellytent-ml[nlu]  # Intent classification
```

### Speech-to-Text

```python
from jellytent_ml import WhisperSTT
import numpy as np

stt = WhisperSTT(model_size="base")

# Transcribe audio
audio = np.random.randn(16000).astype(np.float32)  # 1 second
result = await stt.transcribe(audio, sample_rate=16000)

print(result.text)        # Transcribed text
print(result.confidence)  # 0-1
print(result.language)    # Detected language
```

### Text-to-Speech

```python
from jellytent_ml import CoquiTTS

tts = CoquiTTS(model_name="tts_models/en/ljspeech/tacotron2-DDC")

# Synthesize speech
result = await tts.synthesize("Hello, world!")

print(result.audio.shape)    # Audio samples
print(result.sample_rate)    # Sample rate
print(result.duration_ms)    # Duration
```

### Intent Classification

```python
from jellytent_ml import IntentClassifier

classifier = IntentClassifier()

result = await classifier.classify("What's the weather like?")

print(result.intents[0].name)       # "weather"
print(result.intents[0].confidence) # 0.92
print(result.sentiment)             # "neutral"
```

---

## Support

| Channel | Link |
|---------|------|
| Documentation | https://docs.jellyjelly.io/jellytent |
| GitHub Issues | https://github.com/jellyjelly/jellytent/issues |
| Email Support | support@jellyjelly.io |
| Enterprise | enterprise@jellyjelly.io |
| Discord | https://discord.gg/jellyjelly |
| Status Page | https://status.jellyjelly.io |

---

## License

Copyright © 2024 JellyJelly Inc. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

For licensing inquiries: licensing@jellyjelly.io
