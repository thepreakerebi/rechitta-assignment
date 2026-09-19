/**
 * The domain, shared by the app and the mock server so the two cannot drift.
 *
 * Money is held as integer fils (1/100 of a dirham) rather than a float,
 * because 1.97M written as a float is not 1.97M. Formatting happens at the
 * edge, never in the data.
 */

export type Money = number

export interface Media {
  readonly src: string
  readonly alt: string
}

export interface Broker {
  readonly name: string
  readonly company: string
  readonly role: string
  readonly avatar: Media
  readonly note: string | null
}

export interface Visitor {
  readonly firstName: string
}

export interface Session {
  readonly visitor: Visitor
  readonly broker: Broker
  readonly projectSlug: string
  /** The prompts shown orbiting the orb during onboarding. */
  readonly suggestedQuestions: readonly string[]
}

/** One full-bleed card in the project feed. */
export interface Chapter {
  readonly id: string
  readonly eyebrow: string
  readonly title: string
  readonly metricLabel: string
  readonly metricValue: string
  readonly hero: Media
}

export interface Appreciation {
  readonly percent: number
  readonly fromLabel: string
  readonly toLabel: string
  readonly multipleOverFiveYears: number
}

export interface Project {
  readonly slug: string
  readonly name: string
  readonly developer: string
  readonly tagline: string
  readonly district: string
  readonly districtBadge: string
  /** ISO 8601 for machines; `handoverLabel` for people. */
  readonly handover: string
  readonly handoverLabel: string
  /** Construction progress, 0..1. */
  readonly completion: number
  readonly priceFrom: Money
  readonly estimatedValue: Money
  readonly bedrooms: number
  readonly areaFromSqft: number
  readonly areaToSqft: number
  readonly appreciation: Appreciation
  readonly rentalRoiPercent: number
  readonly chapters: readonly Chapter[]
}

export interface Unit {
  readonly id: string
  readonly reference: string
  readonly bedrooms: number
  readonly floorLabel: string
  readonly areaSqft: number
  readonly price: Money
  readonly features: readonly string[]
}

export interface Instalment {
  readonly id: string
  readonly label: string
  readonly dueLabel: string
  readonly percent: number
  readonly amount: Money
  readonly settled: boolean
}

export interface Metric {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly detail: string
}

/**
 * One page of the agent's answer.
 *
 * A discriminated union rather than an optional-field bag, so a panel that
 * carries units cannot also claim to carry an instalment schedule, and adding
 * a fourth kind is a compile error everywhere it must be handled.
 */
export type Panel =
  | { readonly kind: 'stats', readonly id: string, readonly hero: Media, readonly metrics: readonly Metric[] }
  | { readonly kind: 'units', readonly id: string, readonly hero: Media, readonly units: readonly Unit[] }
  | { readonly kind: 'plans', readonly id: string, readonly hero: Media, readonly schedule: readonly Instalment[] }

export type PanelKind = Panel['kind']

export interface Answer {
  readonly id: string
  readonly question: string
  readonly transcript: string
  readonly panels: readonly Panel[]
}

export interface Appointment {
  readonly reference: string
  readonly name: string
  readonly email: string
  readonly slot: string
  readonly slotLabel: string
  readonly projectSlug: string
}

export interface AppointmentSlot {
  readonly id: string
  readonly iso: string
  readonly label: string
  readonly available: boolean
}
