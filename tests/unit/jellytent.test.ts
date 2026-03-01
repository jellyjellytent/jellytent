import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Jellytent } from '../../src/core/jellytent';

// Mock WASM loader
vi.mock('../../src/voice/wasm-loader', () => ({
  loadWasmModule: vi.fn().mockResolvedValue({
    process_audio: vi.fn((samples) => samples),
    detect_voice_activity: vi.fn(() => false),
    apply_noise_reduction: vi.fn((samples) => samples),
  }),
}));

describe('Jellytent', () => {
  let client: Jellytent;

  beforeEach(() => {
    client = new Jellytent({
      apiKey: 'test-api-key',
      endpoint: 'wss://test.example.com',
    });
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      expect(client).toBeInstanceOf(Jellytent);
    });

    it('should throw on missing API key', () => {
      expect(() => new Jellytent({ apiKey: '' })).toThrow();
    });

    it('should use default endpoint if not provided', () => {
      const defaultClient = new Jellytent({ apiKey: 'test' });
      expect(defaultClient.getState()).toBe('uninitialized');
    });
  });

  describe('state', () => {
    it('should start in uninitialized state', () => {
      expect(client.getState()).toBe('uninitialized');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await client.initialize();
      expect(client.getState()).toBe('idle');
    });

    it('should throw if already initialized', async () => {
      await client.initialize();
      await expect(client.initialize()).rejects.toThrow('Already initialized');
    });
  });

  describe('events', () => {
    it('should emit state change events', async () => {
      const states: string[] = [];
      client.on('state:change', (state) => states.push(state));

      await client.initialize();

      expect(states).toContain('idle');
    });
  });
});
