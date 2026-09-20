import type {
  Answer,
  AppointmentSlot,
  Media,
  Metric,
  Panel,
  Project,
  Session,
  Unit,
} from '#shared/types/domain'

/**
 * The seed data, transcribed from the Figma design.
 *
 * Five inconsistencies in the comp are corrected here rather than reproduced,
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
 *  5. The Amenities feed card repeated the Returns card's metric — RENTAL ROI
 *     12.73% under a heading about the podium gardens. Amenities are given a
 *     metric of their own.
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
      question: 'What makes this the perfect first investment?',
      panel: 'panel-overview',
    },
    {
      id: 'vision',
      eyebrow: 'The vision',
      title: 'Dubai 2040',
      metricLabel: 'Journey towards',
      metricValue: 'Sustainability',
      hero: { src: '/images/vision.jpg', alt: 'Aerial view of the masterplan, its parkland ringed by low-rise housing.' },
      question: 'What is Dubai 2040, and how does this fit into it?',
      panel: 'panel-vision',
    },
    {
      id: 'location',
      eyebrow: 'Location & connectivity',
      title: 'Jumeirah Village Circle',
      metricLabel: 'Prime',
      metricValue: 'Location',
      hero: { src: '/images/location.jpg', alt: 'A Dubai Metro train crossing the city on elevated track.' },
      question: 'What is nearby, and how long does it take to get there?',
      panel: 'panel-location',
    },
    {
      id: 'details',
      eyebrow: 'The details',
      title: 'The Perfect Home',
      metricLabel: 'Starting from',
      metricValue: '1,489 sqft',
      hero: { src: '/images/details.jpg', alt: 'A fitted kitchen in pale oak and matte grey, island in the foreground.' },
      question: 'Show me what is actually available',
      panel: 'panel-units',
    },
    {
      id: 'plans',
      eyebrow: 'Pricing & payment',
      title: 'The Plans',
      metricLabel: 'Est. value',
      metricValue: 'AED 2.8M',
      hero: { src: '/images/pricing.jpg', alt: 'A home office with a sculpted relief panel above the desk.' },
      question: 'How does the payment plan work?',
      panel: 'panel-plans',
    },
    {
      id: 'returns',
      eyebrow: 'Returns & investment',
      title: 'The Numbers',
      metricLabel: 'Rental ROI',
      metricValue: '12.73%',
      hero: { src: '/images/returns.jpg', alt: 'A living room at dusk, ring pendants over the media wall.' },
      question: 'What sort of return should I expect?',
      panel: 'panel-returns',
    },
    {
      id: 'amenities',
      eyebrow: 'Amenities',
      title: 'The Life Here',
      // The comp repeated the Returns card's metric here, which put a rental
      // yield under a heading about the podium gardens. See note 5 above.
      metricLabel: 'Amenity deck',
      metricValue: '1.2 acres',
      hero: { src: '/images/amenities.jpg', alt: 'The podium gardens, fountains playing beside a children’s play area.' },
      question: 'What is it like to live here?',
      panel: 'panel-amenities',
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
    avatar: { src: '/images/broker.webp', alt: 'Sara Rahman' },
    note: '1 new note for you',
  },
  projectSlug: PROJECT_SLUG,
  // The five the comp shows, in the order it shows them — the onboarding
  // screen lays them out against fixed positions, so the order is meaningful.
  suggestedQuestions: [
    'Is there a 2-bed available…',
    'What’s the price history?',
    'What is proximity to good schools',
    'Show me the floor plan',
    'How does the payment plan work…',
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

const HERO = {
  skyline: { src: '/images/skyline.jpg', alt: 'The Dubai skyline at sunrise, towers under construction in the foreground.' },
  overview: { src: '/images/overview.jpg', alt: 'The completed residences seen from the pool deck at midday.' },
  vision: { src: '/images/vision.jpg', alt: 'Aerial view of the masterplan, its parkland ringed by low-rise housing.' },
  location: { src: '/images/location.jpg', alt: 'A Dubai Metro train crossing the city on elevated track.' },
  details: { src: '/images/details.jpg', alt: 'A fitted kitchen in pale oak and matte grey, island in the foreground.' },
  pricing: { src: '/images/pricing.jpg', alt: 'A home office with a sculpted relief panel above the desk.' },
  returns: { src: '/images/returns.jpg', alt: 'A living room at dusk, ring pendants over the media wall.' },
  amenities: { src: '/images/amenities.jpg', alt: 'The podium gardens, fountains playing beside a children’s play area.' },
} as const

const statsPanel = (id: string, title: string, hero: Media, metrics: readonly Metric[]): Panel =>
  ({ kind: 'stats', id: `panel-${id}`, title, hero, metrics })

/**
 * The seven panels, one per chapter of the briefing.
 *
 * Named and held here rather than written inside each answer, because the
 * answers share them: the opening question earns all seven, and a narrower one
 * earns the two or three that bear on it. Written inline, "what is nearby"
 * and "what makes this a good first investment" would each carry their own
 * copy of the commute times, and one of them would eventually be wrong.
 *
 * Each carries its own title. Titling by *kind* — every grid of figures called
 * "Project overview" — put that heading above the commute times, above the
 * yields, and above the amenity deck. Three shapes of panel are not three
 * things to say.
 */
