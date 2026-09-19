/**
 * The booking form's rules, as a pure function.
 *
 * They mirror the server's schema deliberately: the server is the authority and
 * validates everything again, but a form that only learns it is wrong after a
 * round trip is a form that wastes the one thing the person has — their
 * attention. The wording is the server's too, so the same mistake never gets
 * described two different ways.
 */

export const NAME_MIN = 2
export const NAME_MAX = 120

export interface BookingDraft {
  readonly name: string
  readonly email: string
  /** The chosen slot's ISO timestamp, or an empty string while none is chosen. */
  readonly slot: string
}

export type BookingField = keyof BookingDraft

/** Only the fields that are wrong appear, so an empty object means valid. */
export type BookingErrors = Partial<Record<BookingField, string>>

/*
 * Deliberately permissive. The only thing a client can usefully catch is a
 * shape that cannot be an address at all — a missing @, a missing dot, a space
 * in the middle. Anything stricter starts rejecting real addresses, and the
 * only way to know an address works is to send to it.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const validateBooking = (draft: BookingDraft): BookingErrors => {
  const errors: Record<string, string> = {}
  const name = draft.name.trim()

  if (name.length < NAME_MIN) errors.name = 'Tell us who to expect.'
  else if (name.length > NAME_MAX) errors.name = 'That name is longer than we can store.'

  if (!EMAIL.test(draft.email.trim())) errors.email = 'That email address does not look right.'

  if (draft.slot.trim().length === 0) errors.slot = 'Choose a time from the list.'

  return errors
}

export const isBookable = (draft: BookingDraft): boolean =>
  Object.keys(validateBooking(draft)).length === 0

/**
 * The first field that is wrong, in the order they are read on screen.
 *
 * Focus goes here on a failed submit: sending someone back to the top of a form
 * to hunt for the problem is the same as not telling them.
 */
export const firstInvalid = (errors: BookingErrors): BookingField | null => {
  const order: readonly BookingField[] = ['slot', 'name', 'email']
  return order.find(field => errors[field] !== undefined) ?? null
}
