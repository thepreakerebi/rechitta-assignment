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
  /**
   * What opening this chapter asks Rechitta.
   *
   * The feed is the skim and the answer deck is the detail, and what joins them
   * in this product is a question. Carrying it on the chapter means the card
   * knows what it is asking and the mock knows which answer that is, without
   * either of them keeping a private list of the other's strings.
   */
  readonly question: string
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
type PanelBase = {
  readonly id: string
  /**
   * What this panel is about, which is not the same as what shape it takes.
   * Titled by kind, every grid of figures was called "Project overview" — over
   * the commute times, over the yields, and over the amenity deck.
   */
  readonly title: string
  readonly hero: Media
}

export type Panel =
  | (PanelBase & { readonly kind: 'stats', readonly metrics: readonly Metric[] })
  | (PanelBase & { readonly kind: 'units', readonly units: readonly Unit[] })
  | (PanelBase & { readonly kind: 'plans', readonly schedule: readonly Instalment[] })

export type PanelKind = Panel['kind']

/**
 * What the client measured of something said — and the whole of what it sends.
 *
 * Not the audio. The microphone stream is analysed in the browser and released
 * there; what crosses the wire is the shape of the sound, which is enough for
 * the agent to act on and is not a recording of anyone. `profile` is the same
 * three bands the orb runs on, averaged over the utterance.
 */
export interface Utterance {
  /** How long the microphone was open, in milliseconds. */
  readonly durationMs: number
  /** How much of that carried speech rather than room noise. */
  readonly voicedMs: number
  /** Loudest and average level over the utterance, both 0–1. */
  readonly peak: number
  readonly mean: number
  /** Mean energy in the bass, mid and treble bands, each 0–1. */
  readonly profile: readonly [number, number, number]
}

/**
 * What the agent made of an utterance.
 *
 * Separate from the answer because recognition can succeed while the answer is
 * empty, and can fail while the connection is perfectly healthy. Those are
 * different states on screen and the interface has to tell them apart.
 */
export interface Recognition {
  /** The words the agent believes it heard. */
  readonly question: string
  /** 0–1. Below `RECOGNITION_FLOOR` the agent says so rather than guessing. */
  readonly confidence: number
}

export interface Answer {
  readonly id: string
  readonly question: string
  readonly transcript: string
  readonly panels: readonly Panel[]
  /**
   * Her side of it, spoken. Pre-rendered rather than synthesised in the browser:
   * `speechSynthesis` exposes no audio node, so an orb could only pretend to
   * react to it. A file plays through the same analyser the microphone uses, so
   * the orb moves to her voice by the same four numbers it moves to yours.
   *
   * Absent when there is nothing to say — an answer with no panels is a shrug,
   * and a shrug was never recorded.
   */
  readonly voice?: string
  /** Present when the question was heard rather than typed or linked to. */
  readonly heard?: Recognition
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
