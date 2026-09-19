import { BANDS, bandBins, bandEnergy, shapeBand } from './bands'
import { clamp01 } from './drive'
import type { OrbDrive } from './drive'

/**
 * Turning an analyser into the four numbers the orb runs on.
 *
 * There are two voices on this site — yours, through the microphone, and
 * Rechitta's, through an audio element — and the orb is meant to move to both
 * the same way. That only stays true if it is the same code, so the reading is
 * here rather than copied into each composable.
 */

/** How hard each band is pushed before the orb sees it. */
export interface Shaping {
  readonly gain: number
  readonly floor: number
}

export interface DriveShaping {
  readonly bass: Shaping
  readonly mid: Shaping
  readonly treble: Shaping
  readonly level: Shaping
}

/**
 * Speech is quiet and narrow after the analyser's mapping; lift it. The same
 * figures serve a recorded voice, because it is the same kind of sound — and a
 * clip shaped differently from the microphone would give the orb a visible
 * seam between hearing you and answering.
 */
export const SPEECH_SHAPING: DriveShaping = {
  bass: { gain: 2.2, floor: 0.06 },
  mid: { gain: 2.6, floor: 0.05 },
  treble: { gain: 3.4, floor: 0.03 },
  level: { gain: 2.4, floor: 0.05 },
}

export const FFT_SIZE = 2048

/**
 * The part of an analyser this file needs, so the reading can be tested without
 * a browser and without an audio context.
 */
export interface SpectrumSource {
  readonly context: { readonly sampleRate: number }
  getByteFrequencyData: (into: Uint8Array<ArrayBuffer>) => void
}

/**
 * One frame, read off the analyser and shaped. Unsmoothed on purpose: the
 * envelope that follows it belongs to whoever is drawing, and a recorded voice
 * and a live microphone settle at different rates.
 */
export const readDriveFrom = (
  analyser: SpectrumSource,
  spectrum: Uint8Array<ArrayBuffer>,
  shaping: DriveShaping = SPEECH_SHAPING,
): OrbDrive => {
  analyser.getByteFrequencyData(spectrum)

  const { sampleRate } = analyser.context
  const band = (from: number, to: number, shape: Shaping) => {
    const [start, end] = bandBins({ from, to }, sampleRate, FFT_SIZE)
    return shapeBand(bandEnergy(spectrum, start, end), shape.gain, shape.floor)
  }

  return {
    bass: band(BANDS.bass.from, BANDS.bass.to, shaping.bass),
    mid: band(BANDS.mid.from, BANDS.mid.to, shaping.mid),
    treble: band(BANDS.treble.from, BANDS.treble.to, shaping.treble),
    level: shapeBand(
      bandEnergy(spectrum, 0, spectrum.length),
      shaping.level.gain,
      shaping.level.floor,
    ),
  }
}

/* -------------------------------------------------------------------------
   Measuring an utterance
------------------------------------------------------------------------- */

/**
 * Above this level, the frame is taken to carry speech rather than a room.
 *
 * Tuned against the shaping above, which already lifts a quiet voice: below it
 * are the fan, the street and the floor the analyser never quite reaches.
 */
export const VOICE_FLOOR = 0.18

/** What one open microphone added up to. */
export interface UtteranceTally {
  readonly frames: number
  readonly elapsedMs: number
  readonly voicedMs: number
  readonly peak: number
  readonly sum: { readonly bass: number, readonly mid: number, readonly treble: number, readonly level: number }
}

export const EMPTY_TALLY: UtteranceTally = {
  frames: 0,
  elapsedMs: 0,
  voicedMs: 0,
  peak: 0,
  sum: { bass: 0, mid: 0, treble: 0, level: 0 },
}

/**
 * Fold one frame into the tally. Pure, so what the agent is told it heard can
 * be tested from a list of frames rather than from a microphone.
 */
export const tallyFrame = (
  tally: UtteranceTally,
  drive: OrbDrive,
  deltaMs: number,
): UtteranceTally => ({
  frames: tally.frames + 1,
  elapsedMs: tally.elapsedMs + deltaMs,
  voicedMs: tally.voicedMs + (drive.level >= VOICE_FLOOR ? deltaMs : 0),
  peak: Math.max(tally.peak, drive.level),
  sum: {
    bass: tally.sum.bass + drive.bass,
    mid: tally.sum.mid + drive.mid,
    treble: tally.sum.treble + drive.treble,
    level: tally.sum.level + drive.level,
  },
})

/**
 * The tally as the agent will receive it: averages rather than sums, everything
 * bounded, and no trace of the audio it came from.
 */
export const summarise = (tally: UtteranceTally, durationMs: number) => {
  const mean = (total: number) => (tally.frames === 0 ? 0 : clamp01(total / tally.frames))

  return {
    durationMs: Math.max(0, Math.round(durationMs)),
    voicedMs: Math.max(0, Math.round(Math.min(tally.voicedMs, durationMs))),
    peak: clamp01(tally.peak),
    mean: mean(tally.sum.level),
    profile: [
      mean(tally.sum.bass),
      mean(tally.sum.mid),
      mean(tally.sum.treble),
    ] as const satisfies readonly [number, number, number],
  }
}
