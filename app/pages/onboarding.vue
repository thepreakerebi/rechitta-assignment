<script setup lang="ts">
import OnboardingPager from '~/components/ui/OnboardingPager.vue'
import TheOrb from '~/components/orb/TheOrb.vue'
import { useMicAudio } from '~/composables/useMicAudio'
import type { Session } from '#shared/types/domain'

/**
 * 02 · Onboarding — Speak to Discover.
 *
 * The screen that asks for the microphone, so the orb here is deliberately not
 * listening: there is nothing to listen with until the question is answered. It
 * runs its idle drive, which is what the brief's "permission" state should look
 * like — alive and waiting, not dead.
 *
 * The comp scatters five prompts at fixed pixel offsets around the orb. They are
 * placed here as percentages of the stage instead, so the arrangement holds its
 * proportions at any width rather than collapsing into a pile.
 *
 * The device status bar is not reproduced, for the same reason as on the splash.
 */

const NEXT_PATH = '/project/berkeley-square-north'

useSeoMeta({
  title: 'Speak to Discover',
  description:
    'Allow microphone access to search properties naturally, just as you would speak to an agent.',
})

const { data: session } = useApiFetch<Session>('/api/session', { key: 'session' })

const mic = useMicAudio()
const asking = ref(false)
/** Set once the browser has said yes, so the screen can confirm it. */
const allowed = ref(false)

/**
 * Where each prompt sits, as a share of the stage, read off the comp. The tail
 * names the corner the bubble points from — the one corner the comp leaves
 * square while the other three are rounded.
 */
const PLACEMENTS = [
  { top: 5.8, left: 18.4, right: 29.9, tilt: 3.74, tail: 'bl' },
  { top: 25.4, left: 36.5, right: 15.9, tilt: 2.01, tail: 'br' },
  { top: 43.0, left: 7.5, right: 28.7, tilt: -4, tail: 'tl' },
  { top: 64.4, left: 42.7, right: 9.6, tilt: 3.01, tail: 'br' },
  { top: 82.3, left: 21.0, right: 19.4, tilt: 4.31, tail: 'bl' },
] as const

const TAIL_RADIUS: Record<string, string> = {
  bl: 'rounded-2xl rounded-bl-[2px]',
  br: 'rounded-2xl rounded-br-[2px]',
  tl: 'rounded-2xl rounded-tl-[2px]',
}

const prompts = computed(() =>
  (session.value?.suggestedQuestions ?? []).slice(0, PLACEMENTS.length).map((text, index) => ({
    text,
    place: PLACEMENTS[index]!,
  })),
)

/** Once refused, asking again cannot show a prompt — only the browser can undo it. */
const refused = computed(() => mic.status.value === 'blocked')
const unsupported = computed(() => mic.status.value === 'unsupported')
const unavailable = computed(() => mic.status.value === 'unavailable')
/*
 * Settled means the answer will not change by asking again from here. A refusal
 * needs the browser's own controls to undo; an unsupported browser will never
 * support it; and a machine with no capture device has nothing to grant. In all
 * three the control has to stop offering to ask and start offering a way on,
 * otherwise it invites a press that can only fail.
 */
const settled = computed(() => refused.value || unsupported.value || unavailable.value)

/*
 * The label says what the button does. This is the control that fires the
 * browser's permission prompt, so calling it "Next" — as the comp does — would
 * make the prompt a surprise. Once the answer is in and cannot be changed from
 * here, it goes back to being a plain way forward.
 */
const advanceLabel = computed(() => {
  if (asking.value) return 'Waiting…'
  if (allowed.value) return 'Next'
  return settled.value ? 'Continue' : 'Allow microphone'
})

const RECOVERY: Partial<Record<string, string>> = {
  blocked:
    'Microphone access is blocked. You can allow it from the icon in your browser’s address bar — or carry on and read the briefing instead.',
  unsupported:
    'This browser cannot reach a microphone. Carry on and read the briefing instead.',
  unavailable:
    'No microphone was found. Connect one and reload to use voice, or carry on and read the briefing.',
}

const recovery = computed(() => RECOVERY[mic.status.value])

/**
 * The outcome, said once, in a live region.
 *
 * Granting does not navigate on its own. Moving someone the instant a browser
 * dialog closes is disorienting — they have just looked away from the page to
 * answer a system prompt, and arriving somewhere new on the way back gives them
 * no chance to register that it worked. So the screen confirms, the control
 * becomes a plain way forward, and the step is theirs to take.
 */
