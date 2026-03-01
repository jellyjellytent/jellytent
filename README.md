<p align="center">
  <img src="https://raw.githubusercontent.com/jellyjelly/brand/main/jellytent-logo.svg" alt="Jellytent" width="200" />
</p>

<h1 align="center">Jellytent</h1>

<p align="center">
  <strong>High-performance AI video chat agent for JellyJelly</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.0-blue.svg" alt="Version" />
  <img src="https://img.shields.io/badge/typescript-5.3-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/rust-1.74-orange.svg" alt="Rust" />
  <img src="https://img.shields.io/badge/license-proprietary-red.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg" alt="Node" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build" />
  <img src="https://img.shields.io/badge/coverage-78%25-yellow.svg" alt="Coverage" />
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#development">Development</a>
</p>

---

## Overview

Jellytent is a production-grade real-time video chat agent featuring an interactive jellyfish avatar companion. Built for seamless integration with the JellyJelly chat platform, it combines TypeScript for application orchestration with Rust-compiled WebAssembly for performance-critical audio processing.

The agent provides natural conversational AI capabilities with real-time voice interaction, animated visual feedback, and extensible LLM backend support.

### Why Jellytent?

- **Real-time Performance**: Sub-100ms audio processing latency using Rust/WASM
- **Natural Interaction**: Animated jellyfish avatar that responds to conversation
- **Flexible Integration**: Works standalone or embedded in JellyJelly calls
- **Multi-Provider LLM**: Support for JellyJelly, OpenAI, and Anthropic backends
- **Production Ready**: Battle-tested WebSocket transport with automatic recovery

---

## Features

### Core Capabilities

| Feature | Description | Status |
|---------|-------------|--------|
| **Real-time Voice** | Full-duplex audio streaming with VAD | ✅ Stable |
| **WASM Audio DSP** | Rust-compiled audio processing | ✅ Stable |
| **Animated Avatar** | 60fps jellyfish with speech sync | ✅ Stable |
| **WebSocket Transport** | Auto-reconnect with exponential backoff | ✅ Stable |
| **LLM Integration** | Multi-provider support | ✅ Stable |
| **Session Management** | Persistent conversation history | ✅ Stable |

### Audio Processing Pipeline

The voice pipeline leverages WebAssembly for high-performance audio processing:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Capture   │───▶│    WASM     │───▶│     VAD     │───▶│   Stream    │
│   (16kHz)   │    │  Resample   │    │  Detection  │    │  to Server  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │    Noise    │
                   │  Reduction  │
                   └─────────────┘
