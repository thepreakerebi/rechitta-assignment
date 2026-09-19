import { describe, expect, it } from 'vitest'
import {
  EMPTY_TALLY,
  VOICE_FLOOR,
  readDriveFrom,
  summarise,
  tallyFrame,
} from '../../app/utils/orb/analyse'
import type { SpectrumSource } from '../../app/utils/orb/analyse'
import type { OrbDrive } from '../../app/utils/orb/drive'

/**
 * The reading and the measuring are shared between the microphone and
 * Rechitta's voice, so they are tested once, here, without a browser.
 */

/** An analyser holding one fixed spectrum, so a frame can be read on a bench. */
const analyserOf = (fill: (bin: number, bins: number) => number): SpectrumSource => ({
  context: { sampleRate: 48_000 },
  getByteFrequencyData: (into) => {
    for (let bin = 0; bin < into.length; bin++) into[bin] = fill(bin, into.length)
  },
})

const buffer = () => new Uint8Array(1024)

const frame = (level: number): OrbDrive => ({ bass: level, mid: level, treble: level, level })

describe('readDriveFrom', () => {
  it('reads silence as nothing at all', () => {
    const drive = readDriveFrom(analyserOf(() => 0), buffer())

    expect(drive).toEqual({ bass: 0, mid: 0, treble: 0, level: 0 })
  })

  it('keeps every band inside 0 and 1, however loud the sound', () => {
    const drive = readDriveFrom(analyserOf(() => 255), buffer())

    for (const value of Object.values(drive)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  // The bands exist to tell one part of the spectrum from another; a reading
  // that moved them together would leave the orb responding to volume alone.
  it('separates the bands rather than moving them together', () => {
    const lowOnly = readDriveFrom(analyserOf(bin => (bin < 6 ? 255 : 0)), buffer())

    expect(lowOnly.bass).toBeGreaterThan(lowOnly.treble)
  })
})

describe('tallyFrame', () => {
  it('counts a frame above the voice floor as speech', () => {
    const tally = tallyFrame(EMPTY_TALLY, frame(VOICE_FLOOR + 0.1), 16)

    expect(tally.voicedMs).toBe(16)
    expect(tally.frames).toBe(1)
  })

  it('counts a frame below it as time, not as speech', () => {
    const tally = tallyFrame(EMPTY_TALLY, frame(VOICE_FLOOR - 0.05), 16)

    expect(tally.voicedMs).toBe(0)
    expect(tally.elapsedMs).toBe(16)
  })

  it('remembers the loudest frame rather than the last', () => {
    const tally = [0.3, 0.9, 0.2].reduce((carry, level) => tallyFrame(carry, frame(level), 16), EMPTY_TALLY)

    expect(tally.peak).toBeCloseTo(0.9)
  })

  it('never mutates the tally it is given', () => {
    const before = tallyFrame(EMPTY_TALLY, frame(0.5), 16)
    tallyFrame(before, frame(0.5), 16)

    expect(before.frames).toBe(1)
  })
})

describe('summarise', () => {
  it('reports averages, not sums', () => {
    const tally = [0.2, 0.4, 0.6].reduce((carry, level) => tallyFrame(carry, frame(level), 16), EMPTY_TALLY)

    expect(summarise(tally, 48).mean).toBeCloseTo(0.4)
  })

  // Frames are dropped when a tab is backgrounded, so the counted speech can
  // outrun the wall clock. An utterance claiming more speech than it lasted is
  // rejected by the endpoint's own bounds.
  it('never reports more speech than the microphone was open for', () => {
    const tally = Array.from({ length: 100 }).reduce<typeof EMPTY_TALLY>(
      carry => tallyFrame(carry, frame(0.9), 100),
      EMPTY_TALLY,
    )

    expect(summarise(tally, 1200).voicedMs).toBeLessThanOrEqual(1200)
  })

  it('reports whole milliseconds, and never a negative duration', () => {
    const summary = summarise(EMPTY_TALLY, -40)

    expect(summary.durationMs).toBe(0)
    expect(Number.isInteger(summary.durationMs)).toBe(true)
  })

  it('carries no trace of the audio beyond the five measurements', () => {
    const summary = summarise(tallyFrame(EMPTY_TALLY, frame(0.5), 16), 16)

    expect(Object.keys(summary).sort()).toEqual(
      ['durationMs', 'mean', 'peak', 'profile', 'voicedMs'],
    )
  })
})