const PANEL = {
  overview: statsPanel('overview', 'The overview', HERO.skyline, [
    { id: 'entry', label: 'Investment from', value: 'AED 1.68M', detail: '2 bed · 1,489–2,300 sqft' },
    { id: 'handover', label: 'Handover', value: 'Q3 2026', detail: '64% completed' },
    { id: 'appreciation', label: 'Market appreciation', value: '+17.5%', detail: 'AED 2.2B in 2026 → 5.7B in 2031' },
    { id: 'roi', label: 'Rental ROI', value: '12.73%', detail: '2.2× 5-year appreciation' },
  ]),

  vision: statsPanel('vision', 'The vision', HERO.vision, [
    { id: 'population', label: 'Planned population', value: '5.8M', detail: 'By 2040, from 3.5M today' },
    { id: 'green', label: 'Public green space', value: '+105%', detail: 'Parks and nature reserves' },
    { id: 'centres', label: 'Urban centres', value: '5', detail: 'JVC sits inside one of them' },
    { id: 'commute', label: 'Within 20 minutes', value: '55%', detail: 'Of daily journeys, by 2040' },
  ]),

  location: statsPanel('location', 'Location & connectivity', HERO.location, [
    { id: 'metro', label: 'Nearest metro', value: '8 min', detail: 'Dubai Internet City, by car' },
    { id: 'marina', label: 'Dubai Marina', value: '12 min', detail: 'Via Sheikh Zayed Road' },
    { id: 'airport', label: 'DXB airport', value: '25 min', detail: 'Al Khail Road most of the way' },
    { id: 'schools', label: 'Schools within 10 min', value: '6', detail: 'Three rated Very Good or above' },
  ]),

  units: {
    kind: 'units',
    id: 'panel-units',
    title: 'Available now',
    hero: HERO.details,
    units,
  },

  plans: {
    kind: 'plans',
    id: 'panel-plans',
    title: 'Pricing & payment',
    hero: HERO.pricing,
    schedule: instalments,
  },

  returns: statsPanel('returns', 'Returns & investment', HERO.returns, [
    { id: 'roi', label: 'Rental ROI', value: '12.73%', detail: 'Gross, on current JVC rents' },
    { id: 'appreciation', label: 'Market appreciation', value: '+17.5%', detail: 'AED 2.2B in 2026 → 5.7B in 2031' },
    { id: 'multiple', label: 'Over five years', value: '2.2×', detail: 'On the entry price' },
    { id: 'occupancy', label: 'JVC occupancy', value: '94%', detail: 'Twelve-month average' },
  ]),

  amenities: statsPanel('amenities', 'Amenities', HERO.amenities, [
    { id: 'deck', label: 'Amenity deck', value: '1.2 acres', detail: 'Podium level, above the parking' },
    { id: 'pool', label: 'Pools', value: '2', detail: 'Lap pool and a children’s pool' },
    { id: 'gym', label: 'Gym', value: '24/7', detail: 'Technogym, 340 sqm' },
    { id: 'retail', label: 'Retail below', value: '11 units', detail: 'Grocery, pharmacy, two cafés' },
  ]),

  /* Two that belong to one question each rather than to a chapter. */
  specification: statsPanel('specification', 'The specification', HERO.overview, [
    { id: 'sizes', label: 'Sizes', value: '1,489–2,300', detail: 'Square feet, two bedrooms' },
    { id: 'ceilings', label: 'Ceiling height', value: '3.1m', detail: 'Floor to soffit' },
    { id: 'finish', label: 'Kitchens', value: 'Pale oak', detail: 'Bosch appliances throughout' },
    { id: 'parking', label: 'Parking', value: '2 bays', detail: 'Allocated, in the podium' },
  ]),

  arithmetic: statsPanel('arithmetic', 'What you would pay', HERO.skyline, [
    { id: 'deposit', label: 'To reserve', value: 'AED 168K', detail: '10% of AED 1.68M' },
    { id: 'during', label: 'During construction', value: '50%', detail: 'Five instalments of 10%' },
    { id: 'handover', label: 'On handover', value: '40%', detail: 'Due Q3 2026' },
    { id: 'fees', label: 'DLD fee', value: '4%', detail: 'Paid to the Land Department' },
  ]),
} as const satisfies Record<string, Panel>