```

**Performance Benchmarks** (M1 MacBook Pro):

| Operation | JS Implementation | WASM Implementation | Improvement |
|-----------|-------------------|---------------------|-------------|
| VAD (16ms frame) | 0.8ms | 0.1ms | 8x faster |
| Noise reduction | 2.1ms | 0.3ms | 7x faster |
| Resampling | 1.2ms | 0.15ms | 8x faster |

### Avatar Animation System

The jellyfish avatar features procedural animation with multiple independent systems:

- **Tentacle Physics**: 8 tentacles with layered sine wave motion
- **Breathing Animation**: Subtle pulsing body movement
- **Speech Sync**: Mouth and glow intensity tied to audio output
- **Idle Motion**: Natural floating bob effect

```typescript
// Avatar state updated at 60fps
interface AvatarState {
  frame: number;
  mouthOpen: number;           // 0-1, synced to speech
  tentaclePhase: number[];     // 8 independent phases
  glowIntensity: number;       // 0-1, pulses during speech
  position: { x: number; y: number };  // Idle bob offset
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Application                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Jellytent SDK (TypeScript)                │   │
│  │                                                              │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │   │    Avatar    │  │    Voice     │  │     LLM      │      │   │
│  │   │    Engine    │  │   Pipeline   │  │    Client    │      │   │
│  │   │              │  │              │  │              │      │   │
│  │   │  • 60fps     │  │  • Capture   │  │  • OpenAI    │      │   │
│  │   │  • Tentacles │  │  • VAD       │  │  • Anthropic │      │   │
│  │   │  • Speech    │  │  • Denoise   │  │  • JellyJelly│      │   │
│  │   └──────────────┘  └──────┬───────┘  └──────────────┘      │   │
│  │                            │                                 │   │
│  │                     ┌──────┴───────┐                         │   │
│  │                     │  WASM Core   │  ◀── Rust               │   │
│  │                     │              │                         │   │
│  │                     │  • RMS Energy│                         │   │
│  │                     │  • ZCR       │                         │   │
│  │                     │  • Spectral  │                         │   │
│  │                     └──────────────┘                         │   │
│  │                                                              │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                   │
├─────────────────────────────────┼───────────────────────────────────┤
│                      WebSocket Transport                            │
│                                 │                                   │
│   • Binary audio frames         │    • JSON control messages        │
│   • Ping/pong keepalive         │    • Automatic reconnection       │
│   • Message sequencing          │    • Session persistence          │
│                                 │                                   │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      JellyJelly Backend                             │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │   Session    │  │     STT      │  │     LLM      │             │
│   │   Manager    │  │   Service    │  │   Gateway    │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Module Dependency Graph

```
index.ts
    │
    ├── core/jellytent.ts ──────┬── core/agent.ts
    │                           │        │
    │                           │        └── transport/websocket.ts
    │                           │
    │                           ├── avatar/engine.ts
    │                           │
    │                           ├── voice/pipeline.ts
    │                           │        │
    │                           │        └── voice/wasm-loader.ts
    │                           │                  │
    │                           │                  └── [WASM Binary]
    │                           │
    │                           └── llm/client.ts
    │
    └── types/index.ts
```

---

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **Rust** 1.74+ (for building WASM module)
- **wasm-pack** (install via `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`)

### NPM Package

```bash
npm install @jellyjelly/jellytent
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/jellyjelly/jellytent.git
cd jellytent

# Install Node.js dependencies
npm install

# Build the WASM audio processor
npm run build:wasm

# Build TypeScript
npm run build

# Run tests to verify
npm test
```

### Docker

```bash
# Build the Docker image
docker build -t jellytent:0.3.0 -f docker/Dockerfile .

# Run with environment variables
docker run -p 8080:8080 \
  -e JELLYTENT_API_KEY=your_api_key \
  jellytent:0.3.0
```

---

## Quick Start

### Basic Usage

```typescript
import { Jellytent } from '@jellyjelly/jellytent';

// Create and configure the client
const client = new Jellytent({
  apiKey: process.env.JELLYTENT_API_KEY!,
  endpoint: 'wss://api.jellyjelly.io/v1/agent',
  avatar: {
    enabled: true,
    style: 'luminescent',
  },
});

// Initialize (loads WASM module)
await client.initialize();

// Connect to the server
await client.connect();

// Listen for responses
client.on('response', (response) => {
  console.log('Agent says:', response.text);
});

// Listen for avatar updates (60fps)
client.on('avatar:update', (state) => {
  renderAvatar(state);  // Your rendering function
});

// Send a message
await client.sendText('Hello, Jellytent!');

// Start voice interaction
client.startAudioStream();

// Later: cleanup
await client.disconnect();
```

### React Integration Example

```tsx
import { useEffect, useState, useCallback } from 'react';
import { Jellytent, AvatarState } from '@jellyjelly/jellytent';

function JellytentChat() {
  const [client, setClient] = useState<Jellytent | null>(null);
  const [avatarState, setAvatarState] = useState<AvatarState | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const jt = new Jellytent({
      apiKey: process.env.REACT_APP_JELLYTENT_API_KEY!,
      avatar: { enabled: true, style: 'luminescent' },
    });

    jt.on('connected', () => setIsConnected(true));
    jt.on('disconnected', () => setIsConnected(false));
    jt.on('avatar:update', setAvatarState);
    jt.on('response', (r) => setMessages((m) => [...m, r.text]));

    jt.initialize().then(() => {
      jt.connect();
      setClient(jt);
    });

    return () => {
      jt.disconnect();
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (client && isConnected) {
      setMessages((m) => [...m, `You: ${text}`]);
      await client.sendText(text);
    }
  }, [client, isConnected]);

  return (
    <div className="jellytent-chat">
      <JellyfishAvatar state={avatarState} />
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} disabled={!isConnected} />
    </div>
  );
}
```

### Voice Interaction

```typescript
// Configure voice settings
const client = new Jellytent({
  apiKey: process.env.JELLYTENT_API_KEY!,
  voice: {
    sampleRate: 16000,
    vadSensitivity: 0.5,      // 0-1, higher = more sensitive
    echoCancellation: true,
    noiseSuppression: true,
  },
});

await client.initialize();
await client.connect();

// Monitor voice activity
client.on('voice:activity', ({ active }) => {
  console.log(active ? 'Speaking...' : 'Silent');
});

// Start capturing audio
client.startAudioStream();

// Stop when done
client.stopAudioStream();
```

---

## API Reference

### Jellytent Class

The main entry point for the SDK.

#### Constructor

```typescript
new Jellytent(config: JellytentConfig)
```

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `initialize()` | `Promise<void>` | Load WASM module and initialize subsystems |
| `connect()` | `Promise<void>` | Connect to the JellyJelly server |
| `disconnect()` | `Promise<void>` | Gracefully disconnect |
| `sendText(text: string)` | `Promise<void>` | Send a text message |
| `startAudioStream()` | `void` | Begin capturing and streaming audio |
| `stopAudioStream()` | `void` | Stop audio capture |
| `getState()` | `AgentState` | Get current agent state |
| `getSessionId()` | `string` | Get the session identifier |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `state:change` | `(state: AgentState)` | Agent state changed |
| `connected` | `void` | Connected to server |
| `disconnected` | `{ reason: string }` | Disconnected from server |
| `response` | `ResponsePayload` | Agent response received |
| `response:start` | `void` | Response streaming started |
| `response:end` | `void` | Response streaming ended |
| `avatar:update` | `AvatarState` | Avatar animation frame (60fps) |
| `voice:activity` | `{ active: boolean }` | Voice activity changed |
| `error` | `Error` | Error occurred |

### Types

```typescript
// Agent states
type AgentState =
  | 'uninitialized'
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

// Response from the agent
interface ResponsePayload {
  id: string;
  text: string;
  audio?: ArrayBuffer;
  timestamp: number;
  isFinal: boolean;
}

// Avatar animation state
interface AvatarState {
  frame: number;
  mouthOpen: number;
  tentaclePhase: number[];
  glowIntensity: number;
  position: { x: number; y: number };
}

// Message in conversation history
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

---

## Configuration

### Full Configuration Reference

```typescript
interface JellytentConfig {
  // ═══════════════════════════════════════════════════════════════
  // REQUIRED
  // ═══════════════════════════════════════════════════════════════

