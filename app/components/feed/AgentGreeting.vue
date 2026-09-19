<script setup lang="ts">
import TheOrb from '~/components/orb/TheOrb.vue'

/**
 * The head of the feed: Rechitta introducing herself over the orb.
 *
 * The orb here does not listen. This screen is a briefing, not a conversation —
 * nobody has asked to speak — so it runs its idle drive exactly as on the
 * onboarding screen, and the microphone is never opened. The two controls are a
 * way *into* the conversation, not a live capture.
 *
 * Everything is a share of one named length, `--frame`. The comp's group is 400
 * wide and every part of it is drawn at a fixed offset inside that — the orb at
 * x 17, the mark at 174,72, the greeting at 70,118, the controls at 152,226 —
 * so multiplying one length reproduces those offsets at any size. It is a real
 * length rather than a percentage on purpose: percentages resolve against the
 * containing block, or against the parent font size, and neither is the frame.
 */

const props = defineProps<{
  greeting: string | null
  slug: string
  loading?: boolean
}>()

/*
 * Two doors into one room, not two rooms. The deck is where her answer is and
 * where the next question is asked, so both land there; the microphone arrives
 * with its control focused, ready for one press.
 *
 * It arrives primed rather than recording. `getUserMedia` needs a live user
 * gesture and this click is spent on the navigation, so opening the microphone
 * on the other side would fail on Safari and, where it worked, would be a
 * recording nobody started on the screen they are now looking at.
 */
const deck = computed(() => `/project/${props.slug}/answer`)
</script>

<template>
  <header class="hero">
    <!-- The pane clips; the header does not. The controls have to hang past
         the bottom edge onto the first chapter, as they do in the comp. -->
    <figure class="pane">
      <!-- The page's one heading. The feed had none at all: seven chapters
           of h2 under nothing, which is a heading level skipped on the very
           first line of the document. -->
      <h1 class="welcome">
        Welcome <em class="not-italic">👋</em>
      </h1>

      <figure class="stage">
        <figure class="orb-well">
          <TheOrb :opacity="0.9" />
        </figure>

        <!-- The mark, riding on the orb: the sprite the splash already ships,
             cropped to its leftmost glyph exactly as the comp crops it. -->
        <figure class="mark">
          <img
            src="/brand/logo-white.webp"
            alt=""
            width="1024"
            height="152"
          >
        </figure>

        <!-- In flow, so the block is as tall as the words actually are. -->
        <figcaption class="speech">
          <p
            v-if="loading"
            class="flex flex-col items-center gap-2"
            aria-busy="true"
          >
            <i class="skeleton block h-3 w-[72%] rounded" />
            <i class="skeleton block h-3 w-[92%] rounded [animation-delay:120ms]" />
            <i class="skeleton block h-3 w-[58%] rounded [animation-delay:240ms]" />
            <em class="visually-hidden">Rechitta is getting ready.</em>
          </p>

          <p
            v-else-if="greeting"
            class="text-pretty text-center leading-[1.85] text-white"
          >{{ greeting }}</p>
        </figcaption>
      </figure>
    </figure>

    <!-- Into the conversation, and into the transcript. Both land on the
         screen that actually listens rather than opening a microphone here. -->
    <nav
      class="discs"
      aria-label="Talk to Rechitta"
    >
      <NuxtLink
        class="disc"
        :to="deck"
      >
        <img
          src="/icons/transcript.svg"
          alt=""
          width="24"
          height="24"
        >
        <em class="visually-hidden">Read Rechitta’s answer</em>
      </NuxtLink>

      <NuxtLink
        class="disc"
        :to="`${deck}?speak=1`"
      >
        <img
          src="/icons/microphone.svg"
          alt=""
          width="24"
          height="24"
        >
        <em class="visually-hidden">Ask Rechitta something, out loud</em>
      </NuxtLink>
    </nav>
  </header>
</template>

<style scoped>
.hero {
  position: relative;
  /*
   * Above the chapters, so the controls that hang over the first one are not
   * painted out by it — and, less obviously, so they stay pressable. The
   * accordion lays an invisible opener across every panel; at z-index 2 it tied
   * with this and won on document order, covering the lower half of both
   * controls. They looked perfectly fine and were 45px by 23px to a finger.
   */
  z-index: 5;
  container-type: inline-size;
  --frame: min(94cqw, clamp(23rem, 30cqw, 32rem));
  --disc: max(2.75rem, calc(var(--frame) * 0.105));
}

.pane {
  position: relative;
  isolation: isolate;
  overflow: clip;
  background-color: var(--color-ink);
  padding-block: clamp(1.5rem, 6vh, 3rem) calc(var(--frame) * 0.18);
}

.welcome {
  position: relative;
  z-index: 4;
  text-align: center;
  line-height: normal;
  color: rgb(255 255 255 / 0.75);
  font-size: clamp(1.05rem, calc(var(--frame) * 0.05), 1.35rem);
}

