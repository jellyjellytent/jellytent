import { VoiceConfig } from '../types';

/**
 * Voice Activity Detection
 * Basic energy-based VAD implementation
 */
export class VoiceActivityDetector {
  private config: VoiceConfig;
  private isActive: boolean = false;

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 16000,
      channels: config.channels ?? 1,
      vadThreshold: config.vadThreshold ?? 0.01,
    };
  }

  /**
   * Process audio buffer and detect voice activity
   */
  process(samples: Float32Array): boolean {
    const energy = this.calculateEnergy(samples);
    const wasActive = this.isActive;

    this.isActive = energy > this.config.vadThreshold;

    return this.isActive !== wasActive;
  }

  private calculateEnergy(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  setThreshold(threshold: number): void {
    this.config.vadThreshold = threshold;
  }
}
