<script setup lang="ts">
import TheOrb from '~/components/orb/TheOrb.vue'

/**
 * The head of the feed: Rechitta introducing herself over the orb.
 *
 * The orb here does not listen. This screen is a briefing, not a conversation —
 * nobody has asked to speak — so it runs its idle drive exactly as on the
 * onboarding screen, and the microphone is never opened. The control below is a
 * way *into* the conversation, not a live capture.
 *
 * Everything inside the stage is placed as a share of the comp's own 400×409
 * group, so the arrangement holds its proportions at any width instead of
 * drifting apart. The two washes are the reason the text is legible at all:
 * they multiply the orb down to nothing behind the words, which is what lets
 * the greeting sit on the orb rather than beside it.
 */

defineProps<{
  greeting: string | null
  loading?: boolean
}>()
</script>

<template>
  <header class="greeting relative isolate overflow-hidden bg-ink pb-[clamp(0.5rem,2vh,1.25rem)] pt-[clamp(1.5rem,6vh,3rem)]">
    <p class="relative z-20 text-center text-[clamp(1.05rem,1rem+0.4cqi,1.35rem)] leading-normal text-white/75">
      Welcome <em class="not-italic">👋</em>
    </p>

    <figure class="stage">
      <figure class="group">
        <figure class="orb-well">
          <TheOrb :opacity="0.9" />
        </figure>

      <!-- The mark, riding on the orb: the same sprite the splash uses,
           cropped to its leftmost glyph, exactly as the comp crops it. -->
      <figure class="mark">
        <img
          src="/brand/logo-white.webp"
          alt=""
          width="1024"
          height="152"
        >
      </figure>

      <!-- Decoration, so CSS rather than markup: one wash falling through the
           orb's lower half, one rising from beneath it. -->
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
          class="text-pretty text-center text-[clamp(0.75rem,0.69rem+0.36cqi,0.95rem)] leading-[1.85] text-white"
        >{{ greeting }}</p>
      </figcaption>

      <!-- Into the conversation, and into the transcript. Both land on the
           screen that actually listens rather than opening a microphone here. -->
      <nav
        class="discs"
        aria-label="Talk to Rechitta"
      >
        <NuxtLink
          class="disc"
          to="/ask"
        >
          <img
            src="/icons/transcript.svg"
            alt=""
            width="24"
            height="24"
          >
          <em class="visually-hidden">Read what Rechitta said</em>
        </NuxtLink>

        <NuxtLink
          class="disc"
          to="/ask"
        >
          <img
            src="/icons/microphone.svg"
            alt=""
            width="24"
            height="24"
          >
          <em class="visually-hidden">Speak to Rechitta</em>
        </NuxtLink>
        </nav>
      </figure>
    </figure>
  </header>
</template>

<style scoped>
.greeting {
  container-type: inline-size;
}

/* The comp's glow and contour field, so the top of the feed reads as the same
   room as every other screen. */
.greeting::before {
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

.greeting::after {
  content: '';
  position: absolute;
  z-index: 0;
  inset: -12% -30% 30% -23%;
  background-image: url('/brand/contour-lines-onboarding.svg');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: color-dodge;
  pointer-events: none;
}

/*
 * The comp's group, at its own 400×409. Capped near the comp's own width so a
 * desktop window gets a centred greeting rather than a three-metre orb.
 */
/*
 * Two boxes, because the comp's group reserves height its content never uses:
 * the last thing in it sits at 66% and the rest is the tail of a wash. The
 * outer box is what the page sees and clips to; the inner one keeps the comp's
 * own 400×409, so every child can stay at the percentage it was drawn at
 * instead of being re-derived against a shorter box.
 */
.stage {
  position: relative;
  z-index: 1;
  inline-size: min(100%, 25rem);
  margin-inline: auto;
  margin-block-start: clamp(0.25rem, 1.5vh, 0.75rem);
  aspect-ratio: 400 / 295;
  overflow: clip;
}

.group {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  aspect-ratio: 400 / 409;
}

/* 367×246 at x 17, y 0 — wider than it is tall, which a square canvas cannot
   be, so the orb overflows the box vertically and is centred on it. Its alpha
   falls away long before its box does, so nothing is seen to be clipped. */
.orb-well {
  position: absolute;
  inset-inline-start: 4.25%;
  inline-size: 91.75%;
  inset-block-start: 30.07%;
  aspect-ratio: 1;
  translate: 0 -50%;
  mix-blend-mode: lighten;
  pointer-events: none;
}

/* 34×32 at x 174, y 72. */
.mark {
  position: absolute;
  inset-inline-start: 43.5%;
  inset-block-start: 17.6%;
  inline-size: 8.5%;
  aspect-ratio: 34 / 32;
  overflow: hidden;
  z-index: 3;
  pointer-events: none;
}

/* The sprite is a full lockup; the comp shows only its first glyph, by scaling
   it to 628% of the box and clipping. */
.mark img {
  position: absolute;
  inset-block-start: 3.6%;
  inset-inline-start: 0;
  inline-size: 628.57%;
  max-inline-size: none;
  block-size: 100.5%;
}

/*
 * The first wash: 400×135 at y 111, transparent to #0a1013 by seven tenths,
 * multiplied. On the near-black page it does nothing; over the orb it takes the
 * orb away, which is the whole trick.
 */
.group::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 27.14%;
  block-size: 33%;
  background: linear-gradient(to bottom, rgb(217 217 217 / 0) 0%, var(--color-greeting-fade) 70.5%);
  mix-blend-mode: multiply;
  z-index: 1;
  pointer-events: none;
}

/* The second: 400×163 at y 246, the same gradient turned over. */
.group::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 60.15%;
  block-size: 39.85%;
  background: linear-gradient(to top, rgb(217 217 217 / 0) 26.6%, var(--color-greeting-fade-end) 110%);
  mix-blend-mode: multiply;
  z-index: 1;
  pointer-events: none;
}

/* 252 wide at x 70, y 118. */
.speech {
  position: absolute;
  inset-inline-start: 17.5%;
  inline-size: 63%;
  inset-block-start: 28.85%;
  z-index: 2;
}

/* 96×40 at x 152, y 226. */
.discs {
  position: absolute;
  inset-inline: 0;
  inset-block-start: 55.26%;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.disc {
  display: grid;
  place-items: center;
  /* 40px in the comp, lifted to the 44px the touch-target rule wants. */
  inline-size: 2.75rem;
  block-size: 2.75rem;
  border-radius: var(--radius-pill);
  background-color: var(--color-disc);
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
  inline-size: 1.5rem;
  block-size: 1.5rem;
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
