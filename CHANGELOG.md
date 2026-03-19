# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 0.5.0-beta.1

### Added

- **Memory System** (WIP): Long-term conversation memory with semantic search
  - Local in-memory provider working
  - Pinecone/Weaviate/Qdrant providers planned
  - RAG pipeline in development

- **Multi-modal Input** (WIP): Support for image inputs
  - Basic image URL handling
  - Full vision model integration coming

- **Emotion Detection** (Experimental): Real-time emotion analysis
  - Text-based sentiment detection
  - Voice emotion features planned
  - Emotion-reactive avatar animations

- **WebRTC Transport** (Experimental): Alternative transport for lower latency
  - Basic signaling implemented
  - Full implementation in progress

- New LLM providers: Google (Gemini)
- Parallel tool call execution
- Avatar emotion expressions

### Changed

- Upgraded to TypeScript 5.3
- Improved WASM audio processor with SIMD optimizations
- Better reconnection handling with exponential backoff + jitter

### Fixed

- Memory leak in voice pipeline when stopping stream
- Avatar animation jitter on low frame rates
- Race condition in plugin loading

### Security

- Updated all dependencies to latest versions
- Added input validation for memory entries

---

## [0.4.0] - 2024-01-15

### Added

- Plugin system for extensibility
- Observability with OpenTelemetry
- Kubernetes deployment with Helm charts
- Python ML components for STT/TTS

### Changed

- Migrated to Vitest for testing
- Improved error types with retry information

---

## [0.3.0] - 2024-01-01

### Added

- Rust/WASM audio processing
- Avatar animation engine
- LLM client abstraction

---

## [0.2.0] - 2023-12-15

### Added

- WebSocket transport with reconnection
- Voice activity detection
- Event-based architecture

---

## [0.1.0] - 2023-12-01

### Added

- Initial release
- Basic agent functionality
- TypeScript SDK structure
