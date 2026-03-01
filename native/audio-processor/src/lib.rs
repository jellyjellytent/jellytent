//! High-performance audio processing for Jellytent
//!
//! This module provides WASM-compiled audio processing functions for:
//! - Voice Activity Detection (VAD)
//! - Noise reduction
//! - Audio resampling

use wasm_bindgen::prelude::*;

const FRAME_SIZE: usize = 480; // 30ms at 16kHz

/// Process raw audio samples
#[wasm_bindgen]
pub fn process_audio(samples: &[f32]) -> Vec<f32> {
    let mut output = Vec::with_capacity(samples.len());

    for sample in samples {
        // Apply simple gain normalization
        let processed = sample.clamp(-1.0, 1.0);
        output.push(processed);
    }

    output
}

/// Detect voice activity in audio samples
/// Returns 1 if voice detected, 0 otherwise
#[wasm_bindgen]
pub fn detect_voice_activity(samples: &[f32], threshold: f32) -> i32 {
    let energy = calculate_rms_energy(samples);
    let zero_crossing_rate = calculate_zcr(samples);

    // Combined energy and ZCR based VAD
    let voice_detected = energy > threshold && zero_crossing_rate < 0.3;

    if voice_detected { 1 } else { 0 }
}

/// Apply noise reduction to audio samples
#[wasm_bindgen]
pub fn apply_noise_reduction(samples: &[f32]) -> Vec<f32> {
    let mut output = Vec::with_capacity(samples.len());

    // Estimate noise floor from low-energy frames
    let noise_floor = estimate_noise_floor(samples);

    for sample in samples {
        // Spectral subtraction (simplified)
        let abs_sample = sample.abs();
        let reduced = if abs_sample > noise_floor * 2.0 {
            *sample
        } else {
            sample * (abs_sample / (noise_floor * 2.0)).min(1.0)
        };
        output.push(reduced);
    }

    output
}

/// Calculate RMS energy of audio samples
fn calculate_rms_energy(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    let sum_squares: f32 = samples.iter().map(|s| s * s).sum();
    (sum_squares / samples.len() as f32).sqrt()
}

/// Calculate zero-crossing rate
fn calculate_zcr(samples: &[f32]) -> f32 {
    if samples.len() < 2 {
        return 0.0;
    }

    let mut crossings = 0;
    for i in 1..samples.len() {
        if (samples[i] >= 0.0) != (samples[i - 1] >= 0.0) {
            crossings += 1;
        }
    }

    crossings as f32 / (samples.len() - 1) as f32
}

/// Estimate noise floor from audio samples
fn estimate_noise_floor(samples: &[f32]) -> f32 {
    if samples.len() < FRAME_SIZE {
        return 0.01;
    }

    // Find minimum energy frame
    let mut min_energy = f32::MAX;

    for frame in samples.chunks(FRAME_SIZE) {
        let energy = calculate_rms_energy(frame);
        if energy < min_energy && energy > 0.0 {
            min_energy = energy;
        }
    }

    if min_energy == f32::MAX {
        0.01
    } else {
        min_energy
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_audio_clamps_values() {
        let samples = vec![-2.0, -1.0, 0.0, 1.0, 2.0];
        let result = process_audio(&samples);

        assert_eq!(result, vec![-1.0, -1.0, 0.0, 1.0, 1.0]);
    }

    #[test]
    fn test_vad_detects_silence() {
        let silence = vec![0.0; 480];
        let result = detect_voice_activity(&silence, 0.01);

        assert_eq!(result, 0);
    }

    #[test]
    fn test_vad_detects_voice() {
        let mut voice: Vec<f32> = (0..480)
            .map(|i| (i as f32 * 0.1).sin() * 0.5)
            .collect();
        let result = detect_voice_activity(&voice, 0.01);

        assert_eq!(result, 1);
    }

    #[test]
    fn test_calculate_rms_energy() {
        let samples = vec![1.0, -1.0, 1.0, -1.0];
        let energy = calculate_rms_energy(&samples);

        assert!((energy - 1.0).abs() < 0.0001);
    }
}