  /**
   * Your JellyJelly API key
   * Obtain from: https://dashboard.jellyjelly.io/api-keys
   */
  apiKey: string;

  // ═══════════════════════════════════════════════════════════════
  // CONNECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * WebSocket endpoint URL
   * @default 'wss://api.jellyjelly.io/v1/agent'
   */
  endpoint?: string;

  /**
   * Custom session identifier
   * @default Auto-generated UUID
   */
  sessionId?: string;

  // ═══════════════════════════════════════════════════════════════
  // AVATAR
  // ═══════════════════════════════════════════════════════════════

  avatar?: {
    /**
     * Enable avatar rendering
     * @default true
     */
    enabled?: boolean;

    /**
     * Visual style preset
     * @default 'luminescent'
     */
    style?: 'luminescent' | 'minimal' | 'classic';

    /**
     * Primary color (hex)
     * @default '#00d4ff' (luminescent blue)
     */
    color?: string;

    /**
     * Avatar size in pixels
     * @default 256
     */
    size?: number;
  };

  // ═══════════════════════════════════════════════════════════════
  // VOICE
  // ═══════════════════════════════════════════════════════════════

  voice?: {
    /**
     * Audio sample rate in Hz
     * @default 16000
     */
    sampleRate?: number;

    /**
     * Voice activity detection sensitivity (0-1)
     * Higher values = more sensitive (may pick up noise)
     * Lower values = less sensitive (may miss quiet speech)
     * @default 0.5
     */
    vadSensitivity?: number;

    /**
     * Enable echo cancellation
     * @default true
     */
    echoCancellation?: boolean;

    /**
     * Enable noise suppression
     * @default true
     */
    noiseSuppression?: boolean;
  };

