import { createError } from 'h3'
import { applyScenario } from '../../mock/scenario'
import { project } from '../../mock/data'
import type { Project } from '#shared/types/domain'

export default defineEventHandler(async (event): Promise<Project> => {
  const slug = getRouterParam(event, 'slug')
  const { empty } = await applyScenario(event)

  if (slug !== project.slug) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'No such project.' })
  }

  // A project with no chapters yet — a briefing that has been created but not filled.
  if (empty) return { ...project, chapters: [] }

  return project
})