/**
 * One answer per chapter, because the feed's seven arrows each ask a different
 * question and an answer that ignored the question would make them decoration.
 *
 * What changes between them is how much of the briefing the question earns. The
 * opening question is the whole of it — seven chapters, seven panels, in the
 * order the feed tells it — and "how does the payment plan work" earns the
 * schedule and the arithmetic behind it, not a tour of the gardens.
 */
const answers: readonly Answer[] = [
  {
    id: 'ask-overview',
    question: 'What makes this the perfect first investment?',
    transcript: 'The perfect first investment is the one you can afford to hold. Here is the whole of it — the figures, what is left, and how you would pay for it.',
    voice: '/audio/ask-overview.m4a',
    // The whole briefing, one panel per chapter, in the order it is told.
    panels: [
      PANEL.overview,
      PANEL.vision,
      PANEL.location,
      PANEL.units,
      PANEL.plans,
      PANEL.returns,
      PANEL.amenities,
    ],
  },
  {
    id: 'ask-vision',
    question: 'What is Dubai 2040, and how does this fit into it?',
    transcript: 'Dubai 2040 is the city’s masterplan. Jumeirah Village Circle is one of the five centres it grows around, which is the short answer to why this plot exists.',
    voice: '/audio/ask-vision.m4a',
    panels: [PANEL.vision],
  },
  {
    id: 'ask-location',
    question: 'What is nearby, and how long does it take to get there?',
    transcript: 'Jumeirah Village Circle sits between the two main arteries, which is why everything below is a drive rather than a journey.',
    voice: '/audio/ask-location.m4a',
    panels: [PANEL.location],
  },
  {
    id: 'ask-details',
    question: 'Show me what is actually available',
    transcript: 'Three units are unsold at the moment. The ground-floor one is the only one with its own pool.',
    voice: '/audio/ask-details.m4a',
    panels: [PANEL.units, PANEL.specification],
  },
  {
    id: 'ask-plans',
    question: 'How does the payment plan work?',
    transcript: 'Sixty per cent across construction, forty on handover. Three of the instalments are already behind you if you buy today.',
    voice: '/audio/ask-plans.m4a',
    panels: [PANEL.plans, PANEL.arithmetic],
  },
  {
    id: 'ask-returns',
    question: 'What sort of return should I expect?',
    transcript: 'Twelve point seven three per cent gross, on current rents. The appreciation is the larger half of the answer.',
    voice: '/audio/ask-returns.m4a',
    panels: [PANEL.returns, PANEL.plans],
  },
  {
    id: 'ask-amenities',
    question: 'What is it like to live here?',
    transcript: 'The podium is the answer to that. An acre and a bit of it, above the parking and below the flats.',
    voice: '/audio/ask-amenities.m4a',
    panels: [PANEL.amenities],
  },
]

/** The one she gives when nothing in particular was asked. */
export const answer: Answer = answers[0]!

/**
 * Everything she can be asked, in the order the chapters ask it.
 *
 * Recognition needs the vocabulary it is choosing between, which in a real
 * agent is the language model's and here is this list. Exported rather than
 * reached for through `answers` so the endpoint never sees the answers it is
 * not yet entitled to.
 */
export const askableQuestions: readonly string[] = answers.map(entry => entry.question)

/**
 * The answer to a question, matched on the question itself.
 *
 * Matching on the text rather than on a chapter id keeps /api/agent/ask honest:
 * it takes a question, as an agent endpoint should, and anything it does not
 * recognise still gets an answer rather than an error.
 */
export const answerFor = (question: string): Answer => {
  const asked = question.trim().toLowerCase()
  return answers.find(candidate => candidate.question.toLowerCase() === asked) ?? answer
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
