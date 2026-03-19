<p align="center">
  <img src="https://raw.githubusercontent.com/jellyjelly/brand/main/jellytent-logo.svg" alt="Jellytent" width="200" />
</p>

<h1 align="center">Jellytent</h1>

<p align="center">
  <strong>Next-generation AI video chat agent for JellyJelly</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.5.0--beta.1-orange.svg" alt="Version" />
  <img src="https://img.shields.io/badge/typescript-5.3-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/rust-1.74-orange.svg" alt="Rust" />
  <img src="https://img.shields.io/badge/python-3.11-green.svg" alt="Python" />
  <img src="https://img.shields.io/badge/license-proprietary-red.svg" alt="License" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build" />
  <img src="https://img.shields.io/badge/coverage-81%25-green.svg" alt="Coverage" />
  <img src="https://img.shields.io/badge/status-beta-yellow.svg" alt="Status" />
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#whats-new">What's New</a> •
  <a href="#memory-system">Memory</a> •
  <a href="#multi-modal">Multi-Modal</a> •
  <a href="#experimental">Experimental</a> •
  <a href="#migration">Migration</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

> ⚠️ **Beta Release**: This is a pre-release version. APIs may change. Not recommended for production use.

---

## Overview

Jellytent 0.5.0 introduces groundbreaking features including **conversation memory with semantic search**, **multi-modal input support**, and **emotion-reactive avatars**. This release lays the foundation for more intelligent, context-aware, and natural AI interactions.

### Headline Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Memory System** | 🚧 Beta | Long-term conversation memory with RAG |
| **Multi-Modal Input** | 🚧 Beta | Image and (soon) video input support |
| **Emotion Detection** | 🧪 Experimental | Real-time sentiment and emotion analysis |
| **WebRTC Transport** | 🧪 Experimental | Lower latency alternative to WebSocket |
| **Parallel Tool Calls** | ✅ Stable | Execute multiple tools simultaneously |

---

## What's New in v0.5.0

### Memory System (Beta)

Your Jellytent agent can now **remember previous conversations**. The memory system provides:

- **Conversation Persistence**: Messages stored across sessions
- **Semantic Search**: Find relevant past context using embeddings
- **Automatic Context**: Relevant memories injected into prompts
- **Multiple Backends**: Local, Pinecone, Weaviate, Qdrant (coming soon)

```typescript
const client = new Jellytent({
  apiKey: process.env.JELLYTENT_API_KEY!,
  memory: {
    enabled: true,
    provider: 'local',      // 'pinecone', 'weaviate', 'qdrant' coming
    maxHistory: 100,
    embeddingModel: 'text-embedding-3-small',
  },
});

await client.initialize();
await client.connect();

// The agent now has context from previous conversations!
await client.sendText('What did we discuss last time?');

// Memory stats
const stats = await client.getMemoryStats();
console.log(`Stored messages: ${stats.messageCount}`);

// Clear memory if needed
await client.clearMemory();
```

### Multi-Modal Input (Beta)

Send images alongside text for visual understanding:

```typescript
// Send image with prompt
await client.sendImage(
  'https://example.com/chart.png',
  'What does this chart show?'
);

// Or use the low-level API (coming soon)
await client.sendMultimodal([
  { type: 'text', text: 'Compare these two images:' },
  { type: 'image', url: 'https://example.com/image1.png' },
  { type: 'image', url: 'https://example.com/image2.png' },
]);
```

### Emotion Detection (Experimental)

Real-time emotion analysis from text and voice:

```typescript
client.on('emotion:detected', (emotion) => {
  console.log(`Detected: ${emotion.primary}`);  // 'happy', 'sad', etc.
  console.log(`Confidence: ${emotion.confidence}`);
  console.log(`Valence: ${emotion.valence}`);   // -1 to 1
  console.log(`Arousal: ${emotion.arousal}`);   // 0 to 1
});

// Enable emotion-reactive avatar
const client = new Jellytent({
  apiKey: '...',
  avatar: {
    enabled: true,
    style: 'expressive',      // New style!
    emotionReactive: true,    // Avatar responds to emotions
  },
});
```

### WebRTC Transport (Experimental)

Lower latency audio/video streaming:

```typescript
import { WebRTCTransport } from '@jellyjelly/jellytent/experimental';

// Note: API is unstable and may change
const transport = new WebRTCTransport({
  signalingUrl: 'wss://signal.jellyjelly.io',
  apiKey: process.env.JELLYTENT_API_KEY!,
  sessionId: 'my-session',
  iceServers: [
    { urls: 'stun:stun.jellyjelly.io:3478' },
    {
      urls: 'turn:turn.jellyjelly.io:3478',
      username: 'user',
      credential: 'pass',
    },
  ],
});

await transport.connect();
```

