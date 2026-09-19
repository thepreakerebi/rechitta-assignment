<script setup lang="ts">
import TheOrb from '~/components/orb/TheOrb.vue'
import { useMicAudio } from '~/composables/useMicAudio'
import type { MicStatus } from '~/composables/useMicAudio'
import type { OrbDriveSource } from '~/components/orb/TheOrb.vue'
import type { Utterance } from '#shared/types/domain'

/**
 * The persistent agent header: back, who is speaking, what she was asked, and
 * the way to ask her something else.
 *
 * The orb here is a control rather than a showpiece — 49×46 in the comp — but
 * it is the same orb and it runs on the same live audio, so pressing the
 * microphone makes it move with the voice it is hearing.
 *
 * It never opens the microphone on arrival, however this screen was reached.
 * `getUserMedia` needs a live user gesture and a click is consumed by the
 * navigation that brought you here, so it would fail on Safari and prompt on a
 * screen nobody is looking at. Arriving primed means the control is focused,
 * not that it is recording.
 */

const props = defineProps<{
  question: string
  /** Where back goes — the briefing this answer belongs to. */
  backTo: string
  /** Focus the microphone on arrival, without opening it. */
  primed?: boolean
  /** Rechitta's voice, while she has one. The orb draws whichever is live. */
  voice?: OrbDriveSource
  speaking?: boolean
  /**
   * What she said, in words, and only ever in reply to something spoken. It
   * belongs in the header because the header is her turn in the conversation —
   * who is speaking, what she was asked, what she answered — and because
   * sharing one box is the only way the two stay aligned as the question wraps
   * or a refusal pushes the header taller.
   */
  transcript?: string
  /** Whether there is a recording of that answer to stop and start. */
  hasVoice?: boolean
}>()

/**
 * An utterance, or null when the microphone was open and nothing came through
 * it. The page decides what that means; the header only reports it.
 */
const emit = defineEmits<{
  ask: [utterance: Utterance | null]
  /** The microphone is about to open, so anything still playing must stop. */
  listen: []
  replay: []
}>()

const mic = useMicAudio()
const micButton = ref<HTMLButtonElement | null>(null)

/**
 * Whether the microphone has actually been asked for yet.
 *
 * A note explaining a refusal belongs to an attempt. Shown on arrival it tells
 * someone who came here to read that something they never tried has failed —
 * and it pushes the header past the height the comp draws it at, for news
 * nobody asked for.
 */
const attempted = ref(false)

const listening = computed(() => mic.isListening.value)

const MIC_NOTE: Partial<Record<MicStatus, string>> = {
  blocked: 'Microphone access is blocked. Allow it from the icon in your browser’s address bar.',
  unsupported: 'This browser cannot reach a microphone.',
  unavailable: 'No microphone was found. Connect one and reload.',
}

const note = computed(() => (attempted.value ? MIC_NOTE[mic.status.value] : undefined))
const label = computed(() => {
  if (mic.status.value === 'prompting') return 'Waiting for permission…'
  if (note.value) return note.value
  return listening.value ? 'Stop listening' : 'Ask Rechitta something else'
})

/*
 * A refusal cannot be undone from here — only the browser's own controls can
 * lift it — so once it is known the control stops offering to ask. It is not
 * disabled: the reason is on screen beside it, which is the whole of that rule.
 */
const settled = computed(() =>
  attempted.value && ['blocked', 'unsupported', 'unavailable'].includes(mic.status.value))

/**
 * A toggle, as on the onboarding screens: holding has no honest keyboard
 * equivalent. Stopping is the end of a sentence, so it is also the moment to
 * ask — the page decides what that means.
 */
const toggle = async () => {
  if (listening.value) {
    // Measured before the graph is torn down, and taken exactly once — the
    // same utterance can never be sent twice.
    const utterance = mic.takeUtterance()
    mic.stop()
    return emit('ask', utterance)
  }

  // She cannot still be talking into the microphone that is about to open.
  emit('listen')
  await mic.start()
  attempted.value = true
}

/**
 * Whose voice the orb is drawing.
 *
 * Yours while the microphone is open, hers while she is answering, and the idle
 * drive between the two. Both sources have the same shape, so the orb never
 * learns which one it has.
 */
const orbSource = computed<OrbDriveSource | undefined>(() => {
  if (listening.value) return mic.readDrive
  if (props.speaking) return props.voice
  return undefined
})

onMounted(async () => {
  await mic.peekPermission()
  if (props.primed) micButton.value?.focus()
})
</script>

