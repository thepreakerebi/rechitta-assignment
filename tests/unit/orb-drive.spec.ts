import { describe, expect, it } from 'vitest'
import { SILENT_DRIVE, clamp01, idleDrive, mixDrive } from '~/utils/orb/drive'
import type { OrbDrive } from '~/utils/orb/drive'

const BANDS = ['bass', 'mid', 'treble', 'level'] as const

const inRange = (drive: OrbDrive) => BANDS.every(band => drive[band] >= 0 && drive[band] <= 1)

describe('clamp01', () => {
  it.each([
    [-5, 0],
    [0, 0],
    [0.42, 0.42],
    [1, 1],
    [9, 1],
  ])('clamps %s to %s', (input, expected) => {
    expect(clamp01(input)).toBe(expected)
  })
})

describe('idleDrive', () => {
  it('stays inside 0..1 across a long run', () => {
    for (let ms = 0; ms < 120_000; ms += 137) {
      expect(inRange(idleDrive(ms))).toBe(true)
    }
  })

  it('stays gentle — idle must not look like it is reacting to something', () => {
    for (let ms = 0; ms < 60_000; ms += 211) {
      const drive = idleDrive(ms)
      expect(Math.max(drive.bass, drive.mid, drive.treble, drive.level)).toBeLessThan(0.2)
    }
  })

  it('is deterministic, so a paused orb resumes where it left off', () => {
    expect(idleDrive(4321)).toEqual(idleDrive(4321))
  })

  it('actually moves', () => {
    const samples = new Set([0, 1800, 3600, 5400].map(ms => idleDrive(ms).mid.toFixed(4)))
    expect(samples.size).toBeGreaterThan(1)
  })

  it('does not repeat within a quarter of an hour', () => {
    // Coprime-ish periods: the combined state should not recur early.
    const first = idleDrive(0)
    const later = idleDrive(60_000)
    expect(later).not.toEqual(first)
  })
})

describe('mixDrive', () => {
  const loud: OrbDrive = { bass: 1, mid: 0.8, treble: 0.6, level: 0.9 }

  it('returns the start at 0', () => {
    expect(mixDrive(SILENT_DRIVE, loud, 0)).toEqual(SILENT_DRIVE)
  })

  it('returns the end at 1', () => {
    expect(mixDrive(SILENT_DRIVE, loud, 1)).toEqual(loud)
  })

  it('interpolates halfway', () => {
    expect(mixDrive(SILENT_DRIVE, loud, 0.5)).toEqual({ bass: 0.5, mid: 0.4, treble: 0.3, level: 0.45 })
  })

  it('clamps an out-of-range amount rather than overshooting', () => {
    expect(mixDrive(SILENT_DRIVE, loud, 4)).toEqual(loud)
    expect(mixDrive(SILENT_DRIVE, loud, -2)).toEqual(SILENT_DRIVE)
  })
})
