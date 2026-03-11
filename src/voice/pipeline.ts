import EventEmitter from 'eventemitter3';
import { VoiceConfig, VoiceConfigSchema } from '../types';
import { MetricsCollector } from '../observability/metrics';

interface VoicePipelineEvents {
  'vad:change': (active: boolean, confidence: number) => void;
  'audio:processed': (buffer: ArrayBuffer) => void;
  'error': (error: Error) => void;
}

interface WasmModule {
  process_audio: (samples: Float32Array) => Float32Array;
  detect_voice_activity: (samples: Float32Array, threshold: number) => boolean;
  apply_noise_reduction: (samples: Float32Array) => Float32Array;
  get_vad_confidence: () => number;
}

interface PipelineOptions {
  wasmModule: WasmModule;
  config: Partial<VoiceConfig>;
  metrics?: MetricsCollector | null;
}

const FRAME_SIZE = 480; // 30ms at 16kHz
const MIN_SPEECH_FRAMES = 3;
const MIN_SILENCE_FRAMES = 15;

export class VoicePipeline extends EventEmitter<VoicePipelineEvents> {
  private wasm: WasmModule;
  private config: VoiceConfig;
  private metrics?: MetricsCollector | null;
  private isRunning = false;
  private vadActive = false;
  private speechFrameCount = 0;
  private silenceFrameCount = 0;
  private buffer: Float32Array[] = [];
  private vadConfidence = 0;

  constructor(options: PipelineOptions) {
    super();
    this.wasm = options.wasmModule;
    this.config = VoiceConfigSchema.parse(options.config);
    this.metrics = options.metrics;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.buffer = [];
    this.speechFrameCount = 0;
    this.silenceFrameCount = 0;
  }

  stop(): void {
    if (!this.isRunning) return;

    // Flush any remaining buffer
    if (this.buffer.length > 0) {
      const combined = this.combineBuffers();
      this.emit('audio:processed', combined.buffer);
    }

    this.isRunning = false;
    this.buffer = [];
    this.vadActive = false;
  }

  processAudioFrame(samples: Float32Array): void {
    if (!this.isRunning) return;

    const startTime = performance.now();

    // Apply noise reduction via WASM
    let processed = samples;
    if (this.config.noiseSuppression) {
      processed = this.wasm.apply_noise_reduction(samples);
    }

    // Voice activity detection via WASM
    const frameHasVoice = this.wasm.detect_voice_activity(processed, this.config.vadSensitivity);
    this.vadConfidence = this.wasm.get_vad_confidence?.() ?? (frameHasVoice ? 1 : 0);

    // Hysteresis for VAD state transitions
    if (frameHasVoice) {
      this.speechFrameCount++;
      this.silenceFrameCount = 0;

      if (!this.vadActive && this.speechFrameCount >= MIN_SPEECH_FRAMES) {
        this.vadActive = true;
        this.emit('vad:change', true, this.vadConfidence);
      }
    } else {
      this.silenceFrameCount++;

      if (this.vadActive && this.silenceFrameCount >= MIN_SILENCE_FRAMES) {
        this.vadActive = false;
        this.speechFrameCount = 0;
        this.emit('vad:change', false, this.vadConfidence);
      }
    }

    // Buffer and emit processed audio
    if (this.vadActive || this.speechFrameCount > 0) {
      this.buffer.push(processed);

      // Send chunks every 250ms during active speech
      if (this.buffer.length * FRAME_SIZE >= this.config.sampleRate / 4) {
        const combined = this.combineBuffers();
        this.emit('audio:processed', combined.buffer);
        this.buffer = [];
      }
    } else if (this.buffer.length > 0) {
      // Flush buffer on transition to silence
      const combined = this.combineBuffers();
      this.emit('audio:processed', combined.buffer);
      this.buffer = [];
    }

    const processingTime = performance.now() - startTime;
    this.metrics?.recordAudioProcessing(processingTime);
    this.metrics?.incrementCounter('audio_frames_total');
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

  getVadConfidence(): number {
    return this.vadConfidence;
  }
}