---

## Architecture

### System Overview (v0.5.0)

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
│  │   │  Emotion   │  │  Emotion   │  │  Parallel  │  │  Hooks     │    │  │
│  │   │  Reactive  │  │  Detection │  │  Tools     │  │  Lifecycle │    │  │
│  │   │  ▲ NEW     │  │  ▲ NEW     │  │  ▲ NEW     │  │            │    │  │
│  │   └────────────┘  └─────┬──────┘  └────────────┘  └────────────┘    │  │
│  │                         │                                            │  │
│  │   ┌─────────────────────┼─────────────────────────────────────────┐  │  │
│  │   │                     │     MEMORY SYSTEM (NEW)                 │  │  │
│  │   │   ┌─────────────────▼─────────────────┐                       │  │  │
│  │   │   │         Memory Manager            │                       │  │  │
│  │   │   │                                   │                       │  │  │
│  │   │   │  ┌───────────┐  ┌───────────┐    │                       │  │  │
│  │   │   │  │Conversation│  │ Embedding │    │                       │  │  │
│  │   │   │  │  Memory    │  │  Client   │    │  ◀── Coming Soon     │  │  │
│  │   │   │  └───────────┘  └───────────┘    │                       │  │  │
│  │   │   │         │              │          │                       │  │  │
│  │   │   │         ▼              ▼          │                       │  │  │
│  │   │   │  ┌─────────────────────────┐     │                       │  │  │
│  │   │   │  │    Vector Store         │     │                       │  │  │
│  │   │   │  │  Local │ Pinecone │ ... │     │                       │  │  │
│  │   │   │  └─────────────────────────┘     │                       │  │  │
│  │   │   └───────────────────────────────────┘                       │  │  │
│  │   └───────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │   ┌──────────────────────────────────────────────────────────────┐  │  │
│  │   │                 EXPERIMENTAL FEATURES                        │  │  │
│  │   │                                                              │  │  │
│  │   │   ┌────────────────┐        ┌────────────────┐              │  │  │
│  │   │   │    WebRTC      │        │    Emotion     │              │  │  │
│  │   │   │   Transport    │        │   Detector     │              │  │  │
│  │   │   │                │        │                │              │  │  │
│  │   │   │  • Signaling   │        │  • Text        │              │  │  │
│  │   │   │  • ICE (WIP)   │        │  • Voice (WIP) │              │  │  │
│  │   │   │  • Data Ch.    │        │  • Multimodal  │              │  │  │
│  │   │   └────────────────┘        └────────────────┘              │  │  │
│  │   │                                                              │  │  │
│  │   └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                                      │  │
│  │                  ┌──────────────┐                                    │  │
│  │                  │  WASM Core   │  ◀── Rust                         │  │
│  │                  │              │                                    │  │
│  │                  │  VAD         │                                    │  │
│  │                  │  Denoise     │                                    │  │
│  │                  │  Pitch (WIP) │  ◀── For emotion                  │  │
│  │                  └──────────────┘                                    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                         │                                  │
├─────────────────────────────────────────┼──────────────────────────────────┤
│              Transport Layer (WebSocket / WebRTC)                          │
└─────────────────────────────────────────┴──────────────────────────────────┘
```

### Memory System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Memory Manager                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User Message                                                  │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │   Store     │────▶│   Embed     │────▶│   Index     │      │
│   │   Message   │     │   (TODO)    │     │   (TODO)    │      │
│   └─────────────┘     └─────────────┘     └─────────────┘      │
│                                                                 │
│   Query                                                         │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │   Embed     │────▶│   Search    │────▶│   Rank &    │      │
│   │   Query     │     │   Similar   │     │   Return    │      │
│   │   (TODO)    │     │   (TODO)    │     │             │      │
│   └─────────────┘     └─────────────┘     └─────────────┘      │
│                                                                 │
│   Storage Backends:                                             │
│   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐         │
│   │  Local  │  │ Pinecone │  │ Weaviate │  │  Qdrant │         │
│   │   ✅    │  │   TODO   │  │   TODO   │  │   TODO  │         │
│   └─────────┘  └──────────┘  └──────────┘  └─────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Memory System

### How It Works

1. **Message Storage**: Every user and assistant message is stored
2. **Embedding Generation**: Messages are converted to vector embeddings (TODO)
3. **Semantic Search**: When processing a new message, relevant past context is retrieved
4. **Context Injection**: Retrieved memories are provided to the LLM

### Configuration Options

```typescript
interface MemoryConfig {
  /**
   * Enable the memory system
   * @default false
   */
  enabled: boolean;

