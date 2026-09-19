import { createError, readValidatedBody } from 'h3'
import { z } from 'zod'
import { applyScenario } from '../../mock/scenario'
import { answer } from '../../mock/data'
import type { Answer } from '#shared/types/domain'

/**
 * Even a mock validates. The shape of what the client may send is part of the
 * contract, and an interface that only works against well-behaved input is not
 * finished.
 */
const askSchema = z.object({
  question: z
    .string({ error: 'Ask Rechitta something first.' })
    .trim()
    .min(2, 'Ask a little more than that.')
    .max(400, 'That is longer than Rechitta can take in one question.'),
  projectSlug: z.string({ error: 'That briefing could not be identified.' }).trim().min(1),
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

  const { empty } = await applyScenario(event)

  // The agent understood the words but has nothing to show for them — a real
  // outcome, and the one an empty state exists for.
  if (empty) {
    return {
      id: `ask-${Date.now()}`,
      question: body.data.question,
      transcript: body.data.question,
      panels: [],
    }
  }

  return { ...answer, id: `ask-${Date.now()}`, question: body.data.question }
})