/* The comp's glow and contour field, so the head of the feed reads as the same
   room as every other screen. */
.pane::before {
  content: '';
  position: absolute;
  z-index: 0;
  inset-inline-start: -69%;
  inset-block-start: -22%;
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

.pane::after {
  content: '';
  position: absolute;
  z-index: 0;
  inset: -12% -30% 26% -23%;
  background-image: url('/brand/contour-lines-onboarding.svg');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: color-dodge;
  pointer-events: none;
}

/*
 * The group. Its height is whatever the greeting turns out to be, so a longer
 * line pushes what follows down rather than running through it. flow-root,
 * because otherwise the greeting's top margin collapses straight out of this
 * box and moves the whole group instead of moving the words down the orb.
 */
.stage {
  position: relative;
  z-index: 1;
  display: flow-root;
  inline-size: var(--frame);
  margin-inline: auto;
  margin-block-start: calc(var(--frame) * 0.02);
}

/*
 * The orb's visible glow falls away well inside its own canvas — measured at
 * 0.708 of it — so the canvas has to run about a third wider than the frame for
 * the orb to read at the comp's 92%. The offsets put the visible disc's top-left
 * where the comp draws it, allowing for that margin on every side.
 */
.orb-well {
  position: absolute;
  z-index: -1;
  inset-inline-start: -14.75%;
  inset-block-start: calc(var(--frame) * -0.19);
  inline-size: 130%;
  aspect-ratio: 1;
  mix-blend-mode: lighten;
  pointer-events: none;
}

/*
 * The orb is meant to be half swallowed by the page. A gradient to the page's
 * own black takes its lower half, and the last line of the greeting with it,
 * exactly as the comp fades "life's biggest decisions".
 *
 * It runs well past both edges so that it is the pane, not the gradient, that
 * decides where it ends. Sized to the group it drew a dark rectangle the width
 * of the group — the black box around the orb.
 */
.stage::after {
  content: '';
  position: absolute;
  z-index: 2;
  inset-inline: -50vw;
  inset-block-start: calc(var(--frame) * 0.26);
  block-size: calc(var(--frame) * 0.52);
  /* Solid by about six tenths of the group, which is above where the pane ends
     at every width — otherwise the orb's lower arc is still faintly there when
     the first chapter begins, and the seam shows. */
  background: linear-gradient(
    to bottom,
    rgb(9 9 11 / 0) 0%,
    rgb(9 9 11 / 0.86) 44%,
    var(--color-ink) 70%
  );
  pointer-events: none;
}

/* 34×32 at x 174, y 72 — on the orb, above the words. */
.mark {
  position: absolute;
  z-index: 3;
  inset-inline-start: 50%;
  inset-block-start: calc(var(--frame) * 0.175);
  inline-size: calc(var(--frame) * 0.085);
  aspect-ratio: 34 / 32;
  translate: -50% 0;
  overflow: hidden;
  pointer-events: none;
}

/* The sprite is a full lockup; the comp shows only its first glyph, by scaling
   it to 628% of the box and clipping to the box. */
.mark img {
  position: absolute;
  inset-block-start: 3.6%;
  inset-inline-start: 0;
  inline-size: 628.57%;
  max-inline-size: none;
  block-size: 100.5%;
}

/* 252 wide at y 118 — 63% of the group, starting a little under half way down
   the orb. */
.speech {
  position: relative;
  z-index: 1;
  inline-size: 63%;
  margin-inline: auto;
  margin-block-start: calc(var(--frame) * 0.295);
  /* 12px in a 400 group, held between legible bounds at the extremes. */
  font-size: clamp(0.72rem, calc(var(--frame) * 0.031), 1.05rem);
}

/*
 * Absolutely placed across the seam, half on the greeting and half on the first
 * chapter, which is where the comp puts them — and above both.
 */
.discs {
  position: absolute;
  z-index: 5;
  inset-inline: 0;
  inset-block-end: 0;
  translate: 0 50%;
  display: flex;
  justify-content: center;
  gap: calc(var(--frame) * 0.04);
}

.disc {
  display: grid;
  place-items: center;
  /* 40px of a 400 group, never below the 44px the touch-target rule asks. */
  inline-size: var(--disc);
  block-size: var(--disc);
  border-radius: var(--radius-pill);
  background-color: var(--color-disc);
  backdrop-filter: blur(6px);
  color: var(--color-text);
  transition:
    background-color var(--duration-quick) var(--ease-out-soft),
    transform var(--duration-quick) var(--ease-out-soft);
}

.disc:hover {
  background-color: var(--color-card);
}

.disc:active {
  transform: scale(0.97);
}

.disc img {
  inline-size: calc(var(--disc) * 0.55);
  block-size: calc(var(--disc) * 0.55);
}

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

@keyframes sheen {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
</style>
