import { applyScenario } from '../../mock/scenario'
import { appointmentSlots } from '../../mock/data'
import type { AppointmentSlot } from '#shared/types/domain'

export default defineEventHandler(async (event): Promise<readonly AppointmentSlot[]> => {
  const { empty } = await applyScenario(event)

  // Fully booked.
  return empty ? [] : appointmentSlots()
})
