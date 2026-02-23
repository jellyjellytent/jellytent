# Jellytent

[![CI](https://github.com/jellyjelly/jellytent/actions/workflows/ci.yml/badge.svg)](https://github.com/jellyjelly/jellytent/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

> AI-powered video chat agent for JellyJelly

## Overview

Jellytent is a real-time video chat agent providing an interactive AI companion with a jellyfish avatar. Built for seamless integration with the JellyJelly chat platform.

## Features

- Real-time WebSocket communication
- Voice activity detection (VAD)
- Streaming text responses
- Session management

## Installation

```bash
npm install @jellyjelly/jellytent
```

## Quick Start

```typescript
import { createAgent } from '@jellyjelly/jellytent';

const agent = createAgent({
  apiKey: process.env.JELLYTENT_API_KEY,
  endpoint: 'wss://api.jellyjelly.io/v1/agent'
});

await agent.connect();

agent.on('message', (msg) => {
  console.log('Agent:', msg.content);
});

await agent.send('Hello, Jellytent!');
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | - | Your JellyJelly API key (required) |
| `endpoint` | `string` | Production URL | WebSocket endpoint |
| `sessionId` | `string` | Auto-generated | Custom session identifier |

## Development

```bash
npm install
npm run dev
npm test
```

## License

Copyright © 2024 JellyJelly Inc. All rights reserved.