  // ═══════════════════════════════════════════════════════════════
  // LLM
  // ═══════════════════════════════════════════════════════════════

  llm?: {
    /**
     * LLM provider
     * @default 'jellyjelly'
     */
    provider?: 'jellyjelly' | 'openai' | 'anthropic';

    /**
     * Model identifier (provider-specific)
     * @default Provider's default model
     */
    model?: string;

    /**
     * Sampling temperature (0-2)
     * @default 0.7
     */
    temperature?: number;

    /**
     * Maximum tokens in response
     * @default 2048
     */
    maxTokens?: number;

    /**
     * System prompt for the agent
     */
    systemPrompt?: string;
  };
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JELLYTENT_API_KEY` | Your JellyJelly API key | Yes |
| `JELLYTENT_ENDPOINT` | Custom WebSocket endpoint | No |
| `JELLYTENT_LOG_LEVEL` | Logging level (debug/info/warn/error) | No |

---

## Development

### Project Structure

```
jellytent/
├── src/
│   ├── index.ts              # Public exports
│   ├── core/
│   │   ├── jellytent.ts      # Main client class
│   │   └── agent.ts          # Agent logic
│   ├── transport/
│   │   └── websocket.ts      # WebSocket client
│   ├── voice/
│   │   ├── pipeline.ts       # Audio processing pipeline
│   │   └── wasm-loader.ts    # WASM module loader
│   ├── avatar/
│   │   └── engine.ts         # Avatar animation
│   ├── llm/
│   │   └── client.ts         # LLM abstraction
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   └── utils/
│       └── logger.ts         # Logging utility
├── native/
│   └── audio-processor/      # Rust WASM module
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
├── tests/
│   └── unit/
├── docker/
│   └── Dockerfile
└── wasm/                     # Built WASM output
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development mode (watch)
npm run dev

# Build everything
npm run build

# Build only TypeScript
npm run build:ts

# Build only WASM
npm run build:wasm

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Type check
npm run typecheck

# Clean build artifacts
npm run clean
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test -- tests/unit

# With coverage
npm run test -- --coverage

# Specific test file
npm run test -- tests/unit/avatar.test.ts
```

### Building the WASM Module

The Rust WASM module requires:
- Rust 1.74+
- wasm-pack

```bash
# Install wasm-pack if needed
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build the WASM module
cd native/audio-processor
wasm-pack build --target web --out-dir ../../wasm

# Or use npm script from root
npm run build:wasm
```

---

## Troubleshooting

### Common Issues

#### WASM Module Not Loading

```
Error: Failed to load WASM module
```

**Solution**: Ensure the WASM file is accessible. Check that `wasm/audio_processor_bg.wasm` exists and is served with the correct MIME type (`application/wasm`).

#### Connection Timeouts

```
Error: Connection timeout
```

**Solution**: Check your network connection and firewall settings. Ensure WebSocket connections to `wss://api.jellyjelly.io` are allowed.

#### Voice Activity Not Detected

**Solution**: Adjust `vadSensitivity` in voice config. Try values between 0.3 (less sensitive) and 0.7 (more sensitive).

#### High CPU Usage

**Solution**: If avatar rendering is causing high CPU, reduce frame rate or disable avatar:

```typescript
const client = new Jellytent({
  apiKey: '...',
  avatar: { enabled: false },
});
```

---

## Support

- **Documentation**: https://docs.jellyjelly.io/jellytent
- **Issues**: https://github.com/jellyjelly/jellytent/issues
- **Email**: support@jellyjelly.io
- **Discord**: https://discord.gg/jellyjelly

---

## License

Copyright © 2024 JellyJelly Inc. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

See [LICENSE](LICENSE) for full terms.
