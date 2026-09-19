import { createError, readValidatedBody } from 'h3'
import { z } from 'zod'
import { applyScenario } from '../../mock/scenario'
import { answerFor, askableQuestions } from '../../mock/data'
import { RECOGNITION_FLOOR, recognise } from '../../mock/recognise'
import type { Answer, Recognition } from '#shared/types/domain'

/**
 * Even a mock validates. The shape of what the client may send is part of the
 * contract, and an interface that only works against well-behaved input is not
 * finished.
 *
 * Two ways to ask, and they are genuinely different requests rather than one
 * request with an optional field: a question that was *typed or linked to*
 * arrives as words, and a question that was *spoken* arrives as the shape of
 * the sound, for this endpoint to recognise. A discriminated union means a body
 * cannot claim to be both, and means neither branch can forget what it needs.
 */
const textAsk = z.object({
  kind: z.literal('text'),
  question: z
    .string({ error: 'Ask Rechitta something first.' })
    .trim()
    .min(2, 'Ask a little more than that.')
    .max(400, 'That is longer than Rechitta can take in one question.'),
})

/**
 * No audio, by design. The stream is analysed in the browser and released
 * there; these are measurements of it. Bounded on every field, because a
 * measurement arriving from a client is still an input from a client.
 */
const utteranceAsk = z.object({
  kind: z.literal('utterance'),
  utterance: z.object({
    durationMs: z.number().nonnegative().max(120_000),
    voicedMs: z.number().nonnegative().max(120_000),
    peak: z.number().min(0).max(1),
    mean: z.number().min(0).max(1),
    profile: z.tuple([
      z.number().min(0).max(1),
      z.number().min(0).max(1),
      z.number().min(0).max(1),
    ]),
  }),
})

const askSchema = z.object({
  projectSlug: z.string({ error: 'That briefing could not be identified.' }).trim().min(1),
  ask: z.discriminatedUnion('kind', [textAsk, utteranceAsk]),
})

export default defineEventHandler(async (event): Promise<Answer> => {
  const body = await readValidatedBody(event, askSchema.safeParse)

  if (!body.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Content',
      message: body.error.issues[0]?.message ?? 'That question could not be read.',
    })
  }

  const { ask } = body.data

  /*
   * Recognition first, and it can fail on its own terms. Nothing was said, or
   * nothing carried far enough to be heard — which is not a broken connection
   * and not a question without an answer, so it is neither the error state nor
   * the empty one. 422 rather than 400: the request was well formed, and the
   * agent simply could not make it out.
   */
  const asked = ((): { question: string, heard?: Recognition } => {
    if (ask.kind === 'text') return { question: ask.question }

    const heard = recognise(ask.utterance, askableQuestions)
    if (!heard || heard.confidence < RECOGNITION_FLOOR) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Unprocessable Content',
        message: 'Rechitta did not catch that.',
      })
    }

    return { question: heard.question, heard }
  })()

  const { question, heard } = asked
  const { empty } = await applyScenario(event)

  // The agent understood the words but has nothing to show for them — a real
  // outcome, and the one an empty state exists for.
  if (empty) {
    return {
      id: `ask-${Date.now()}`,
      question,
      transcript: question,
      panels: [],
      ...(heard ? { heard } : {}),
    }
  }

  // Matched on the question, so the feed's seven arrows each get the answer
  // their chapter was asking for rather than one answer with seven doors.
  const found = answerFor(question)

  return {
    ...found,
    id: `${found.id}-${Date.now()}`,
    question,
    ...(heard ? { heard } : {}),
  }
})
