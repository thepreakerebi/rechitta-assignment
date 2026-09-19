import { applyScenario } from '../mock/scenario'
import { session } from '../mock/data'
import type { Session } from '#shared/types/domain'

export default defineEventHandler(async (event): Promise<Session> => {
  const { empty } = await applyScenario(event)

  // An empty session is a real state: a link opened with no broker attached.
  if (empty) {
    return { ...session, broker: { ...session.broker, note: null }, suggestedQuestions: [] }
  }

  return session
})
