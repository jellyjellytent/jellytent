/**
 * WASM Module Loader
 * Loads the Rust-compiled audio processing module
 */

interface WasmModule {
  process_audio: (samples: Float32Array) => Float32Array;
  detect_voice_activity: (samples: Float32Array, threshold: number) => boolean;
  apply_noise_reduction: (samples: Float32Array) => Float32Array;
}

let wasmInstance: WasmModule | null = null;

export async function loadWasmModule(): Promise<WasmModule> {
  if (wasmInstance) {
    return wasmInstance;
  }

  try {
    // In Node.js environment, load from file
    if (typeof window === 'undefined') {
      const fs = await import('fs/promises');
      const path = await import('path');

      const wasmPath = path.join(__dirname, '../../wasm/audio_processor_bg.wasm');
      const wasmBuffer = await fs.readFile(wasmPath);

      const { instance } = await WebAssembly.instantiate(wasmBuffer, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256 }),
        },
      });

      wasmInstance = createWasmModule(instance);
    } else {
      // Browser environment
      const response = await fetch('/wasm/audio_processor_bg.wasm');
      const wasmBuffer = await response.arrayBuffer();

      const { instance } = await WebAssembly.instantiate(wasmBuffer, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256 }),
        },
      });

      wasmInstance = createWasmModule(instance);
    }

    return wasmInstance;
  } catch (error) {
    throw new Error(`Failed to load WASM module: ${error}`);
  }
}

function createWasmModule(instance: WebAssembly.Instance): WasmModule {
  const exports = instance.exports as Record<string, WebAssembly.ExportValue>;

  return {
    process_audio: (samples: Float32Array): Float32Array => {
      const processAudio = exports['process_audio'] as CallableFunction;
      return processAudio(samples);
    },

    detect_voice_activity: (samples: Float32Array, threshold: number): boolean => {
      const detectVad = exports['detect_voice_activity'] as CallableFunction;
      return detectVad(samples, threshold) === 1;
    },

    apply_noise_reduction: (samples: Float32Array): Float32Array => {
      const reduceNoise = exports['apply_noise_reduction'] as CallableFunction;
      return reduceNoise(samples);
    },
  };
}
