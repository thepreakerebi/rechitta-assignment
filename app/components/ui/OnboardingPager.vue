<script setup lang="ts">
/**
 * The three-step pager from the comp, made navigable.
 *
 * In the comp these are decorative dots, which leaves no way back — the only
 * route to the previous step is the browser's own back button, and on a phone
 * that is a gesture many people never use. Making the existing indicator the
 * control adds no chrome and answers the question the dots already raise.
 *
 * Each dot is an 8px mark inside a 24px target, which is the smallest WCAG 2.2
 * allows for a pointer.
 */
import { readSwipe } from '~/utils/swipe'
import type { SwipePoint } from '~/utils/swipe'

const props = defineProps<{ current: 1 | 2 | 3 }>()

const STEPS = [
  { to: '/', label: 'Meet Rechitta' },
  { to: '/onboarding', label: 'Speak to discover' },
  { to: '/ask', label: 'Say the first thing' },
] as const

const steps = computed(() =>
  STEPS.map((step, index) => ({
    ...step,
    number: index + 1,
    isCurrent: index + 1 === props.current,
  })),
)

const nav = ref<HTMLElement | null>(null)

/**
 * Both axes, because the dots read as a row but the screens read as a sequence,
 * and people reach for whichever matches their mental model. Home and End come
 * with the pattern once the arrows do.
 */
const MOVES: Record<string, number | 'first' | 'last'> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
  Home: 'first',
  End: 'last',
}

const go = (move: number | 'first' | 'last') => {
  const target = move === 'first'
    ? 1
    : move === 'last'
      ? STEPS.length
      : props.current + move

  if (target < 1 || target > STEPS.length || target === props.current) return
  return navigateTo(STEPS[target - 1]!.to)
}

/* ---------------------------------------------------------------------------
   Swiping
--------------------------------------------------------------------------- */

/**
 * The same two steps, by finger.
 *
 * Touch events, not pointer events. A pointer is cancelled the moment the
 * browser decides a gesture belongs to it — on a real touchscreen a sideways
 * drag is a candidate for panning, so `pointercancel` arrives and `pointerup`
 * never does, and the swipe is silently dropped. Synthetic pointer events in a
 * test are never cancelled, which is exactly why this passed in CI and did
 * nothing on a phone.
 *
 * Touch events also answer the other half of the question for free: a mouse
 * never fires them, and a mouse drag across a page is a selection rather than a
 * page turn.
 *
 * Nothing is prevented — the gesture is read after the fact, from where the
 * finger went down and came up — so scrolling, pinching and text selection all
 * carry on as they were.
 */
let from: SwipePoint | null = null

/**
 * Whether the gesture began on something that scrolls sideways of its own
 * accord. The answer deck is a scroll-snap track and the booking times are a
 * wrapping row; a swipe that starts inside either belongs to it, and taking it
 * would move the page out from under the thing being swiped.
 */
const ownsHorizontalScroll = (node: Node | null): boolean => {
  let element = node instanceof Element ? node : node?.parentElement ?? null

  while (element) {
    if (element.scrollWidth > element.clientWidth + 1) {
      const overflow = getComputedStyle(element).overflowX
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    element = element.parentElement
  }

  return false
}

const onTouchStart = (event: TouchEvent) => {
  const touch = event.changedTouches[0]

  // One finger only: two is a pinch, and turning the page under a pinch is the
  // page answering a question it was not asked.
  from = touch && event.touches.length === 1 && !ownsHorizontalScroll(event.target as Node)
    ? { x: touch.clientX, y: touch.clientY, at: event.timeStamp }
    : null
}

const onTouchEnd = (event: TouchEvent) => {
  const start = from
  from = null

  const touch = event.changedTouches[0]
  if (!start || !touch) return

  const swipe = readSwipe(start, { x: touch.clientX, y: touch.clientY, at: event.timeStamp }, window.innerWidth)
  if (!swipe) return

  return go(swipe === 'forward' ? 1 : -1)
}

/**
 * Listened for on the document rather than the pager, so the arrows work from
 * anywhere on the screen rather than only once someone has tabbed onto the
 * dots — which would make the shortcut useful only to people who had already
 * found it.
 *
 * It never takes the keys from something that needs them. A focused control
 * owns its own arrows, and so does a scrollable page, so the shortcut applies
 * only when nothing is focused or the focus is inside the pager itself. Any
 * modifier belongs to the browser: Alt+Left is Back, and stealing it would be
 * worse than offering nothing.
 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  const move = MOVES[event.key]
  if (move === undefined) return

  const target = event.target as Node | null
  const idle = target === document.body || target === document.documentElement
  if (!idle && !nav.value?.contains(target)) return

  event.preventDefault()
  return go(move)
}

/*
 * Bound in setup rather than inside onMounted, so the listener belongs to this
 * component's effect scope and goes with it. Registered from inside a lifecycle
 * hook it outlives the component, and after two steps the flow has three
 * handlers arguing over one keypress.
 */
if (import.meta.client) {
  useEventListener(document, 'keydown', onKeydown)
  // Passive, because nothing here prevents a default — a swipe is read after
  // the fact, so scrolling and selection are never held up waiting on it.
  useEventListener(document, 'touchstart', onTouchStart, { passive: true })
  useEventListener(document, 'touchend', onTouchEnd, { passive: true })
  useEventListener(document, 'touchcancel', () => { from = null }, { passive: true })
}
</script>

<template>
  <nav
    ref="nav"
    aria-label="Onboarding progress"
  >
    <p class="visually-hidden">
      Use the arrow keys, or swipe sideways, to move between the three steps.
    </p>

    <ol class="flex items-center">
      <li
        v-for="step in steps"
        :key="step.to"
      >
        <NuxtLink
          class="group grid size-6 place-items-center rounded"
          :to="step.to"
          :aria-current="step.isCurrent ? 'step' : undefined"
        >
          <i
            class="block h-2 rounded transition-[width,background-color] duration-(--duration-base) ease-(--ease-out-soft)"
            :class="step.isCurrent
              ? 'w-4 bg-text'
              : 'w-2 bg-hairline-strong group-hover:bg-text-faint'"
          />
          <em class="visually-hidden">
            Step {{ step.number }} of {{ steps.length }}: {{ step.label }}
          </em>
        </NuxtLink>
      </li>
    </ol>
  </nav>
</template>
