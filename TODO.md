# Jellytent v0.5.0 Development TODO

## High Priority

### Memory System
- [ ] Implement embedding client for semantic search
- [ ] Add Pinecone vector store provider
- [ ] Add Weaviate vector store provider
- [ ] Add Qdrant vector store provider
- [ ] Implement memory summarization for long conversations
- [ ] Add memory pruning based on relevance decay
- [ ] Write integration tests for memory providers

### Multi-modal Input
- [ ] Implement image preprocessing (resize, compress)
- [ ] Add base64 encoding for inline images
- [ ] Integrate with vision-capable LLMs (GPT-4V, Gemini)
- [ ] Add video frame extraction for video input
- [ ] Update transport protocol for binary payloads

## Medium Priority

### WebRTC Transport (Experimental)
- [ ] Complete ICE candidate handling
- [ ] Add TURN server configuration
- [ ] Implement graceful reconnection
- [ ] Add data channel reliability layer
- [ ] Test with various NAT configurations
- [ ] Add quality adaptation based on network conditions

### Emotion Detection (Experimental)
- [ ] Integrate distilbert-emotion model
- [ ] Add voice pitch/energy analysis
- [ ] Implement multimodal emotion fusion
- [ ] Train custom model on conversation data
- [ ] Add facial expression detection (for video input)

### Avatar Improvements
- [ ] Add more emotion expressions
- [ ] Implement "expressive" style variant
- [ ] Add lip-sync based on phonemes
- [ ] Optimize render performance for mobile

## Low Priority

### Performance
- [ ] Add connection pooling for LLM clients
- [ ] Implement request batching
- [ ] Add response caching layer
- [ ] Profile and optimize WASM module

### Developer Experience
- [ ] Add React hooks package
- [ ] Create Vue.js integration
- [ ] Build playground/demo app
- [ ] Improve error messages
- [ ] Add more code examples

### Documentation
- [ ] Write memory system guide
- [ ] Document WebRTC setup
- [ ] Add troubleshooting section
- [ ] Create architecture diagrams
- [ ] Record video tutorials

## Tech Debt

- [ ] Refactor transport layer for multiple backends
- [ ] Consolidate error handling patterns
- [ ] Add missing unit tests for memory module
- [ ] Update E2E tests for new features
- [ ] Clean up experimental feature flags

## Blocked

- [ ] AssemblyAI STT integration (waiting for SDK update)
- [ ] PlayHT TTS integration (API access pending)

---

Last updated: 2024-01-20
