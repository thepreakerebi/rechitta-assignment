<script setup lang="ts">
import OnboardingPager from '~/components/ui/OnboardingPager.vue'
import TheOrb from '~/components/orb/TheOrb.vue'
import { useMicAudio } from '~/composables/useMicAudio'
import type { MicStatus } from '~/composables/useMicAudio'
import { spokenForm } from '~/utils/ask'
import type { Answer, PanelKind, Session } from '#shared/types/domain'

/**
 * 03 · First words.
 *
 * The screen where the orb stops performing and starts listening. Screens 01
 * and 02 are both *about* Rechitta — you meet her, then you let her hear. Here
 * you finally say something, and the orb runs on the real microphone: a live
 * FFT, four bands, sixty times a second.
 *
 * What is deliberately not done here is speech recognition. The only browser
 * API for it ships the audio to a vendor's servers, which contradicts both the
 * promise made on screen 02 and this repository's own rule that the stream is
 * never recorded or transmitted. The microphone drives the orb and nothing
 * else: no audio is buffered, and none of it leaves the device.
 *
 * So the question put to the agent is a fixed one, and her reply is mocked —
 * which is what the brief asks for, a mock server covering the complete flow
 * with every state reachable. The one thing the brief requires to be live, the
 * orb reacting to real microphone frequencies, is live.
 */

const BRIEFING_PATH = '/project/berkeley-square-north'

useSeoMeta({
  title: 'Ask Rechitta',
  description:
    'Speak out loud and watch Rechitta listen. Her answer opens the briefing.',
})

const { data: session } = useApiFetch<Session>('/api/session', { key: 'session' })
const scenario = useScenarioQuery()

const mic = useMicAudio()

/*
 * What she is asked. With no picker on the screen, the question is the first of
 * the session's own suggestions — the mock answers the same whichever arrives,
 * and the constant keeps the control pressable before the session has landed
 * rather than making someone wait for a list they never see.
 */
const FALLBACK_QUESTION = 'What makes this the perfect first investment?'

const question = computed(() => {
  const first = session.value?.suggestedQuestions?.[0]
  return first ? spokenForm(first) : FALLBACK_QUESTION
})

/**
 * Everything the screen can be, as one value. A separate `loading` boolean and
 * `answer` ref would allow "thinking, and also failed", which is not a thing.
 */
type AskState =
  | { readonly kind: 'asking' }
  | { readonly kind: 'thinking', readonly question: string }
  | { readonly kind: 'answered', readonly answer: Answer }
  | { readonly kind: 'empty', readonly question: string }
  | { readonly kind: 'failed', readonly question: string, readonly reason: string }

const state = ref<AskState>({ kind: 'asking' })

/* ---------------------------------------------------------------------------
   The microphone
--------------------------------------------------------------------------- */

const LISTENABLE: readonly MicStatus[] = ['idle', 'prompting', 'listening']
const canListen = computed(() => LISTENABLE.includes(mic.status.value))

const MIC_NOTE: Partial<Record<MicStatus, string>> = {
  blocked:
    'Microphone access is blocked, so the orb cannot hear you. Allow it from the icon in your browser’s address bar — or carry on, and she will answer all the same.',
  unsupported:
    'This browser cannot reach a microphone. Carry on — she will answer all the same.',
  unavailable:
    'No microphone was found. Connect one and reload to speak, or carry on — she will answer all the same.',
}

const micNote = computed(() => MIC_NOTE[mic.status.value])

const micLabel = computed(() => {
  if (mic.status.value === 'prompting') return 'Waiting for permission…'
  return mic.isListening.value ? 'Stop listening' : 'Speak'
})

/*
 * A toggle rather than press-and-hold. Holding is the familiar voice-assistant
 * gesture, but it has no honest keyboard equivalent, and WCAG 2.2 wants every
 * pointer path to have one. A toggle is the same two states reached by mouse,
 * touch, keyboard and switch alike, and the microphone is still open only for
 * as long as someone is actually speaking.
 */
