import EventEmitter from 'eventemitter3';
import { AvatarConfig, AvatarConfigSchema, AvatarState } from '../types';

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

    // Update tentacle phases with layered wave motion
    this.state.tentaclePhase = this.state.tentaclePhase.map((_, i) => {
      const basePhase = (i * Math.PI * 2) / TENTACLE_COUNT;
      const wave1 = Math.sin(time * 0.5 + i * 0.3) * 0.3;
      const wave2 = Math.sin(time * 0.3 + i * 0.7) * 0.15;
      const speakingWave = this.speakingIntensity * Math.sin(time * 6 + i) * 0.2;
      return basePhase + wave1 + wave2 + speakingWave;
    });

    // Idle bob motion with breath effect
    const breathScale = 1 + Math.sin(this.breathPhase * Math.PI * 2) * 0.02;
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

    this.state.frame = this.animationFrame;
    this.emit('frame', { ...this.state });
  }

  startSpeakingAnimation(): void {
    this.isSpeaking = true;
  }

  stopSpeakingAnimation(): void {
    this.isSpeaking = false;
  }

  setSpeakingAmplitude(amplitude: number): void {
    // Modulate speaking intensity based on audio amplitude
    if (this.isSpeaking) {
      this.targetSpeakingIntensity = Math.min(1, amplitude * 2);
    }
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