  /**
   * Storage provider
   * @default 'local'
   *
   * - 'local': In-memory storage (development only)
   * - 'pinecone': Pinecone vector database (coming soon)
   * - 'weaviate': Weaviate vector database (coming soon)
   * - 'qdrant': Qdrant vector database (coming soon)
   */
  provider: 'local' | 'pinecone' | 'weaviate' | 'qdrant';

  /**
   * Maximum messages to store
   * Older messages are pruned (with summarization TODO)
   * @default 100
   */
  maxHistory: number;

  /**
   * Embedding model for semantic search
   * @default 'text-embedding-3-small'
   */
  embeddingModel: string;
}
```

### Memory API

```typescript
class Jellytent {
  /**
   * Clear all stored memories
   */
  async clearMemory(): Promise<void>;

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<{
    messageCount: number;
    oldestTimestamp?: number;
  }>;
}

// Events
client.on('memory:updated', () => {
  console.log('Memory was updated');
});
```

### Current Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Local storage | ✅ Working | In-memory only, no persistence |
| Message storage | ✅ Working | Basic CRUD operations |
| Recent retrieval | ✅ Working | Returns N most recent |
| Embedding generation | ❌ TODO | Placeholder implementation |
| Semantic search | ❌ TODO | Falls back to recent |
| Pinecone provider | ❌ TODO | Interface defined |
| Weaviate provider | ❌ TODO | Interface defined |
| Qdrant provider | ❌ TODO | Interface defined |
| Memory summarization | ❌ TODO | For pruning old memories |
| Memory pruning | ⚠️ Basic | Simple FIFO, no relevance |

---

## Multi-Modal Input

### Supported Content Types

| Type | Status | Notes |
|------|--------|-------|
| Text | ✅ Working | Standard text messages |
| Image URL | 🚧 Beta | Basic implementation |
| Image Base64 | ❌ TODO | Needs encoding |
| Audio | ✅ Working | Via voice pipeline |
| Video | ❌ TODO | Frame extraction needed |

### Usage Examples

```typescript
// Simple image + text
await client.sendImage(
  'https://example.com/diagram.png',
  'Explain this architecture diagram'
);

// Multiple images (coming soon)
await client.sendMultimodal([
  { type: 'text', text: 'What are the differences between these?' },
  { type: 'image', url: 'https://example.com/before.png', alt: 'Before' },
  { type: 'image', url: 'https://example.com/after.png', alt: 'After' },
]);
```

### Vision Model Support

| Provider | Model | Status |
|----------|-------|--------|
| OpenAI | gpt-4-vision-preview | 🚧 Testing |
| OpenAI | gpt-4o | 🚧 Testing |
| Anthropic | claude-3-opus | ❌ TODO |
| Google | gemini-pro-vision | ❌ TODO |

---

## Experimental Features

> ⚠️ **Warning**: Experimental features have unstable APIs and may be removed or significantly changed.

### WebRTC Transport

```typescript
// Import from experimental
import { WebRTCTransport } from '@jellyjelly/jellytent/experimental';

const transport = new WebRTCTransport({
  signalingUrl: 'wss://signal.jellyjelly.io',
  apiKey: 'your-key',
  sessionId: 'session-123',
});

// Events
transport.on('track', (track, streams) => {
  // Handle incoming audio/video track
  const audio = new Audio();
  audio.srcObject = streams[0];
  audio.play();
});

await transport.connect();
await transport.sendAudio(audioTrack);
```

**Implementation Status:**

- [x] Basic signaling connection
- [x] Peer connection creation
- [x] Data channel for messages
- [ ] ICE candidate handling
- [ ] TURN server support
- [ ] Graceful reconnection
- [ ] Quality adaptation

### Emotion Detection

```typescript
import { EmotionDetector } from '@jellyjelly/jellytent/experimental';

const detector = new EmotionDetector({
  textModel: 'distilbert-emotion',
  voiceModel: 'wav2vec-emotion',  // Not yet implemented
  smoothingFactor: 0.3,
});

await detector.initialize();

// Text-based detection
const textEmotion = await detector.detectFromText('I am so happy!');
console.log(textEmotion);
// {
//   primary: 'happy',
//   confidence: 0.85,
//   valence: 0.8,
//   arousal: 0.6
// }

// Voice-based detection (basic)
const voiceEmotion = await detector.detectFromVoice(audioBuffer);

// Multimodal fusion
const combined = await detector.detectMultimodal('Great news!', audioBuffer);
```

**Available Emotions:**

| Emotion | Valence | Arousal |
|---------|---------|---------|
| `happy` | +0.8 | 0.6 |
| `surprised` | +0.5 | 0.7 |
| `neutral` | 0.0 | 0.2 |
| `fearful` | -0.3 | 0.8 |
| `sad` | -0.6 | 0.3 |
| `angry` | -0.5 | 0.9 |
| `disgusted` | -0.7 | 0.5 |

### Emotion-Reactive Avatar

```typescript
const client = new Jellytent({
  apiKey: '...',
  avatar: {
    enabled: true,
    style: 'expressive',      // New style with emotion support
    emotionReactive: true,
  },
});

