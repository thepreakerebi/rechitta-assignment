import type {
  Answer,
  AppointmentSlot,
  Project,
  Session,
  Unit,
} from '#shared/types/domain'

/**
 * The seed data, transcribed from the Figma design.
 *
 * Four inconsistencies in the comp are corrected here rather than reproduced,
 * and each is noted where it occurs:
 *
 *  1. "Investment from AED 2.8M" sat above a unit list whose highest price was
 *     2.016M. 2.8M is carried as `estimatedValue` (it is the figure the Plans
 *     card labels EST. VALUE) and `priceFrom` is the real floor, 1.68M.
 *  2. Handover read Q3 2025 on the overview panel and Q3 2026 on the feed card
 *     for the same project. Q3 2026 wins — it is the later of the two and the
 *     one on the card that names the project.
 *  3. Two different units were both numbered #528. The second becomes #512.
 *  4. "Berkley Square North" on the booking card is spelt Berkeley everywhere.
 */

const AED = (dirhams: number) => Math.round(dirhams * 100)

export const PROJECT_SLUG = 'berkeley-square-north'

export const project: Project = {
  slug: PROJECT_SLUG,
  name: 'Berkeley Square North',
  developer: 'Prestige Properties Group',
  tagline: 'A living briefing on every unit, price and answer — always current.',
  district: 'Jumeirah Village Circle',
  districtBadge: 'Prime location',
  handover: '2026-09-30',
  handoverLabel: 'Q3 2026',
  completion: 0.64,
  priceFrom: AED(1_680_000),
  estimatedValue: AED(2_800_000),
  bedrooms: 2,
  areaFromSqft: 1_489,
  areaToSqft: 2_300,
  appreciation: {
    percent: 17.5,
    fromLabel: 'AED 2.2B in 2026',
    toLabel: 'AED 5.7B in 2031',
    multipleOverFiveYears: 2.2,
  },
  rentalRoiPercent: 12.73,
  chapters: [
    {
      id: 'overview',
      eyebrow: 'The overview',
      title: 'Berkeley Square North',
      metricLabel: 'Handover',
      metricValue: 'Q3 2026',
      hero: { src: '/images/overview.jpg', alt: 'The completed residences seen from the pool deck at midday.' },
    },
    {
      id: 'vision',
      eyebrow: 'The vision',
      title: 'Dubai 2040',
      metricLabel: 'Journey towards',
      metricValue: 'Sustainability',
      hero: { src: '/images/vision.jpg', alt: 'Aerial view of the masterplan, its parkland ringed by low-rise housing.' },
    },
    {
      id: 'location',
      eyebrow: 'Location & connectivity',
      title: 'Jumeirah Village Circle',
      metricLabel: 'Prime',
      metricValue: 'Location',
      hero: { src: '/images/location.jpg', alt: 'A Dubai Metro train crossing the city on elevated track.' },
    },
    {
      id: 'details',
      eyebrow: 'The details',
      title: 'The Perfect Home',
      metricLabel: 'Starting from',
      metricValue: '1,489 sqft',
      hero: { src: '/images/details.jpg', alt: 'A fitted kitchen in pale oak and matte grey, island in the foreground.' },
    },
    {
      id: 'plans',
      eyebrow: 'Pricing & payment',
      title: 'The Plans',
      metricLabel: 'Est. value',
      metricValue: 'AED 2.8M',
      hero: { src: '/images/pricing.jpg', alt: 'A home office with a sculpted relief panel above the desk.' },
    },
    {
      id: 'returns',
      eyebrow: 'Returns & investment',
      title: 'The Numbers',
      metricLabel: 'Rental ROI',
      metricValue: '12.73%',
      hero: { src: '/images/returns.jpg', alt: 'A living room at dusk, ring pendants over the media wall.' },
    },
    {
      id: 'amenities',
      eyebrow: 'Amenities',
      title: 'The Life Here',
      metricLabel: 'Rental ROI',
      metricValue: '12.73%',
      hero: { src: '/images/amenities.jpg', alt: 'The podium gardens, fountains playing beside a children’s play area.' },
    },
  ],
}