const outcome = computed(() => {
  if (allowed.value) return 'Microphone connected. Rechitta will listen only while you hold the button on the next screen.'
  return recovery.value
})

/**
 * Voice is an enhancement, never a gate: whatever the browser answers, the
 * briefing is still there. A refusal stops once to explain itself, and the
 * second press goes on regardless.
 */
const advance = async () => {
  if (allowed.value || settled.value) return navigateTo(NEXT_PATH)

  asking.value = true
  // getUserMedia is the first await, so the click's user gesture is still live
  // when it runs — which is what Safari requires before it will show a prompt.
  await mic.start()
  asking.value = false

  // Granted: release the device rather than hold it open. The permission stays
  // with the origin, so the next screen re-opens it without asking again.
  if (mic.status.value === 'listening') {
    mic.stop()
    allowed.value = true
  }
}

onMounted(async () => {
  await mic.peekPermission()
  // A returning visitor has already answered; do not ask a second time.
  if (mic.hasPriorConsent.value) allowed.value = true
})
</script>

<template>
  <main
    id="main"
    class="onboarding relative isolate h-dvh min-h-[50rem] overflow-hidden bg-ink px-edge pb-[clamp(1.5rem,4vh,2.5rem)] pt-[clamp(2rem,7vh,4.5rem)]"
  >
    <section class="relative z-10 mx-auto flex h-full w-full max-w-column flex-col gap-band">
      <header class="animate-rise text-center">
        <h1 class="text-display leading-tight">Speak to Discover</h1>
        <p
          class="mx-auto mt-[clamp(0.5rem,1.5vh,1rem)] max-w-[34ch] text-balance font-light leading-[1.6] text-body text-text-muted"
        >
          Allow microphone access to search properties naturally, just as you would speak
          to an agent.
        </p>
      </header>

      <!-- The orb and the prompts are one region: the heading introduces the
           list, and the orb is the thing the list is addressed to. -->
      <section
        class="orb-stage relative min-h-0 flex-1 animate-rise [animation-delay:120ms]"
        aria-labelledby="prompts-heading"
      >
        <h2
          id="prompts-heading"
          class="relative z-20 mx-auto max-w-[13rem] text-balance text-center text-small uppercase leading-5 tracking-[0.09em] text-text"
        >
          You can ask Rechitta anything
        </h2>

        <!-- One field holding the orb and the prompts together, at the comp's
             own 400×305 proportions. Letting it stretch to whatever height was
             going spare pulled the prompts apart and left them floating off the
             orb; pinning the ratio keeps the cluster exactly as drawn, at any
             size. -->
        <figure class="prompt-field">
          <figure class="orb-well">
            <TheOrb :opacity="0.9" />
          </figure>

          <ul class="absolute inset-0 z-10">
          <li
            v-for="(prompt, index) in prompts"
            :key="prompt.text"
            class="absolute animate-rise"
            :style="{
              top: `${prompt.place.top}%`,
              left: `${prompt.place.left}%`,
              right: `${prompt.place.right}%`,
              rotate: `${prompt.place.tilt}deg`,
              animationDelay: `${index * 70}ms`,
            }"
          >
            <q
              class="glass block text-pretty border border-hairline-soft px-[0.8rem] py-[0.55rem] text-prompt font-medium leading-[1.35] text-bubble-text"
              :class="TAIL_RADIUS[prompt.place.tail]"
            >{{ prompt.text }}</q>
            </li>
          </ul>
        </figure>
      </section>

      <aside
        class="glass animate-rise rounded-card border border-hairline-soft p-[0.8rem] [--glass-blur:2px] [animation-delay:700ms]"
      >
        <p class="flex gap-3">
          <svg
            class="mt-0.5 size-3.5 shrink-0 text-text"
            viewBox="0 0 14 14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M7 0c.126 0 .252.027.366.079l5.149 2.185c.602.254 1.05.848 1.048 1.564-.014 2.712-1.13 7.675-5.841 9.931a1.78 1.78 0 0 1-1.444 0C1.567 11.504.451 6.541.438 3.828A1.72 1.72 0 0 1 1.485 2.264L6.636.079A.93.93 0 0 1 7 0m0 1.827v10.336c3.773-1.827 4.788-5.871 4.813-8.296z"
            />
          </svg>
          <small class="text-note leading-[1.55] text-note-text">
            Your voice data is processed securely and never stored without your explicit
            permission.
            <NuxtLink
              class="text-small text-text-bright underline decoration-from-font underline-offset-2 hover:decoration-2"
              to="/privacy"
            >Privacy&nbsp;Policy</NuxtLink>
          </small>
        </p>
      </aside>

      <!-- Whatever the browser answers, it is said out loud once. -->
      <output
        v-if="outcome"
        class="animate-rise rounded-card border px-4 py-3 text-small leading-[1.5]"
        :class="allowed
          ? 'border-gold/30 bg-gold-soft text-text'
          : 'border-alert/25 bg-alert/8 text-text-muted'"
      >{{ outcome }}</output>

      <footer class="flex animate-fade items-center justify-between pt-[clamp(0.25rem,2vh,1rem)] [animation-delay:800ms]">
        <NuxtLink
          class="rounded px-3 py-3 font-ui text-ui font-medium text-text-faint transition-colors duration-(--duration-quick) hover:text-text"
          :to="NEXT_PATH"
        >
          Skip
          <em class="visually-hidden">, and read the briefing without voice</em>
        </NuxtLink>

        <OnboardingPager :current="2" />

        <button
          class="flex items-center justify-center gap-2 rounded-pill bg-control px-5 py-3 font-ui text-ui font-medium text-text-bright transition-[transform,background-color] duration-(--duration-quick) hover:bg-deep active:scale-[0.98] disabled:opacity-70"
          type="button"
          :aria-busy="asking"
          :disabled="asking"
          @click="advance"
        >
          {{ advanceLabel }}
          <svg
            class="size-5"
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
 * Three background layers, all pseudo-elements: they carry no meaning, so they
 * should not exist in the accessibility tree or the DOM. The comp has a cool
 * wash falling from the top left, a warmer one rising from the bottom right,
 * and the contour field running off every edge.
 */
