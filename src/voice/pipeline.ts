import EventEmitter from 'eventemitter3';
import { VoiceConfig, VoiceConfigSchema } from '../types';

interface VoicePipelineEvents {
  'vad:change': (active: boolean) => void;
  'audio:processed': (buffer: ArrayBuffer) => void;
  'error': (error: Error) => void;
}

interface WasmModule {
  process_audio: (samples: Float32Array) => Float32Array;
  detect_voice_activity: (samples: Float32Array, threshold: number) => boolean;
  apply_noise_reduction: (samples: Float32Array) => Float32Array;
}

interface PipelineOptions {
  wasmModule: WasmModule;
  config: Partial<VoiceConfig>;
}

const FRAME_SIZE = 480; // 30ms at 16kHz

export class VoicePipeline extends EventEmitter<VoicePipelineEvents> {
  private wasm: WasmModule;
  private config: VoiceConfig;
  private isRunning = false;
  private vadActive = false;
  private buffer: Float32Array[] = [];

  constructor(options: PipelineOptions) {
    super();
    this.wasm = options.wasmModule;
    this.config = VoiceConfigSchema.parse(options.config);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.buffer = [];
  }

  stop(): void {
    this.isRunning = false;
    this.buffer = [];
  }

  processAudioFrame(samples: Float32Array): void {
    if (!this.isRunning) return;

    // Apply noise reduction via WASM
    let processed = samples;
    if (this.config.noiseSuppression) {
      processed = this.wasm.apply_noise_reduction(samples);
    }

    // Voice activity detection via WASM
    const wasActive = this.vadActive;
    this.vadActive = this.wasm.detect_voice_activity(processed, this.config.vadSensitivity);

    if (wasActive !== this.vadActive) {
      this.emit('vad:change', this.vadActive);
    }

    // Buffer and emit processed audio
    if (this.vadActive) {
      this.buffer.push(processed);

      if (this.buffer.length * FRAME_SIZE >= this.config.sampleRate / 4) {
        const combined = this.combineBuffers();
        this.emit('audio:processed', combined.buffer);
        this.buffer = [];
      }
    } else if (this.buffer.length > 0) {
      // Flush remaining buffer
      const combined = this.combineBuffers();
      this.emit('audio:processed', combined.buffer);
      this.buffer = [];
    }
  }

  private combineBuffers(): Float32Array {
    const totalLength = this.buffer.reduce((sum, b) => sum + b.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;

    for (const buf of this.buffer) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    return combined;
  }

  setVadSensitivity(sensitivity: number): void {
    this.config.vadSensitivity = Math.max(0, Math.min(1, sensitivity));
  }

  isActive(): boolean {
    return this.vadActive;
  }
}
