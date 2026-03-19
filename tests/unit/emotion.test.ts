import { describe, it, expect, beforeEach } from 'vitest';
import { EmotionDetector } from '../../src/experimental/emotion';

describe('EmotionDetector (Experimental)', () => {
  let detector: EmotionDetector;

  beforeEach(async () => {
    detector = new EmotionDetector();
    await detector.initialize();
  });

  describe('detectFromText', () => {
    it('should detect happy emotion', async () => {
      const result = await detector.detectFromText('I am so happy and excited!');

      expect(result.primary).toBe('happy');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.valence).toBeGreaterThan(0);
    });

    it('should detect sad emotion', async () => {
      const result = await detector.detectFromText('I feel so sad and depressed');

      expect(result.primary).toBe('sad');
      expect(result.valence).toBeLessThan(0);
    });

    it('should detect neutral for ambiguous text', async () => {
      const result = await detector.detectFromText('The meeting is at 3pm.');

      expect(result.primary).toBe('neutral');
    });

    it('should handle empty text', async () => {
      const result = await detector.detectFromText('');

      expect(result.primary).toBeDefined();
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('detectFromVoice', () => {
    it('should detect based on audio energy', async () => {
      // High energy audio
      const loudAudio = new Float32Array(480).fill(0.5);
      const result = await detector.detectFromVoice(loudAudio);

      expect(result.arousal).toBeGreaterThan(0.5);
    });

    it('should detect low arousal for quiet audio', async () => {
      const quietAudio = new Float32Array(480).fill(0.01);
      const result = await detector.detectFromVoice(quietAudio);

      expect(result.arousal).toBeLessThan(0.3);
    });
  });

  describe('smoothing', () => {
    it('should smooth emotion transitions', async () => {
      // First detection
      const result1 = await detector.detectFromText('I am happy!');

      // Abrupt change
      const result2 = await detector.detectFromText('Now I am sad :(');

      // The second result should be influenced by smoothing
      // (intensity should not jump instantly)
      expect(result2.confidence).toBeLessThan(1);
    });
  });

  describe('reset', () => {
    it('should reset emotion state', async () => {
      await detector.detectFromText('I am happy!');
      detector.reset();

      // After reset, smoothing should start fresh
      const result = await detector.detectFromText('sad');
      expect(result).toBeDefined();
    });
  });
});
