import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AvatarEngine } from '../../src/avatar/engine';

describe('AvatarEngine', () => {
  let engine: AvatarEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new AvatarEngine({});
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      const state = engine.getState();
      expect(state.frame).toBe(0);
      expect(state.mouthOpen).toBe(0);
      expect(state.tentaclePhase).toHaveLength(8);
    });

    it('should accept custom style', () => {
      const customEngine = new AvatarEngine({ style: 'minimal' });
      expect(customEngine).toBeInstanceOf(AvatarEngine);
      customEngine.destroy();
    });
  });

  describe('animation', () => {
    it('should emit frame events', () => {
      const frames: number[] = [];
      engine.on('frame', (state) => frames.push(state.frame));

      vi.advanceTimersByTime(100);

      expect(frames.length).toBeGreaterThan(0);
    });

    it('should update tentacle phases over time', () => {
      const initial = engine.getState().tentaclePhase.slice();

      vi.advanceTimersByTime(1000);

      const updated = engine.getState().tentaclePhase;
      expect(updated).not.toEqual(initial);
    });
  });

  describe('speaking animation', () => {
    it('should open mouth when speaking', () => {
      engine.startSpeakingAnimation();

      vi.advanceTimersByTime(200);

      const state = engine.getState();
      expect(state.mouthOpen).toBeGreaterThan(0);
    });

    it('should close mouth when stopped', () => {
      engine.startSpeakingAnimation();
      vi.advanceTimersByTime(200);

      engine.stopSpeakingAnimation();
      vi.advanceTimersByTime(500);

      const state = engine.getState();
      expect(state.mouthOpen).toBe(0);
    });
  });
});
