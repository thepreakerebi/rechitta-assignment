import type { Recognition, Utterance } from '#shared/types/domain'

/**
 * The mock's stand-in for speech recognition.
 *
 * In production this is a transcription service, and it lives exactly here —
 * behind the API, not in the browser. That placement is the point of the file:
 * the client captures, measures and releases; the server is what turns an
 * utterance into words. Swapping this function for a real one would not change
 * a single line on the screen.
 *
 * What it cannot do is understand, because it is given no audio to understand.
 * So it does not pretend to: every utterance it can hear at all resolves to the
 * one question this demo answers, and the words are openly a stand-in. What is
 * real is everything around them — the boundary, the measurements, the
 * confidence, and the difference between a question it could not make out and
 * one it has no answer for.
 *
 * Choosing *between* questions from the shape of the sound was tried and
 * removed. It could only ever be arbitrary, and arbitrary reads as broken: the
 * answer on screen changed every time you spoke, for reasons nobody could see.
 */

/** Below this, the agent says it did not catch the question rather than guess. */
export const RECOGNITION_FLOOR = 0.55

/** Less voiced sound than this is a cough, a knock, or a sleeve on the mic. */
const MIN_VOICED_MS = 400

/** Below this peak nothing was said close enough to the microphone to hear. */
const MIN_PEAK = 0.08

/** The length of speech past which more of it adds no further certainty. */
const CLEAR_UTTERANCE_MS = 1600

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * How sure the agent is, from how much there was to go on. A long, clearly
 * voiced utterance is recognised confidently; a two-word mumble is not, and the
 * screen has somewhere to put that.
 */
const confidenceOf = (utterance: Utterance): number => {
  const spoken = clamp01(utterance.voicedMs / CLEAR_UTTERANCE_MS)
  const carried = clamp01(utterance.peak)
  const steady = utterance.durationMs > 0
    ? clamp01(utterance.voicedMs / utterance.durationMs)
    : 0

  return Number((0.34 + spoken * 0.4 + carried * 0.16 + steady * 0.1).toFixed(3))
}

/**
 * Null when there was nothing to recognise — silence, a knock, a microphone
 * nobody spoke into. That is a different outcome from a question the agent has
 * no answer for, and the interface says so differently.
 */
export const recognise = (
  utterance: Utterance,
  questions: readonly string[],
): Recognition | null => {
  if (utterance.voicedMs < MIN_VOICED_MS) return null
  if (utterance.peak < MIN_PEAK) return null

  // The opening question: the one this demo answers, and the one the deck is
  // already showing when it is arrived at to be spoken to.
  const [question] = questions
  if (!question) return null

  return { question, confidence: confidenceOf(utterance) }
}
