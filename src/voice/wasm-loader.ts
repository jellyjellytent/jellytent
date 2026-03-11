/**
 * WASM Module Loader
 * Loads the Rust-compiled audio processing module
 */

import { logger } from '../utils/logger';

interface WasmModule {
  process_audio: (samples: Float32Array) => Float32Array;
  detect_voice_activity: (samples: Float32Array, threshold: number) => boolean;
  apply_noise_reduction: (samples: Float32Array) => Float32Array;
  get_vad_confidence: () => number;
}

interface WasmImports {
  env: {
    memory: WebAssembly.Memory;
  };
}

let wasmInstance: WasmModule | null = null;
let wasmMemory: WebAssembly.Memory | null = null;

export async function loadWasmModule(): Promise<WasmModule> {
  if (wasmInstance) {
    return wasmInstance;
  }

  logger.info('Loading WASM audio processor');

  try {
    wasmMemory = new WebAssembly.Memory({
      initial: 256,
      maximum: 512,
    });

    const imports: WasmImports = {
      env: {
        memory: wasmMemory,
      },
    };

    // In Node.js environment, load from file
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      const path = await import('path');

      const wasmPath = path.join(__dirname, '../../wasm/audio_processor_bg.wasm');

      try {
        const wasmBuffer = await fs.readFile(wasmPath);
        const { instance } = await WebAssembly.instantiate(wasmBuffer, imports);
        wasmInstance = createWasmModule(instance);
      } catch {
        // WASM not available, use fallback
        logger.warn('WASM module not found, using JavaScript fallback');
        wasmInstance = createFallbackModule();
      }
    } else {
      // Browser environment
      try {
        const response = await fetch('/wasm/audio_processor_bg.wasm');
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM: ${response.status}`);
        }
        const wasmBuffer = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(wasmBuffer, imports);
        wasmInstance = createWasmModule(instance);
      } catch {
        logger.warn('WASM module not available, using JavaScript fallback');
        wasmInstance = createFallbackModule();
      }
    }

    logger.info('WASM audio processor loaded');
    return wasmInstance;
  } catch (error) {
    logger.error('Failed to load WASM module', { error });
    wasmInstance = createFallbackModule();
    return wasmInstance;
  }
}

function createWasmModule(instance: WebAssembly.Instance): WasmModule {
  const exports = instance.exports as Record<string, WebAssembly.ExportValue>;

  return {
    process_audio: (samples: Float32Array): Float32Array => {
      const processAudio = exports['process_audio'] as CallableFunction;
      if (processAudio) {
        return processAudio(samples);
      }
      return samples;
    },

    detect_voice_activity: (samples: Float32Array, threshold: number): boolean => {
      const detectVad = exports['detect_voice_activity'] as CallableFunction;
      if (detectVad) {
        return detectVad(samples, threshold) === 1;
      }
      // Fallback: simple energy-based detection
      const energy = calculateEnergy(samples);
      return energy > threshold;
    },

    apply_noise_reduction: (samples: Float32Array): Float32Array => {
      const reduceNoise = exports['apply_noise_reduction'] as CallableFunction;
      if (reduceNoise) {
        return reduceNoise(samples);
      }
      return samples;
    },

    get_vad_confidence: (): number => {
      const getConfidence = exports['get_vad_confidence'] as CallableFunction;
      if (getConfidence) {
        return getConfidence();
      }
      return 0;
    },
  };
}

function createFallbackModule(): WasmModule {
  let lastVadConfidence = 0;

  return {
    process_audio: (samples: Float32Array): Float32Array => {
      // Simple clipping
      const output = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        output[i] = Math.max(-1, Math.min(1, samples[i]!));
      }
      return output;
    },

    detect_voice_activity: (samples: Float32Array, threshold: number): boolean => {
      const energy = calculateEnergy(samples);
      lastVadConfidence = Math.min(1, energy / (threshold * 2));
      return energy > threshold;
    },

    apply_noise_reduction: (samples: Float32Array): Float32Array => {
      // Simple gate
      const threshold = 0.01;
      const output = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i]!;
        output[i] = Math.abs(sample) > threshold ? sample : sample * 0.1;
      }
      return output;
    },

    get_vad_confidence: (): number => {
      return lastVadConfidence;
    },
  };
}

function calculateEnergy(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]!;
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples.length);
}

export function unloadWasmModule(): void {
  wasmInstance = null;
  wasmMemory = null;
}
