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
 * It is handed the shape of the sound, and it answers with one of the questions
 * this project knows, chosen from that shape. So the words are a stand-in; the
 * boundary, the failure modes and the confidence are not.
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
 * A stable number for an utterance, so the same sound always yields the same
 * question. Spread across the bands rather than taken from duration alone —
 * keyed only on length, every short question would be the same question.
 */
const signature = (utterance: Utterance): number => {
  const [bass, mid, treble] = utterance.profile
  return Math.round(
    utterance.voicedMs * 0.37
    + utterance.peak * 613
    + utterance.mean * 971
    + bass * 149
    + mid * 233
    + treble * 317,
  )
}

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
  if (questions.length === 0) return null
  if (utterance.voicedMs < MIN_VOICED_MS) return null
  if (utterance.peak < MIN_PEAK) return null

  const index = signature(utterance) % questions.length
  const question = questions[index]
  if (!question) return null

  return { question, confidence: confidenceOf(utterance) }
}
