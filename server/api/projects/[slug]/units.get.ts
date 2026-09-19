import { createError } from 'h3'
import { applyScenario } from '../../../mock/scenario'
import { project, units } from '../../../mock/data'
import type { Unit } from '#shared/types/domain'

export default defineEventHandler(async (event): Promise<readonly Unit[]> => {
  const slug = getRouterParam(event, 'slug')
  const { empty } = await applyScenario(event)

  if (slug !== project.slug) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'No such project.' })
  }

  // Sold out: the most likely reason this list is ever empty.
  return empty ? [] : units
})
