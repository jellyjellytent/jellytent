//! High-performance audio processing for Jellytent
//!
//! This module provides WASM-compiled audio processing functions for:
//! - Voice Activity Detection (VAD) with confidence scoring
//! - Noise reduction with spectral gating
//! - Audio resampling
//! - Level normalization

use wasm_bindgen::prelude::*;
use std::sync::atomic::{AtomicU32, Ordering};

mod vad;
mod noise;
mod resample;

pub use vad::VoiceActivityDetector;
pub use noise::NoiseReducer;

const FRAME_SIZE: usize = 480; // 30ms at 16kHz

// Global state for VAD confidence (thread-safe)
static VAD_CONFIDENCE: AtomicU32 = AtomicU32::new(0);

/// Process raw audio samples with normalization and clipping
#[wasm_bindgen]
pub fn process_audio(samples: &[f32]) -> Vec<f32> {
    let mut output = Vec::with_capacity(samples.len());

    // Calculate peak for normalization
    let peak = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
    let gain = if peak > 1.0 { 1.0 / peak } else { 1.0 };

    for sample in samples {
        let processed = (sample * gain).clamp(-1.0, 1.0);
        output.push(processed);
    }

    output
}

/// Detect voice activity in audio samples with confidence
/// Returns 1 if voice detected, 0 otherwise
#[wasm_bindgen]
pub fn detect_voice_activity(samples: &[f32], threshold: f32) -> i32 {
    let energy = calculate_rms_energy(samples);
    let zcr = calculate_zcr(samples);
    let spectral_flatness = calculate_spectral_flatness(samples);

    // Multi-feature VAD decision
    let energy_score = if energy > threshold { 1.0 } else { energy / threshold };
    let zcr_score = if zcr < 0.3 { 1.0 } else { 0.3 / zcr };
    let spectral_score = if spectral_flatness < 0.5 { 1.0 } else { 0.5 / spectral_flatness };

    // Weighted combination
    let confidence = (energy_score * 0.5 + zcr_score * 0.3 + spectral_score * 0.2).clamp(0.0, 1.0);

    // Store confidence for retrieval
    VAD_CONFIDENCE.store(confidence.to_bits(), Ordering::SeqCst);

    let voice_detected = energy > threshold && zcr < 0.3 && spectral_flatness < 0.5;
    if voice_detected { 1 } else { 0 }
}

/// Get the confidence of the last VAD decision
#[wasm_bindgen]
pub fn get_vad_confidence() -> f32 {
    f32::from_bits(VAD_CONFIDENCE.load(Ordering::SeqCst))
}

/// Apply spectral gating noise reduction
#[wasm_bindgen]
pub fn apply_noise_reduction(samples: &[f32]) -> Vec<f32> {
    let noise_floor = estimate_noise_floor(samples);
    let gate_threshold = noise_floor * 2.5;
    let attack_coef = 0.1f32;
    let release_coef = 0.05f32;

    let mut output = Vec::with_capacity(samples.len());
    let mut envelope = 0.0f32;

    for sample in samples {
        let abs_sample = sample.abs();

        // Smooth envelope follower
        if abs_sample > envelope {
            envelope = envelope + attack_coef * (abs_sample - envelope);
        } else {
            envelope = envelope + release_coef * (abs_sample - envelope);
        }

        // Soft knee gating
        let gain = if envelope > gate_threshold {
            1.0
        } else if envelope > noise_floor {
            let t = (envelope - noise_floor) / (gate_threshold - noise_floor);
            t * t * (3.0 - 2.0 * t) // Smoothstep
        } else {
            0.1 // Don't completely silence, just attenuate
        };

        output.push(sample * gain);
    }

    output
}

/// Resample audio from one sample rate to another
#[wasm_bindgen]
pub fn resample(samples: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate {
        return samples.to_vec();
    }

    let ratio = to_rate as f64 / from_rate as f64;
    let new_len = (samples.len() as f64 * ratio) as usize;
    let mut output = Vec::with_capacity(new_len);

    for i in 0..new_len {
        let src_idx = i as f64 / ratio;
        let idx_floor = src_idx.floor() as usize;
        let frac = src_idx - idx_floor as f64;

        let sample = if idx_floor + 1 < samples.len() {
            // Linear interpolation
            let s0 = samples[idx_floor] as f64;
            let s1 = samples[idx_floor + 1] as f64;
            (s0 + frac * (s1 - s0)) as f32
        } else if idx_floor < samples.len() {
            samples[idx_floor]
        } else {
            0.0
        };

        output.push(sample);
    }

    output
}