const toggleMic = async () => {
  if (mic.isListening.value) return mic.stop()
  await mic.start()
}

/* ---------------------------------------------------------------------------
   Asking
--------------------------------------------------------------------------- */

const ask = async () => {
  const asked = question.value

  // Never hold the device open across a request. The permission stays with the
  // origin, so speaking again costs nothing.
  mic.stop()

  state.value = { kind: 'thinking', question: asked }

  try {
    const answer = await $fetch<Answer>('/api/agent/ask', {
      method: 'POST',
      query: scenario.value,
      body: { question: asked, projectSlug: session.value?.projectSlug ?? 'berkeley-square-north' },
    })

    state.value = answer.panels.length === 0
      ? { kind: 'empty', question: asked }
      : { kind: 'answered', answer }
  }
  catch {
    // The server's own message is deliberately never surfaced. What the person
    // needs is the next move, not the status code.
    state.value = {
      kind: 'failed',
      question: asked,
      reason: 'Rechitta could not answer just now. Your question is still here — try again.',
    }
  }
}

/** The primary control does whatever the screen's current state needs next. */
const advance = () => {
  if (state.value.kind === 'answered') return navigateTo(BRIEFING_PATH)
  return ask()
}

const advanceLabel = computed(() => {
  switch (state.value.kind) {
    case 'thinking': return 'Asking…'
    case 'answered': return 'See the briefing'
    case 'failed': return 'Try again'
    default: return 'Ask Rechitta'
  }
})

/**
 * What her answer carries, read off the panels themselves. Writing "the
 * numbers, the units and the payment plan" as a fixed sentence would be a lie
 * the first time the mock returns two panels instead of three.
 */
const PANEL_NOUN: Record<PanelKind, string> = {
  stats: 'the numbers',
  units: 'the available units',
  plans: 'the payment plan',
}

const answerContents = computed(() => {
  if (state.value.kind !== 'answered') return ''
  return new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' })
    .format(state.value.answer.panels.map(panel => PANEL_NOUN[panel.kind]))
})

const isThinking = computed(() => state.value.kind === 'thinking')

onMounted(() => { void mic.peekPermission() })
</script>