// Avatar automatically reacts to detected emotions
// - Happy: Bouncy tentacles, brighter glow
// - Sad: Droopy tentacles, dimmer glow
// - Angry: Tense, rapid movements
// - Surprised: Wide spread tentacles
```

---

## Migration from v0.4.x

### Breaking Changes

```typescript
// 1. VoicePipeline event signature changed
// Before (v0.4.x)
pipeline.on('vad:change', (active: boolean) => {});

// After (v0.5.0)
pipeline.on('vad:change', (active: boolean, confidence: number) => {});

// 2. State change event includes previous state
// Before (v0.4.x)
client.on('state:change', (state) => {});

// After (v0.5.0)
client.on('state:change', (state, prevState) => {});

// 3. Message content can be array for multimodal
// Before (v0.4.x)
interface Message {
  content: string;
}

// After (v0.5.0)
interface Message {
  content: string | MessageContent[];
}
```

### New Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.10.0",
    "hnswlib-node": "^3.0.0",  // For local vector search
    "openai": "^4.20.0"
  }
}
```

### Configuration Changes

```typescript
// New config options
interface JellytentConfig {
  // ... existing options ...

  memory?: MemoryConfig;  // NEW

  avatar?: {
    // ... existing options ...
    emotionReactive?: boolean;  // NEW
  };

  llm?: {
    // ... existing options ...
    parallelToolCalls?: boolean;  // NEW, default: true
  };
}
```

---

## Development Status

### Feature Completion

| Module | Completion | Notes |
|--------|------------|-------|
| Core SDK | 95% | Stable |
| Memory Manager | 40% | Local only |
| Embedding Client | 0% | Not started |
| Vector Search | 20% | Basic cosine similarity |
| Multi-modal | 30% | Image URLs only |
| WebRTC | 25% | Basic signaling |
| Emotion (Text) | 60% | Rule-based |
| Emotion (Voice) | 20% | Energy-based only |

### Known Issues

1. **Memory**: Embeddings not implemented, falls back to recent messages
2. **Multi-modal**: Only supports image URLs, not base64 or uploads
3. **WebRTC**: ICE handling incomplete, may fail behind NAT
4. **Emotion**: Voice emotion requires proper ML model (placeholder)

### Test Coverage

```
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   81.2  |   72.4   |   78.9  |   81.0  |
 src/core                 |   92.1  |   85.3   |   90.0  |   92.0  |
 src/memory               |   68.4  |   55.2   |   70.0  |   68.0  |
 src/experimental         |   45.2  |   38.1   |   50.0  |   45.0  |
--------------------------|---------|----------|---------|---------|
```

---

## Roadmap

### v0.5.0 Final (Target: Q1 2024)

- [ ] Complete embedding integration
- [ ] Pinecone provider
- [ ] Base64 image support
- [ ] Voice emotion detection
- [ ] Memory summarization

### v0.6.0 (Target: Q2 2024)

- [ ] Video input support
- [ ] WebRTC stable release
- [ ] Weaviate/Qdrant providers
- [ ] Custom emotion models
- [ ] React Native SDK

### v1.0.0 (Target: Q3 2024)

- [ ] Production-ready memory system
- [ ] All vector store providers
- [ ] Complete multi-modal support
- [ ] Stable experimental features
- [ ] Enterprise SLA support

---

## Contributing

This is a proprietary project. See [CONTRIBUTING.md](CONTRIBUTING.md) for internal guidelines.

### Development Setup

```bash
# Clone and install
git clone https://github.com/jellyjelly/jellytent.git
cd jellytent
npm install
pip install -e "./python[all,dev]"

# Build
npm run build

# Test
npm test
pytest python/tests

# Watch mode
npm run dev
```

### Commit Convention

```
feat: add memory search with embeddings
fix: resolve WebRTC ICE timeout
wip: emotion detection from voice
experimental: add video frame extraction
```

---

## Support

| Channel | Link |
|---------|------|
| Beta Feedback | beta-feedback@jellyjelly.io |
| Documentation | https://docs.jellyjelly.io/jellytent/beta |
| GitHub Issues | https://github.com/jellyjelly/jellytent/issues |
| Discord (#beta) | https://discord.gg/jellyjelly |

---

## License

Copyright © 2024 JellyJelly Inc. All rights reserved.

This software is proprietary and confidential. Beta access is granted under separate agreement.
