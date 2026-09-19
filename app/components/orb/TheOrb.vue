<script setup lang="ts">
import { createOrbRenderer } from '~/utils/orb/renderer'
import { createOrbFallbackRenderer } from '~/utils/orb/fallback'
import { idleDrive } from '~/utils/orb/drive'
import type { OrbRenderer } from '~/utils/orb/renderer'
import type { OrbDrive } from '~/utils/orb/drive'

/**
 * A source is called once per frame, inside requestAnimationFrame. It is a
 * plain function rather than a reactive prop on purpose: nothing about the
 * animation is allowed to enter Vue's reactivity graph sixty times a second.
 */
export type OrbDriveSource = (elapsedMs: number) => OrbDrive

const props = withDefaults(defineProps<{
  /** Where the per-frame audio state comes from. Defaults to a quiet idle. */
  source?: OrbDriveSource
  /** Master opacity, 0..1. */
  opacity?: number
}>(), {
  source: undefined,
  opacity: 1,
})

const canvas = ref<HTMLCanvasElement | null>(null)
const host = ref<HTMLElement | null>(null)

const reducedMotion = usePreferredReducedMotion()
const isVisible = ref(true)
const documentVisible = useDocumentVisibility()

/**
 * A route change tears the page's compositor layers down and rebuilds them, and
 * a WebGL canvas caught in that rebuild is presented before it is painted —
 * which reads as a full-width white flash across the orb. Hiding the canvas the
 * instant a navigation starts costs nothing, because the page is already on its
 * way out behind it.
 *
 * It has to be `visibility`, not opacity. A canvas faded to zero is still
 * composited, and the flash comes straight back; visibility takes it out of
 * painting altogether. Measured at 51% of the frame blown to white with it
 * composited, and 1% without.
 */
const leaving = ref(false)
const router = useRouter()
const stopBeforeEach = router.beforeEach(() => { leaving.value = true })
const stopAfterEach = router.afterEach(() => { leaving.value = false })
onScopeDispose(() => {
  stopBeforeEach()
  stopAfterEach()
})

let renderer: OrbRenderer | null = null
let frame = 0

/**
 * Animation time, accumulated rather than read from the clock, so pausing for a
 * hidden tab resumes the motion where it left off instead of teleporting.
 */
let elapsedMs = 0
let lastFrameAt = 0

/** A backgrounded tab can return a delta of minutes; cap it at two frames. */
const MAX_FRAME_DELTA = 34

const readDrive = (at: number) => (props.source ?? idleDrive)(at)

/**
 * Renders a single frame. Used both by the animation loop and, when motion is
 * reduced or the orb is offscreen, on its own — the orb is then a still image
 * that still redraws when the layout changes.
 */
const renderOnce = () => {
  renderer?.draw(elapsedMs, readDrive(elapsedMs), props.opacity)
}

const loop = (now: number) => {
  frame = requestAnimationFrame(loop)
  elapsedMs += Math.min(now - lastFrameAt, MAX_FRAME_DELTA)
  lastFrameAt = now
  renderOnce()
}

const shouldAnimate = computed(
  () => isVisible.value && documentVisible.value === 'visible' && reducedMotion.value !== 'reduce',
)

const stop = () => {
  if (!frame) return
  cancelAnimationFrame(frame)
  frame = 0
}

const start = () => {
  if (frame || !renderer) return
  lastFrameAt = performance.now()
  frame = requestAnimationFrame(loop)
}

const syncSize = () => {
  const element = host.value
  if (!element || !renderer) return
  const { width, height } = element.getBoundingClientRect()
  renderer.resize(width, height, window.devicePixelRatio)
  // Keep the still frame correct when the box changes but nothing is animating.
  if (!frame) renderOnce()
}

onMounted(() => {
  const element = canvas.value
  if (!element) return

  renderer = createOrbRenderer(element) ?? createOrbFallbackRenderer(element)
  if (!renderer) return

  syncSize()

  const resizeObserver = new ResizeObserver(syncSize)
  if (host.value) resizeObserver.observe(host.value)

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => { isVisible.value = entry?.isIntersecting ?? true },
    { rootMargin: '96px' },
  )
  if (host.value) intersectionObserver.observe(host.value)

  watchEffect(() => {
    if (shouldAnimate.value) start()
    else {
      stop()
      renderOnce()
    }
  })

  onBeforeUnmount(() => {
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    stop()
    // Take the canvas out of the compositor before the context goes. Clearing
    // the buffer is not always enough on its own: the frame in which a context
    // is lost can still be presented, and an undefined buffer presents white.
    element.style.visibility = 'hidden'
    renderer?.dispose()
    renderer = null
  })
})
</script>

<template>
  <figure
    ref="host"
    class="pointer-events-none relative isolate aspect-square w-full"
    aria-hidden="true"
  >
    <canvas
      ref="canvas"
      class="size-full"
      :style="{ visibility: leaving ? 'hidden' : 'visible' }"
    />
  </figure>
</template>

