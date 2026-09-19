import { describe, expect, it } from 'vitest'
import { RECOGNITION_FLOOR, recognise } from '../../server/mock/recognise'
import type { Utterance } from '../../shared/types/domain'

/**
 * The mock recogniser stands where a transcription service stands, so what is
 * worth testing is not which words come back — those are a stand-in — but that
 * it fails where a real one fails, is stable where a real one is stable, and
 * never hands the interface something it cannot use.
 */

const QUESTIONS = ['One?', 'Two?', 'Three?', 'Four?', 'Five?', 'Six?', 'Seven?']

const spoken = (over: Partial<Utterance> = {}): Utterance => ({
  durationMs: 2400,
  voicedMs: 1800,
  peak: 0.62,
  mean: 0.31,
  profile: [0.4, 0.55, 0.22],
  ...over,
})

describe('recognise', () => {
  it('hears a question in an utterance that carried speech', () => {
    const heard = recognise(spoken(), QUESTIONS)

    expect(heard).not.toBeNull()
    expect(QUESTIONS).toContain(heard?.question)
    expect(heard?.confidence).toBeGreaterThanOrEqual(RECOGNITION_FLOOR)
  })

  it('returns the same question for the same utterance, every time', () => {
    const utterance = spoken({ voicedMs: 1450, peak: 0.71 })

    const readings = Array.from({ length: 5 }, () => recognise(utterance, QUESTIONS)?.question)

    expect(new Set(readings).size).toBe(1)
  })

  // Keyed on duration alone, every short question would be the same question —
  // which reads as a broken demo long before anyone suspects the recogniser.
  it('does not give every utterance of the same length the same question', () => {
    const heard = [0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map(peak =>
      recognise(spoken({ peak }), QUESTIONS)?.question)

    expect(new Set(heard).size).toBeGreaterThan(1)
  })

  it('hears nothing in silence', () => {
    expect(recognise(spoken({ voicedMs: 0, peak: 0 }), QUESTIONS)).toBeNull()
  })

  // A cough, a knock, a sleeve across the microphone.
  it('hears nothing in a sound too short to be a question', () => {
    expect(recognise(spoken({ voicedMs: 120 }), QUESTIONS)).toBeNull()
  })

  it('hears nothing said too far from the microphone to carry', () => {
    expect(recognise(spoken({ peak: 0.02 }), QUESTIONS)).toBeNull()
  })

  it('is less sure of a mumble than of a sentence', () => {
    const mumble = recognise(spoken({ durationMs: 3000, voicedMs: 500, peak: 0.2 }), QUESTIONS)
    const sentence = recognise(spoken({ durationMs: 2000, voicedMs: 1900, peak: 0.9 }), QUESTIONS)

    expect(mumble?.confidence).toBeLessThan(sentence?.confidence ?? 0)
  })

  it('never reports a confidence outside 0 and 1', () => {
    const extremes = [
      spoken({ durationMs: 120_000, voicedMs: 120_000, peak: 1, mean: 1 }),
      spoken({ durationMs: 500, voicedMs: 500, peak: 1, mean: 0 }),
      spoken({ voicedMs: 401, peak: 0.09, mean: 0 }),
    ]

    for (const utterance of extremes) {
      const confidence = recognise(utterance, QUESTIONS)?.confidence ?? 0
      expect(confidence).toBeGreaterThanOrEqual(0)
      expect(confidence).toBeLessThanOrEqual(1)
    }
  })

  it('hears nothing when there is nothing it could have been asked', () => {
    expect(recognise(spoken(), [])).toBeNull()
  })
})
