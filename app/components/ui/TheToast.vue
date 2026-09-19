<script setup lang="ts">
/**
 * A transient announcement, centred at the top of the screen.
 *
 * It exists because the outcome of asking for the microphone used to sit in the
 * column, between the privacy note and the footer, where it pushed the whole
 * screen down the moment it appeared — the layout rearranging itself as a
 * reward for pressing a button.
 *
 * `<output>` rather than a labelled `section`: it is the native element for
 * "the result of an action", it is already a polite live region, and its
 * content model — phrasing only — is exactly what a toast holds.
 */

const props = withDefaults(defineProps<{
  /** The message, or null for nothing to say. Changing it re-announces. */
  message: string | null
  /**
   * Positive outcomes fade out on their own; critical ones do not. A refusal
   * carries instructions for undoing it, and taking those away on a timer means
   * reading fast or pressing again to get them back.
   */
  tone?: 'positive' | 'critical'
  /** How long a positive message stays, in milliseconds. */
  duration?: number
}>(), {
  tone: 'positive',
  duration: 6000,
})

const dismissed = ref(false)
const paused = ref(false)

const visible = computed(() => Boolean(props.message) && !dismissed.value)

let timer: ReturnType<typeof setTimeout> | undefined

const clear = () => {
  if (timer) clearTimeout(timer)
  timer = undefined
}

/*
 * The countdown holds while the toast is hovered or focused. WCAG's Timing
 * Adjustable exists for exactly this: a message that removes itself on a clock
 * is unreadable to anyone who reads slowly, and a critical one never starts a
 * clock at all.
 */
const schedule = () => {
  clear()
  if (!visible.value || props.tone === 'critical' || paused.value) return
  timer = setTimeout(() => { dismissed.value = true }, props.duration)
}

// A new message is a new announcement, so it comes back even if the last was
// dismissed by hand.
watch(() => props.message, () => {
  dismissed.value = false
  schedule()
})

watch([paused, visible], schedule)
onMounted(schedule)
onBeforeUnmount(clear)
</script>

<template>
  <Transition name="toast">
    <output
      v-if="visible"
      class="toast fixed inset-x-0 z-50 mx-auto flex w-fit max-w-[min(92vw,34rem)] items-start gap-3 rounded-card border px-3.5 py-2.5 text-small leading-[1.45] shadow-lg backdrop-blur-md"
      :class="tone === 'critical'
        ? 'border-alert/40 bg-alert-toast text-text'
        : 'border-gold/40 bg-gold-toast text-text'"
      @pointerenter="paused = true"
      @pointerleave="paused = false"
      @focusin="paused = true"
      @focusout="paused = false"
    >
      {{ message }}

      <button
        class="-me-1 -mt-0.5 grid size-6 shrink-0 place-items-center rounded text-text-muted transition-colors duration-(--duration-quick) hover:text-text"
        type="button"
        @click="dismissed = true"
      >
        <svg
          class="size-3.5"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="m3 3 8 8M11 3l-8 8" />
        </svg>
        <em class="visually-hidden">Dismiss this message</em>
      </button>
    </output>
  </Transition>
</template>

<style scoped>
.toast {
  /* Tight to the top, and clear of a phone's notch. Every pixel lower is a
     pixel of the page heading covered, because on these screens the title
     starts where the toast would otherwise end. */
  inset-block-start: calc(env(safe-area-inset-top, 0px) + clamp(0.5rem, 1.5vh, 1rem));
}

/*
 * Transform and opacity only, so the toast never reflows the page it sits over.
 * The global reduced-motion override collapses both durations to nothing, which
 * leaves it simply appearing and disappearing.
 */
.toast-enter-active {
  transition:
    opacity var(--duration-base) var(--ease-out-soft),
    translate var(--duration-base) var(--ease-out-soft);
}

.toast-leave-active {
  transition:
    opacity var(--duration-quick) var(--ease-out-soft),
    translate var(--duration-quick) var(--ease-out-soft);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  translate: 0 -0.75rem;
}
</style>