export const units: readonly Unit[] = [
  {
    id: 'unit-528',
    reference: '#528',
    bedrooms: 2,
    floorLabel: 'Floor 5',
    areaSqft: 1_511,
    price: AED(2_016_000),
    features: ['Corner aspect', 'Skyline view'],
  },
  {
    // The comp numbered this #528 as well; renumbered so the two can be told apart.
    id: 'unit-512',
    reference: '#512',
    bedrooms: 2,
    floorLabel: 'Floor 3',
    areaSqft: 1_489,
    price: AED(1_970_000),
    features: ['Podium view'],
  },
  {
    id: 'unit-g24',
    reference: '#G24',
    bedrooms: 2,
    floorLabel: 'Ground',
    areaSqft: 1_620,
    price: AED(1_680_000),
    features: ['Private pool', 'Garden terrace'],
  },
]

export const session: Session = {
  visitor: { firstName: 'Aryaman' },
  broker: {
    name: 'Sara Rahman',
    company: 'Prestige Group',
    role: 'Senior Advisor',
    avatar: { src: '/images/broker.jpg', alt: 'Sara Rahman' },
    note: '1 new note for you',
  },
  projectSlug: PROJECT_SLUG,
  suggestedQuestions: [
    'Is there a 2-bed available…',
    'What’s the price history?',
    'What is proximity to good schools',
    'Show me the floor plan',
    'How does the payment plan work…',
    'What are the service charges?',
  ],
}

/**
 * The payment plan. The design's pager shows three dots against two drawn
 * panels, so this is the third: the schedule that both the Plans chapter and
 * the "How does the payment plan work…" prompt point at.
 */
const schedule = [
  { id: 'booking', label: 'Booking deposit', dueLabel: 'On reservation', percent: 10, settled: true },
  { id: 'spa', label: 'Sale & purchase agreement', dueLabel: 'Within 60 days', percent: 10, settled: true },
  { id: 'construction-1', label: '40% construction', dueLabel: 'Reached Feb 2026', percent: 10, settled: true },
  { id: 'construction-2', label: '60% construction', dueLabel: 'Reached Jul 2026', percent: 10, settled: false },
  { id: 'construction-3', label: '80% construction', dueLabel: 'Expected Feb 2027', percent: 10, settled: false },
  { id: 'construction-4', label: '100% construction', dueLabel: 'Expected Jun 2027', percent: 10, settled: false },
  { id: 'handover', label: 'On handover', dueLabel: 'Q3 2026', percent: 40, settled: false },
] as const

export const instalments = schedule.map(step => ({
  ...step,
  amount: Math.round((project.priceFrom * step.percent) / 100),
}))

export const answer: Answer = {
  id: 'ask-1',
  question: 'What makes this the perfect first investment?',
  transcript: 'The perfect first investment… ',
  panels: [
    {
      kind: 'stats',
      id: 'panel-stats',
      hero: { src: '/images/skyline.jpg', alt: 'The Dubai skyline at sunrise, towers under construction in the foreground.' },
      metrics: [
        {
          id: 'entry',
          label: 'Investment from',
          value: 'AED 1.68M',
          detail: '2 bed · 1,489–2,300 sqft',
        },
        {
          id: 'handover',
          label: 'Handover',
          value: 'Q3 2026',
          detail: '64% completed',
        },
        {
          id: 'appreciation',
          label: 'Market appreciation',
          value: '+17.5%',
          detail: 'AED 2.2B in 2026 → 5.7B in 2031',
        },
        {
          id: 'roi',
          label: 'Rental ROI',
          value: '12.73%',
          detail: '2.2× 5-year appreciation',
        },
      ],
    },
    {
      kind: 'units',
      id: 'panel-units',
      hero: { src: '/images/returns.jpg', alt: 'A living room at dusk, ring pendants over the media wall.' },
      units,
    },
    {
      kind: 'plans',
      id: 'panel-plans',
      hero: { src: '/images/pricing.jpg', alt: 'A home office with a sculpted relief panel above the desk.' },
      schedule: instalments,
    },
  ],
}

/** Viewing slots, generated forward from today so the demo never goes stale. */
export const appointmentSlots = (from: Date = new Date()): readonly AppointmentSlot[] => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dubai',
  })

  return [1, 1, 2, 3, 4, 5].map((offsetDays, index) => {
    const at = new Date(from)
    at.setDate(at.getDate() + offsetDays)
    at.setHours(index % 2 === 0 ? 11 : 16, 0, 0, 0)

    return {
      id: `slot-${index}`,
      iso: at.toISOString(),
      label: formatter.format(at),
      // One deliberately taken, so the disabled state is real rather than theoretical.
      available: index !== 2,
    }
  })
}