/// Calculate RMS energy of audio samples
fn calculate_rms_energy(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    #[cfg(feature = "simd")]
    {
        // SIMD-optimized version (when available)
        let sum_squares: f32 = samples.chunks(4)
            .map(|chunk| {
                chunk.iter().map(|s| s * s).sum::<f32>()
            })
            .sum();
        (sum_squares / samples.len() as f32).sqrt()
    }

    #[cfg(not(feature = "simd"))]
    {
        let sum_squares: f32 = samples.iter().map(|s| s * s).sum();
        (sum_squares / samples.len() as f32).sqrt()
    }
}

/// Calculate zero-crossing rate
fn calculate_zcr(samples: &[f32]) -> f32 {
    if samples.len() < 2 {
        return 0.0;
    }

    let mut crossings = 0u32;
    for i in 1..samples.len() {
        if (samples[i] >= 0.0) != (samples[i - 1] >= 0.0) {
            crossings += 1;
        }
    }

    crossings as f32 / (samples.len() - 1) as f32
}

/// Calculate spectral flatness (Wiener entropy)
fn calculate_spectral_flatness(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    // Simple approximation using energy distribution
    let mean_energy = samples.iter().map(|s| s.abs()).sum::<f32>() / samples.len() as f32;
    if mean_energy == 0.0 {
        return 0.0;
    }

    let variance: f32 = samples.iter()
        .map(|s| (s.abs() - mean_energy).powi(2))
        .sum::<f32>() / samples.len() as f32;

    let stddev = variance.sqrt();
    let coefficient_of_variation = stddev / mean_energy;

    // Map CV to 0-1 range (higher CV = less flat = more speech-like)
    (1.0 - coefficient_of_variation.min(1.0)).max(0.0)
}

/// Estimate noise floor from audio samples
fn estimate_noise_floor(samples: &[f32]) -> f32 {
    if samples.len() < FRAME_SIZE {
        return 0.01;
    }

    // Find minimum energy frame (likely silence/noise)
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

        // With normalization, all values should be scaled
        assert!(result.iter().all(|&v| v >= -1.0 && v <= 1.0));
    }

    #[test]
    fn test_vad_detects_silence() {
        let silence = vec![0.0; 480];
        let result = detect_voice_activity(&silence, 0.01);

        assert_eq!(result, 0);
        assert!(get_vad_confidence() < 0.5);
    }

    #[test]
    fn test_vad_detects_voice() {
        // Simulate speech-like signal
        let voice: Vec<f32> = (0..480)
            .map(|i| {
                let t = i as f32 / 480.0;
                (t * 200.0 * std::f32::consts::PI).sin() * 0.3
                    + (t * 400.0 * std::f32::consts::PI).sin() * 0.2
            })
            .collect();

        let result = detect_voice_activity(&voice, 0.01);
        assert_eq!(result, 1);
    }

    #[test]
    fn test_noise_reduction_preserves_signal() {
        let signal: Vec<f32> = (0..480)
            .map(|i| (i as f32 * 0.1).sin() * 0.5)
            .collect();

        let result = apply_noise_reduction(&signal);

        assert_eq!(result.len(), signal.len());
        // Signal should be mostly preserved
        let correlation: f32 = signal.iter().zip(result.iter())
            .map(|(a, b)| a * b)
            .sum();
        assert!(correlation > 0.0);
    }

    #[test]
    fn test_resample_same_rate() {
        let samples = vec![1.0, 2.0, 3.0, 4.0];
        let result = resample(&samples, 16000, 16000);

        assert_eq!(result, samples);
    }

    #[test]
    fn test_resample_double_rate() {
        let samples = vec![0.0, 1.0, 0.0, -1.0];
        let result = resample(&samples, 8000, 16000);

        assert_eq!(result.len(), 8);
    }

    #[test]
    fn test_calculate_rms_energy() {
        let samples = vec![1.0, -1.0, 1.0, -1.0];
        let energy = calculate_rms_energy(&samples);

        assert!((energy - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_spectral_flatness_noise() {
        // White noise-like signal should have high flatness
        let noise: Vec<f32> = (0..480).map(|i| ((i * 17) % 100) as f32 / 100.0 - 0.5).collect();
        let flatness = calculate_spectral_flatness(&noise);

        assert!(flatness > 0.3);
    }
}
