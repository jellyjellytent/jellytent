import EventEmitter from 'eventemitter3';
import { AvatarConfig, AvatarConfigSchema, AvatarState, Emotion } from '../types';

interface AvatarEvents {
  'frame': (state: AvatarState) => void;
}

const TENTACLE_COUNT = 8;

export class AvatarEngine extends EventEmitter<AvatarEvents> {
  private config: AvatarConfig;
  private state: AvatarState;
  private animationFrame: number = 0;
  private isSpeaking = false;
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private speakingIntensity = 0;
  private targetSpeakingIntensity = 0;
  private breathPhase = 0;

  // NEW: Emotion state
  private currentEmotion: Emotion = 'neutral';
  private targetEmotion: Emotion = 'neutral';
  private emotionIntensity = 0;
  private targetEmotionIntensity = 0;

  constructor(config: Partial<AvatarConfig>) {
    super();
    this.config = AvatarConfigSchema.parse(config);

    this.state = {
      frame: 0,
      mouthOpen: 0,
      tentaclePhase: Array.from({ length: TENTACLE_COUNT }, (_, i) => (i * Math.PI * 2) / TENTACLE_COUNT),
      glowIntensity: 0.5,
      pulsePhase: 0,
      position: { x: 0, y: 0 },
      rotation: 0,
      emotion: 'neutral',
      emotionIntensity: 0,
    };

    this.startAnimation();
  }

  private startAnimation(): void {
    const frameInterval = 1000 / this.config.frameRate;

    this.frameTimer = setInterval(() => {
      this.updateFrame();
    }, frameInterval);
  }

  private updateFrame(): void {
    const dt = 1 / this.config.frameRate;
    const time = this.animationFrame / this.config.frameRate;
    this.animationFrame++;

    // Update breath phase
    this.breathPhase += dt * 0.5;

    // Smooth speaking intensity transition
    const intensityDelta = this.targetSpeakingIntensity - this.speakingIntensity;
    this.speakingIntensity += intensityDelta * Math.min(1, dt * 8);

    // NEW: Smooth emotion transitions
    if (this.config.emotionReactive) {
      this.updateEmotionState(dt);
    }

    // Update tentacle phases with layered wave motion
    this.state.tentaclePhase = this.state.tentaclePhase.map((_, i) => {
      const basePhase = (i * Math.PI * 2) / TENTACLE_COUNT;
      const wave1 = Math.sin(time * 0.5 + i * 0.3) * 0.3;
      const wave2 = Math.sin(time * 0.3 + i * 0.7) * 0.15;
      const speakingWave = this.speakingIntensity * Math.sin(time * 6 + i) * 0.2;

      // NEW: Emotion-based tentacle motion
      const emotionWave = this.getEmotionTentacleMotion(i, time);

      return basePhase + wave1 + wave2 + speakingWave + emotionWave;
    });

    // Idle bob motion
    this.state.position = {
      x: Math.sin(time * 0.7) * 5 + Math.sin(time * 1.1) * 2,
      y: Math.sin(time * 0.5) * 8 + Math.sin(time * 1.3) * 3,
    };

    // Gentle rotation
    this.state.rotation = Math.sin(time * 0.3) * 0.05;

    // Pulse phase for glow animation
    this.state.pulsePhase = (this.state.pulsePhase + dt) % 1;

    // Speaking animation
    if (this.isSpeaking) {
      this.targetSpeakingIntensity = 1;
      this.state.mouthOpen = 0.3 + Math.sin(time * 8) * 0.3 * this.speakingIntensity;
      this.state.mouthOpen += Math.sin(time * 12) * 0.1 * this.speakingIntensity;
      this.state.glowIntensity = 0.6 + Math.sin(time * 4) * 0.2 + this.speakingIntensity * 0.2;
    } else {
      this.targetSpeakingIntensity = 0;
      this.state.mouthOpen = Math.max(this.state.mouthOpen - dt * 3, 0);
      this.state.glowIntensity = 0.5 + Math.sin(time * 0.8) * 0.1;
    }

    // NEW: Apply emotion to glow
    this.state.glowIntensity += this.getEmotionGlowModifier();

    this.state.frame = this.animationFrame;
    this.state.emotion = this.currentEmotion;
    this.state.emotionIntensity = this.emotionIntensity;

    this.emit('frame', { ...this.state });
  }

  // NEW: Emotion-based tentacle motion
  private getEmotionTentacleMotion(tentacleIndex: number, time: number): number {
    if (!this.config.emotionReactive || this.emotionIntensity < 0.1) {
      return 0;
    }

    const intensity = this.emotionIntensity;

    switch (this.currentEmotion) {
      case 'happy':
        // Bouncy, energetic motion
        return Math.sin(time * 3 + tentacleIndex) * 0.15 * intensity;

      case 'sad':
        // Droopy, slow motion
        return Math.sin(time * 0.3 + tentacleIndex * 0.5) * 0.1 * intensity - 0.1 * intensity;

      case 'angry':
        // Tense, rapid motion
        return Math.sin(time * 8 + tentacleIndex * 2) * 0.1 * intensity;

      case 'surprised':
        // Wide spread
        return Math.sin(time * 2) * 0.2 * intensity;

      case 'fearful':
        // Retracted, tight motion
        return -Math.abs(Math.sin(time * 4 + tentacleIndex)) * 0.15 * intensity;

      default:
        return 0;
    }
  }

  // NEW: Emotion-based glow modifier
  private getEmotionGlowModifier(): number {
    if (!this.config.emotionReactive || this.emotionIntensity < 0.1) {
      return 0;
    }

    const glowMap: Record<Emotion, number> = {
      happy: 0.2,
      surprised: 0.15,
      angry: 0.1,
      neutral: 0,
      sad: -0.1,
      fearful: -0.05,
      disgusted: -0.1,
    };

    return (glowMap[this.currentEmotion] ?? 0) * this.emotionIntensity;
  }

  private updateEmotionState(dt: number): void {
    // Smooth transition between emotions
    const transitionSpeed = 2;

    // Transition intensity
    const intensityDelta = this.targetEmotionIntensity - this.emotionIntensity;
    this.emotionIntensity += intensityDelta * Math.min(1, dt * transitionSpeed);

    // Only switch emotion when intensity is low (smooth transition)
    if (this.emotionIntensity < 0.1 && this.targetEmotion !== this.currentEmotion) {
      this.currentEmotion = this.targetEmotion;
    }
  }

  startSpeakingAnimation(): void {
    this.isSpeaking = true;
  }

  stopSpeakingAnimation(): void {
    this.isSpeaking = false;
  }

  setSpeakingAmplitude(amplitude: number): void {
    if (this.isSpeaking) {
      this.targetSpeakingIntensity = Math.min(1, amplitude * 2);
    }
  }

  // NEW: Set emotion state
  setEmotion(emotion: Emotion, intensity: number = 1): void {
    this.targetEmotion = emotion;
    this.targetEmotionIntensity = Math.max(0, Math.min(1, intensity));
  }

  clearEmotion(): void {
    this.targetEmotion = 'neutral';
    this.targetEmotionIntensity = 0;
  }

  setStyle(style: AvatarConfig['style']): void {
    this.config.style = style;
  }

  setColor(color: string): void {
    this.config.color = color;
  }

  getState(): AvatarState {
    return { ...this.state };
  }

  getConfig(): AvatarConfig {
    return { ...this.config };
  }

  destroy(): void {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
    this.removeAllListeners();
  }
}
