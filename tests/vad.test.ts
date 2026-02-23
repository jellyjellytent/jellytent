import { VoiceActivityDetector } from '../src/voice/vad';

describe('VoiceActivityDetector', () => {
  let vad: VoiceActivityDetector;

  beforeEach(() => {
    vad = new VoiceActivityDetector({ vadThreshold: 0.01 });
  });

  it('should initialize as inactive', () => {
    expect(vad.getIsActive()).toBe(false);
  });

  it('should detect silence', () => {
    const silence = new Float32Array(1024).fill(0);
    vad.process(silence);
    expect(vad.getIsActive()).toBe(false);
  });

  it('should detect voice activity', () => {
    const loud = new Float32Array(1024).fill(0.5);
    vad.process(loud);
    expect(vad.getIsActive()).toBe(true);
  });

  it('should allow threshold adjustment', () => {
    vad.setThreshold(0.5);
    const medium = new Float32Array(1024).fill(0.3);
    vad.process(medium);
    expect(vad.getIsActive()).toBe(false);
  });
});