<template>
  <header class="agent">
    <NuxtLink
      class="back"
      :to="backTo"
    >
      <img
        src="/icons/arrow-left.svg"
        alt=""
        width="18"
        height="18"
      >
      <em class="visually-hidden">Back to the briefing</em>
    </NuxtLink>

    <hgroup class="said">
      <p class="who">
        <img
          src="/icons/mark-small.svg"
          alt=""
          width="13"
          height="12"
        >
        Rechitta
      </p>
      <!-- The question, quoted. It is what she is answering, so it belongs in
           the header the answer sits under rather than above one panel of it. -->
      <h1 class="asked">
        <q>{{ question }}</q>
      </h1>
    </hgroup>

    <p class="control">
      <button
        ref="micButton"
        class="mic"
        type="button"
        :aria-pressed="listening"
        :aria-busy="mic.status.value === 'prompting'"
        :aria-describedby="note ? 'mic-note' : undefined"
        :disabled="settled"
        @click="toggle"
      >
        <figure class="mic-orb">
          <TheOrb
            :source="orbSource"
            :opacity="0.9"
          />
        </figure>
        <img
          class="mic-icon"
          src="/icons/mic-small.svg"
          alt=""
          width="17"
          height="17"
        >
        <em class="visually-hidden">{{ label }}</em>
      </button>
    </p>

    <!-- Said once, out loud, when the browser will not listen. -->
    <output
      v-if="note"
      id="mic-note"
      class="note"
    >{{ note }}</output>

    <!-- Her reply in words, for anyone who cannot hear it, has the sound off,
         or reads faster than she speaks. Present only once she has answered
         something that was actually said to her. -->
    <Transition name="spoken">
      <section
        v-if="transcript"
        class="spoken"
        aria-live="polite"
      >
        <q class="words">{{ transcript }}</q>

        <!-- WCAG 1.4.2 asks for a way to stop sound that has started. It is
             also the way to hear it again, which is the commoner need. -->
        <button
          v-if="hasVoice"
          type="button"
          class="sound"
          :aria-pressed="speaking"
          @click="emit('replay')"
        >{{ speaking ? 'Stop' : 'Play again' }}</button>
      </section>
    </Transition>
  </header>
</template>

<style scoped>
.agent {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(0.5rem, 2cqi, 1.25rem);
  inline-size: 100%;
  min-block-size: 4.125rem;
  padding-inline: 1.0625rem;
  padding-block: 0.5rem;
  border: 1px solid var(--color-hairline);
  background-color: rgb(26 26 26 / 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.back {
  display: grid;
  place-items: center;
  /* 18px of icon inside the 44px the touch-target rule asks for. */
  inline-size: 2.75rem;
  block-size: 2.75rem;
  margin-inline-start: -0.625rem;
  border-radius: var(--radius-pill);
  color: var(--color-text);
  transition: background-color var(--duration-quick) var(--ease-out-soft);
}

.back:hover {
  background-color: var(--color-surface-raised);
}

.back img {
  inline-size: 1.125rem;
  block-size: 1.125rem;
}

.said {
  min-inline-size: 0;
}

.who {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--text-small);
  font-weight: 500;
  line-height: 1.35;
  color: var(--color-note-text);
}

.who img {
  inline-size: 0.8125rem;
  block-size: 0.75rem;
}

.asked {
  font-size: clamp(0.8125rem, 0.75rem + 0.25cqi, 1rem);
  font-weight: 600;
  line-height: 1.45;
  color: var(--color-text);
  /* One line in the comp, with the ellipsis doing the work. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control {
  display: flex;
  justify-content: flex-end;
}

/*
 * 49×46 of orb in the comp, inside a target big enough to press. The orb is
 * decoration inside a button, so it is hidden from assistive technology by
 * TheOrb itself and the button carries the name.
 */
.mic {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  margin-inline-end: -0.375rem;
  border-radius: var(--radius-pill);
  transition: transform var(--duration-quick) var(--ease-out-soft);
}

.mic:active {
  transform: scale(0.96);
}

.mic:disabled {
  opacity: 0.55;
}

.mic-orb {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: 3.5rem;
  aspect-ratio: 1;
  translate: -50% -50%;
  mix-blend-mode: screen;
  pointer-events: none;
}

.mic-icon {
  position: relative;
  inline-size: 1.0625rem;
  block-size: 1.0625rem;
}

/* Listening is not carried by the orb alone: it moves, but movement is not a
   state anyone can name. */
.mic[aria-pressed='true'] {
  outline: 2px solid var(--color-gold);
  outline-offset: -2px;
}

.spoken {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  margin-block-start: 0.5rem;
  padding-block-start: 0.5rem;
  border-block-start: 1px solid var(--color-hairline);
}

.words {
  flex: 1 1 14rem;
  font-size: clamp(0.8125rem, 0.75rem + 0.25cqi, 1rem);
  line-height: 1.55;
  color: var(--color-text);
  text-wrap: pretty;
}

/* Pulled out to the header's own edge, so its label lines up with the question
   above rather than sitting a padding's width inside it. */
.sound {
  flex: 0 0 auto;
  min-block-size: 2.75rem;
  margin-inline-end: -0.5rem;
  padding-inline: 0.5rem;
  border-radius: var(--radius-pill);
  font-family: var(--font-ui);
  font-size: var(--text-small);
  font-weight: 500;
  color: var(--color-text-muted);
  transition: color var(--duration-quick) var(--ease-out-soft);
}

.sound:hover {
  color: var(--color-text);
}

.spoken-enter-active,
.spoken-leave-active {
  transition:
    opacity var(--duration-base) var(--ease-out-soft),
    translate var(--duration-base) var(--ease-out-soft);
}

.spoken-enter-from,
.spoken-leave-to {
  opacity: 0;
  translate: 0 -0.5rem;
}

.note {
  grid-column: 1 / -1;
  padding-block-start: 0.25rem;
  font-size: var(--text-small);
  line-height: 1.45;
  color: var(--color-text-muted);
}
</style>
