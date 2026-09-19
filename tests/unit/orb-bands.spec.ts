import { describe, expect, it } from 'vitest'
import {
  BANDS,
  VOICE_ENVELOPE,
  bandBins,
  bandEnergy,
  followEnvelope,
  frequencyToBin,
  shapeBand,
} from '~/utils/orb/bands'

const SAMPLE_RATE = 48_000
const FFT_SIZE = 2048
/** 48000 / 2048 = 23.4375 Hz per bin. */
const BIN_WIDTH = SAMPLE_RATE / FFT_SIZE

describe('frequencyToBin', () => {
  it('puts a frequency in the bin whose width contains it', () => {
    expect(frequencyToBin(BIN_WIDTH * 10, SAMPLE_RATE, FFT_SIZE)).toBe(10)
  })

  it('clamps below zero', () => {
    expect(frequencyToBin(-500, SAMPLE_RATE, FFT_SIZE)).toBe(0)
  })

  it('clamps at nyquist rather than running off the end of the array', () => {
    expect(frequencyToBin(96_000, SAMPLE_RATE, FFT_SIZE)).toBe(FFT_SIZE / 2 - 1)
  })

  it('tracks the sample rate — the same hertz is a different bin at 44.1k', () => {
    expect(frequencyToBin(1000, 44_100, FFT_SIZE))
      .not.toBe(frequencyToBin(1000, SAMPLE_RATE, FFT_SIZE))
  })
})

describe('bandBins', () => {
  it('returns ranges that do not overlap', () => {
    const [, bassEnd] = bandBins(BANDS.bass, SAMPLE_RATE, FFT_SIZE)
    const [midStart, midEnd] = bandBins(BANDS.mid, SAMPLE_RATE, FFT_SIZE)
    const [trebleStart] = bandBins(BANDS.treble, SAMPLE_RATE, FFT_SIZE)

    expect(bassEnd).toBeLessThanOrEqual(midStart)
    expect(midEnd).toBeLessThanOrEqual(trebleStart)
  })

  it('is never empty, even for a band narrower than one bin', () => {
    const [start, end] = bandBins({ from: 100, to: 101 }, SAMPLE_RATE, FFT_SIZE)
    expect(end).toBeGreaterThan(start)
  })

  it('keeps the DC bin out of bass', () => {
    // 20 Hz is below one bin width, so it rounds to bin 0 — but mains hum and
    // DC offset live there, and the band must still be usable.
    const [start, end] = bandBins(BANDS.bass, SAMPLE_RATE, FFT_SIZE)
    expect(end - start).toBeGreaterThan(5)
  })
})

describe('bandEnergy', () => {
  const spectrum = (values: number[]) => Uint8Array.from(values)

  it('is zero for silence', () => {
    expect(bandEnergy(spectrum([0, 0, 0, 0]), 0, 4)).toBe(0)
  })

  it('is one for a saturated band', () => {
    expect(bandEnergy(spectrum([255, 255, 255, 255]), 0, 4)).toBe(1)
  })

  it('averages across the range rather than taking a peak', () => {
    expect(bandEnergy(spectrum([255, 0, 255, 0]), 0, 4)).toBeCloseTo(0.5, 5)
  })

  it('reads only the bins it was asked for', () => {
    expect(bandEnergy(spectrum([255, 255, 0, 0]), 2, 4)).toBe(0)
  })

  it('survives a range running past the end of the array', () => {
    expect(bandEnergy(spectrum([255, 255]), 0, 999)).toBe(1)
  })

  it('returns zero for an empty range instead of dividing by zero', () => {
    expect(bandEnergy(spectrum([255, 255]), 2, 2)).toBe(0)
  })
})

describe('followEnvelope', () => {
  it('does not move when no time has passed', () => {
    expect(followEnvelope(0.2, 0.9, 0)).toBe(0.2)
  })

  it('moves toward the target without overshooting it', () => {
    const next = followEnvelope(0, 1, 16)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(1)
  })

  it('rises faster than it falls — an attack should be caught, a tail should linger', () => {
    const rise = followEnvelope(0, 1, 16) - 0
    const fall = 1 - followEnvelope(1, 0, 16)
    expect(rise).toBeGreaterThan(fall)
  })

  it('converges to the target given enough time', () => {
    let value = 0
    for (let step = 0; step < 200; step++) value = followEnvelope(value, 1, 16)
    expect(value).toBeCloseTo(1, 4)
  })

  it('is frame-rate independent — 60Hz and 120Hz land in the same place', () => {
    let atSixty = 0
    for (let step = 0; step < 30; step++) atSixty = followEnvelope(atSixty, 1, 16.67)

    let atOneTwenty = 0
    for (let step = 0; step < 60; step++) atOneTwenty = followEnvelope(atOneTwenty, 1, 8.33)

    expect(atOneTwenty).toBeCloseTo(atSixty, 3)
  })

  it('snaps when the time constant is zero', () => {
    expect(followEnvelope(0, 1, 16, { attackMs: 0, releaseMs: 0 })).toBe(1)
  })

  it('stays in range across a noisy run', () => {
    let value = 0
    for (let step = 0; step < 500; step++) {
      const target = step % 7 === 0 ? 1 : 0
      value = followEnvelope(value, target, 16, VOICE_ENVELOPE)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})

describe('shapeBand', () => {
  it('holds room tone at zero', () => {
    expect(shapeBand(0.04, 2.2, 0.06)).toBe(0)
  })

  it('lifts a quiet signal into a usable range', () => {
    expect(shapeBand(0.3, 2.2, 0.06)).toBeCloseTo(0.528, 3)
  })

  it('never exceeds one', () => {
    expect(shapeBand(1, 3.4, 0.03)).toBe(1)
  })

  it('never goes negative', () => {
    expect(shapeBand(0, 2.2, 0.06)).toBe(0)
  })
})