<template>
  <main
    id="main"
    class="ask relative isolate flex min-h-dvh flex-col overflow-hidden bg-ink px-edge pb-[clamp(1.5rem,4vh,2.5rem)] pt-[clamp(2rem,7vh,4.5rem)]"
  >
    <section class="relative z-10 mx-auto flex w-full max-w-column flex-1 flex-col gap-band">
      <header class="animate-rise text-center">
        <h1 class="text-display leading-tight">Say the first thing</h1>
        <p
          class="mx-auto mt-[clamp(0.5rem,1.5vh,1rem)] max-w-[36ch] text-balance font-light leading-[1.6] text-body text-text-muted"
        >
          <!-- Which verb is right depends on the pointer, not the window width:
               a narrow desktop window is still a mouse, and a wide tablet is
               still a finger. Only one of the two is ever in the accessibility
               tree, so it is never read out twice. -->
          <b class="by-pointer font-light">Click</b><b class="by-touch font-light">Tap</b>
          “Speak”, speak out loud, and watch her listen.
        </p>
      </header>

      <!-- The orb and the control that wakes it. -->
      <section
        class="orb-stage relative min-h-0 flex-1 animate-rise [animation-delay:120ms]"
        aria-labelledby="listening-heading"
      >
        <h2 id="listening-heading" class="visually-hidden">Speak to Rechitta</h2>

        <figure class="orb-well">
          <TheOrb
            :source="mic.readDrive"
            :opacity="0.9"
          />
        </figure>

        <p
          v-if="canListen"
          class="relative z-10 flex justify-center"
        >
          <button
            class="flex min-h-11 items-center gap-2 rounded-pill border px-5 py-3 font-ui text-ui font-medium transition-[background-color,border-color,transform] duration-(--duration-quick) active:scale-[0.98]"
            :class="mic.isListening.value
              ? 'border-gold/50 bg-gold-soft text-text'
              : 'border-hairline-strong bg-control text-text-bright hover:bg-deep'"
            type="button"
            :aria-pressed="mic.isListening.value"
            :aria-busy="mic.status.value === 'prompting'"
            @click="toggleMic"
          >
            <svg
              class="size-5 shrink-0"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <rect
                x="7.5"
                y="2"
                width="5"
                height="9"
                rx="2.5"
              />
              <path d="M4.5 9a5.5 5.5 0 0 0 11 0M10 14.5V18" />
            </svg>
            {{ micLabel }}
          </button>
        </p>

        <!-- Said once, out loud: the orb is the visual answer, and it is
             hidden from assistive technology by design. -->
        <output
          v-if="mic.isListening.value"
          class="relative z-10 mt-3 block animate-fade text-center text-small text-text-muted"
        >
          Listening. The orb is moving with your voice.
        </output>

        <p
          v-else-if="micNote"
          class="relative z-10 mt-3 rounded-card border border-alert/25 bg-alert/8 px-4 py-3 text-small leading-[1.5] text-text-muted"
        >
          {{ micNote }}
        </p>
      </section>

      <!-- What came back. One region, four shapes, announced as it changes.
           A <output> would be the natural element, but its content model is
           phrasing only and these panels are flow content — so this is one of
           the few places the rules allow ARIA over an element that does not
           exist. -->
      <section
        class="min-w-0"
        aria-live="polite"
        :aria-busy="isThinking"
      >
        <article
          v-if="state.kind === 'thinking'"
          class="rounded-panel border border-hairline-soft bg-surface p-4"
        >
          <p class="caps-meta">Rechitta is thinking</p>
          <q class="mt-2 block text-pretty text-small leading-[1.5] text-text-muted">{{ state.question }}</q>
          <!-- The answer's own shape, so nothing jumps when it arrives. -->
          <p class="mt-3 flex flex-col gap-2">
            <i class="skeleton block h-3 w-full rounded" />
            <i class="skeleton block h-3 w-[88%] rounded [animation-delay:120ms]" />
            <i class="skeleton block h-3 w-[64%] rounded [animation-delay:240ms]" />
          </p>
        </article>

        <article
          v-else-if="state.kind === 'answered'"
          class="animate-rise rounded-panel border border-gold/30 bg-gold-soft p-4"
        >
          <p class="caps-meta">Rechitta answered</p>
          <q class="mt-2 block text-pretty text-body leading-[1.6] text-text">{{ state.answer.transcript.trim() }}</q>
          <p class="mt-3 text-small leading-[1.5] text-text-muted">
            She has {{ answerContents }} ready. They open with the briefing.
          </p>
        </article>

        <article
          v-else-if="state.kind === 'empty'"
          class="animate-rise rounded-panel border border-hairline bg-surface p-4"
        >
          <p class="caps-meta">Nothing to show yet</p>
          <q class="mt-2 block text-pretty text-small leading-[1.5] text-text-muted">{{ state.question }}</q>
          <p class="mt-2 text-body leading-[1.6] text-text">
            Rechitta understood the question but has nothing on file for it.
          </p>
          <p class="mt-3 text-small leading-[1.5] text-text-muted">
            Ask her again in a moment, or carry on — the briefing covers it either way.
          </p>
        </article>

        <article
          v-else-if="state.kind === 'failed'"
          class="animate-rise rounded-panel border border-alert/30 bg-alert/8 p-4"
        >
          <p class="caps-meta">She could not answer</p>
          <q class="mt-2 block text-pretty text-small leading-[1.5] text-text-muted">{{ state.question }}</q>
          <p class="mt-2 text-body leading-[1.6] text-text">{{ state.reason }}</p>
        </article>
      </section>

      <footer class="flex animate-fade items-center justify-between gap-3 pt-[clamp(0.25rem,2vh,1rem)] [animation-delay:400ms]">
        <NuxtLink
          class="rounded px-3 py-3 font-ui text-ui font-medium text-text-faint transition-colors duration-(--duration-quick) hover:text-text"
          :to="BRIEFING_PATH"
        >
          Skip
          <em class="visually-hidden">, and go straight to the briefing</em>
        </NuxtLink>

        <OnboardingPager :current="3" />

        <button
          class="flex min-h-11 items-center justify-center gap-2 rounded-pill bg-control px-5 py-3 font-ui text-ui font-medium text-text-bright transition-[transform,background-color] duration-(--duration-quick) hover:bg-deep active:scale-[0.98] disabled:opacity-70"
          type="button"
          :aria-busy="isThinking"
          :disabled="isThinking"
          @click="advance"
        >
          {{ advanceLabel }}
          <svg
            class="size-5 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4.167 10h11.666" />
            <path d="M10 4.166 15.833 10 10 15.833" />
          </svg>
        </button>
      </footer>
    </section>
  </main>