.onboarding::before {
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

.onboarding::after {
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
 * The stage is a size container so the field below can ask how much height is
 * left and pick the larger of the two constraints.
 */
.orb-stage {
  container-type: size;
}

.prompt-field {
  position: absolute;
  /* Both insets plus auto margins centres it in the space under the heading,
     so when the width is the binding constraint the slack is shared above and
     below rather than pooling under the orb. */
  inset-block: 3.5rem 0;
  inset-inline: 0;
  margin: auto;
  /* Whichever runs out first: the column's width, or the height left below the
     heading. Either way the 400×305 ratio holds and the prompts keep the exact
     spacing they have in the comp. */
  inline-size: min(100%, calc((100cqh - 3.5rem) * 400 / 305));
  aspect-ratio: 400 / 305;
  /* Below roughly a 380px column the prompts wrap to two lines and no longer
     fit the comp's band, so the field deepens rather than letting them stack on
     top of one another. The arrangement loosens; it never collides. */
  min-block-size: 21rem;
}

.orb-well {
  position: absolute;
  inset: 0;
}

/* The second wash, rising from behind the orb. */
.orb-stage::before {
  content: '';
  position: absolute;
  z-index: 0;
  inset-inline-start: -25%;
  inset-block-start: 10%;
  inline-size: min(210%, 58rem);
  aspect-ratio: 839 / 605;
  background: radial-gradient(
    closest-side,
    rgb(0 169 207 / 0.16),
    rgb(0 120 150 / 0.08) 45%,
    transparent 75%
  );
  filter: blur(clamp(24px, 4cqi, 48px));
  pointer-events: none;
}

/*
 * The orb spans nearly the whole frame in the comp, with the prompts sitting on
 * top of it rather than around it. It is allowed to run past the column because
 * its own alpha falls away long before its box does, so the overflow is never
 * visible — and that is what lets it stay large on a narrow screen.
 */
.orb-well {
  display: grid;
  place-items: center;
}

/*
 * The orb runs past the field on purpose. Its alpha falls away long before its
 * box does, so the overflow is never visible, and it is what puts the prompts
 * on the orb rather than around it.
 *
 * Centred by offset rather than by grid alignment. When a grid item is larger
 * than its area, browsers fall back from `center` to start-alignment to keep
 * the overflow reachable — which silently dropped the orb a hundred pixels
 * below the prompts. A translated offset has no such fallback.
 */
.orb-well > * {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  inline-size: 118%;
  translate: -50% -50%;
}

</style>
