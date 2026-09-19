import { clamp01 } from './drive'

/** A slice of the spectrum, in hertz. */
export interface Band {
  readonly from: number
  readonly to: number
}

/**
 * The three bands the orb listens on.
 *
 * Bass starts at 20 Hz rather than 0 so the DC bin and mains hum stay out of it,
 * and treble stops at 8 kHz because almost nothing above that survives a laptop
 * microphone with any consistency.
 */
export const BANDS = {
  bass: { from: 20, to: 250 },
  mid: { from: 250, to: 2000 },
  treble: { from: 2000, to: 8000 },
} as const satisfies Record<string, Band>

/**
 * Which analyser bin a frequency lands in.
 *
 * An FFT of `fftSize` over `sampleRate` produces `fftSize / 2` bins spanning
 * nyquist, so each bin is `sampleRate / fftSize` hertz wide.
 */
export const frequencyToBin = (hertz: number, sampleRate: number, fftSize: number): number => {
  const binWidth = sampleRate / fftSize
  const bins = fftSize / 2
  const index = Math.round(hertz / binWidth)
  return Math.min(Math.max(index, 0), bins - 1)
}

/** The half-open bin range covering a band, always at least one bin wide. */
export const bandBins = (band: Band, sampleRate: number, fftSize: number): readonly [number, number] => {
  const start = frequencyToBin(band.from, sampleRate, fftSize)
  const end = frequencyToBin(band.to, sampleRate, fftSize)
  return [start, Math.max(end, start + 1)]
}

/**
 * Mean energy across a bin range, normalised to 0..1.
 *
 * `getByteFrequencyData` has already mapped decibels onto 0..255 using the
 * analyser's min/max, so the mean of the bytes is the right average here — an
 * RMS would be squaring numbers that are already logarithmic.
 */
export const bandEnergy = (spectrum: Uint8Array, startBin: number, endBin: number): number => {
  const start = Math.max(0, Math.min(startBin, spectrum.length))
  const end = Math.max(start, Math.min(endBin, spectrum.length))
  if (end === start) return 0

  let total = 0
  for (let bin = start; bin < end; bin++) total += spectrum[bin] ?? 0
  return clamp01(total / (end - start) / 255)
}

/** How quickly a value is allowed to rise and fall, as time constants. */
export interface Envelope {
  readonly attackMs: number
  readonly releaseMs: number
}

/**
 * Rising fast and falling slow is what separates a pulse from a strobe. The
 * orb should catch the attack of a word and then settle, rather than flicker
 * at whatever rate the frames happen to arrive.
 */
export const VOICE_ENVELOPE: Envelope = { attackMs: 60, releaseMs: 320 }

/**
 * One step of an exponential follower.
 *
 * Framing it as a time constant rather than a per-frame fraction is what keeps
 * the motion identical at 60Hz and at 120Hz.
 */
export const followEnvelope = (
  current: number,
  target: number,
  deltaMs: number,
  envelope: Envelope = VOICE_ENVELOPE,
): number => {
  if (deltaMs <= 0) return current

  const tau = target > current ? envelope.attackMs : envelope.releaseMs
  if (tau <= 0) return target

  const coefficient = 1 - Math.exp(-deltaMs / tau)
  return current + (target - current) * coefficient
}

/**
 * Lifts a band reading into a usable range.
 *
 * Conversational speech through a laptop microphone sits low and narrow even
 * after the analyser's decibel mapping, so without this the orb barely moves.
 */
export const shapeBand = (energy: number, gain: number, floor: number): number =>
  clamp01((clamp01(energy) - floor) * gain)
