import { createError, readValidatedBody, setResponseStatus } from 'h3'
import { z } from 'zod'
import { applyScenario } from '../../mock/scenario'
import { appointmentSlots, project } from '../../mock/data'
import type { Appointment } from '#shared/types/domain'

const bookingSchema = z.object({
  name: z
    .string({ error: 'Tell us who to expect.' })
    .trim()
    .min(2, 'Tell us who to expect.')
    .max(120, 'That name is longer than we can store.'),
  email: z.email({ error: 'That email address does not look right.' }),
  slot: z.iso.datetime({ error: 'Choose a time from the list.' }),
  projectSlug: z.string({ error: 'That briefing could not be identified.' }).trim().min(1),
})

/** Two letters and six digits, stable enough to read down a phone. */
const reference = () => `RCH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

export default defineEventHandler(async (event): Promise<Appointment> => {
  const body = await readValidatedBody(event, bookingSchema.safeParse)

  if (!body.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Content',
      message: body.error.issues[0]?.message ?? 'That booking could not be read.',
    })
  }

  await applyScenario(event)

  const slot = appointmentSlots().find(candidate => candidate.iso === body.data.slot)

  if (!slot || !slot.available) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'That time was taken. Choose another and we will confirm it.',
    })
  }

  setResponseStatus(event, 201)

  return {
    reference: reference(),
    name: body.data.name,
    email: body.data.email,
    slot: slot.iso,
    slotLabel: slot.label,
    projectSlug: project.slug,
  }
})
