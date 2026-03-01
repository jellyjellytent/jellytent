import EventEmitter from 'eventemitter3';
import { AvatarConfig, AvatarConfigSchema, AvatarState } from '../types';

interface AvatarEvents {
  'frame': (state: AvatarState) => void;
}

const FRAME_RATE = 60;
const TENTACLE_COUNT = 8;

export class AvatarEngine extends EventEmitter<AvatarEvents> {
  private config: AvatarConfig;
  private state: AvatarState;
  private animationFrame: number = 0;
  private isSpeaking = false;
  private frameTimer: ReturnType<typeof setInterval> | null = null;
  private speakingIntensity = 0;

  constructor(config: Partial<AvatarConfig>) {
    super();
    this.config = AvatarConfigSchema.parse(config);

    this.state = {
      frame: 0,
      mouthOpen: 0,
      tentaclePhase: Array.from({ length: TENTACLE_COUNT }, (_, i) => (i * Math.PI * 2) / TENTACLE_COUNT),
      glowIntensity: 0.5,
      position: { x: 0, y: 0 },
    };

    this.startAnimation();
  }

  private startAnimation(): void {
    const frameInterval = 1000 / FRAME_RATE;

    this.frameTimer = setInterval(() => {
      this.updateFrame();
    }, frameInterval);
  }

  private updateFrame(): void {
    const time = this.animationFrame / FRAME_RATE;
    this.animationFrame++;

    // Update tentacle phases with natural wave motion
    this.state.tentaclePhase = this.state.tentaclePhase.map((phase, i) => {
      const basePhase = (i * Math.PI * 2) / TENTACLE_COUNT;
      return basePhase + Math.sin(time * 0.5 + i * 0.3) * 0.3;
    });

    // Idle bob motion
    this.state.position = {
      x: Math.sin(time * 0.7) * 5,
      y: Math.sin(time * 0.5) * 8 + Math.sin(time * 1.3) * 3,
    };

    // Speaking animation
    if (this.isSpeaking) {
      this.speakingIntensity = Math.min(this.speakingIntensity + 0.1, 1);
      this.state.mouthOpen = 0.3 + Math.sin(time * 8) * 0.3 * this.speakingIntensity;
      this.state.glowIntensity = 0.6 + Math.sin(time * 4) * 0.2;
    } else {
      this.speakingIntensity = Math.max(this.speakingIntensity - 0.05, 0);
      this.state.mouthOpen = Math.max(this.state.mouthOpen - 0.05, 0);
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

  setStyle(style: AvatarConfig['style']): void {
    this.config.style = style;
  }

  getState(): AvatarState {
    return { ...this.state };
  }

  destroy(): void {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
      this.frameTimer = null;
    }
  }
}