</template>

<style scoped>
/*
 * The same two washes the onboarding screen carries, so the third step reads as
 * the same room rather than a new one. Pseudo-elements, because they mean
 * nothing and so belong in neither the DOM nor the accessibility tree.
 */
.ask::before {
  content: '';
  position: absolute;
  z-index: 0;
  inset-inline-start: -69%;
  inset-block-start: -18%;
  inline-size: min(206%, 66rem);
  aspect-ratio: 825 / 615;
  background: radial-gradient(
    closest-side,
    rgb(0 169 207 / 0.2),
    rgb(0 127 155 / 0.15) 25%,
    rgb(0 85 104 / 0.1) 50%,
    rgb(0 42 52 / 0.05) 75%,
    transparent 100%
  );
  filter: blur(clamp(20px, 3cqi, 40px));
  pointer-events: none;
}

.ask::after {
  content: '';
  position: absolute;
  z-index: 0;
  inset: 5% -68.72% 12.47% -22.82%;
  background-image: url('/brand/contour-lines-onboarding.svg');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: color-dodge;
  pointer-events: none;
}

/*
 * The orb is the largest thing on the screen and the only one that must never
 * be cropped, so it is sized as a share of the column with a ceiling in vh —
 * on a short desktop window the height runs out long before the width does.
 */
.orb-stage {
  display: grid;
  justify-items: center;
  /* The stage takes whatever height is going spare, so the orb sits in the
     middle of it rather than pinned under the copy with the footer adrift. */
  align-content: center;
}

.orb-well {
  position: relative;
  inline-size: min(100%, 44vh);
  aspect-ratio: 1;
  /* The orb's alpha falls away well inside its box, so the canvas carries a
     wide transparent margin on every side. Pulling it up into the copy above
     and the control below closes a gap that looks like a layout mistake but is
     really just empty pixels. */
  margin-block: -10% -12%;
  pointer-events: none;
}

/*
 * A skeleton, not a spinner: it has the shape of the sentence that is coming,
 * so the answer arrives into its own outline instead of shoving the page down.
 * The global reduced-motion override collapses the animation to a still bar.
 */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    var(--color-surface-raised) 50%,
    var(--color-surface) 100%
  );
  background-size: 200% 100%;
  animation: sheen 1.4s var(--ease-in-out-soft) infinite;
}

/*
 * One of these two is always display:none, so the sentence reads correctly and
 * is announced once.
 *
 * Two conditions, because either one alone gets it wrong: a coarse pointer
 * catches a tablet held in the hand, and the narrow viewport catches a desktop
 * window sized down to a phone — which is how this screen is most often looked
 * at, and where "Click" beside a phone-shaped layout reads as a bug.
 */
.by-touch {
  display: none;
}

@media (hover: none) and (pointer: coarse), (width < 40rem) {
  .by-pointer {
    display: none;
  }

  .by-touch {
    display: inline;
  }
}

@keyframes sheen {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
</style>
