<script setup lang="ts">
import type { Session } from '#shared/types/domain'

/**
 * 01 · Splash.
 *
 * The comp is a 400×880 artboard of absolutely positioned layers. This is the
 * same composition as flow: a header, a mark that takes whatever height is
 * left, the broker card, and the onboarding controls. Nothing is pinned to a
 * pixel, so the screen holds from a 320px phone to a desktop without a
 * breakpoint deciding when to rearrange.
 *
 * The device status bar in the comp is not reproduced. It is the phone frame
 * around the design, not part of it, and a fake 9:41 on a web page is a lie.
 */

useSeoMeta({
  title: 'Meet Rechitta',
  description:
    'Rechitta guides your investment journey — honest answers in plain language, no sales pitch.',
})

const { data: session, status, error, refresh } = useApiFetch<Session>('/api/session', {
  key: 'session',
})

const broker = computed(() => session.value?.broker ?? null)
const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')
</script>

<template>
  <main
    id="main"
    class="splash relative isolate h-dvh min-h-[34rem] overflow-hidden bg-void px-edge pb-[clamp(1.5rem,4vh,2.5rem)] pt-[clamp(2rem,7vh,4.5rem)]"
  >
    <!-- One content column, so the screen has a measure on a phone and does
         not simply stretch to whatever width it is given. -->
    <section class="relative z-10 mx-auto flex h-full w-full max-w-column flex-col gap-band">
      <header class="animate-rise text-center">
      <hgroup>
        <p class="font-thin leading-[1.45] text-kicker text-text">Meet</p>
        <h1 class="text-display leading-[1.43]">
          <strong class="block font-bold">Rechitta</strong>
          <b class="block font-normal">Your AI Agent</b>
        </h1>
      </hgroup>

        <p class="mx-auto mt-[clamp(0.75rem,2vh,1.25rem)] max-w-[42ch] text-balance font-light leading-[1.72] text-body text-text-muted">
        She guides your investment journey, answers your questions into a conversation,
        honest answers, plain language, no sales pitch.
        </p>
      </header>

      <!-- The mark is a proportion of the layout, not a filler: 166px inside a
           400px frame in the comp, so ~42% of the column, clamped at both ends.
           It is absolutely positioned because a percentage max-height on a
           static flex item resolves to auto, at which point the intrinsic ratio
           takes over and the image overflows its own box. Against an absolutely
           positioned element the containing block is definite, so max-h-full
           holds and the mark yields before the controls ever do. -->
      <figure
        class="relative min-h-0 flex-1 animate-emerge [animation-delay:100ms]"
      >
        <img
          class="mark absolute inset-0 m-auto max-h-full w-[clamp(7rem,40cqi,11rem)] object-contain"
        src="/brand/mark-glass.webp"
          alt=""
          width="512"
          height="529"
          fetchpriority="high"
        >
      </figure>

      <article
        class="relative flex w-full animate-rise items-center gap-4 rounded-card bg-card px-4 py-4 [animation-delay:250ms]"
        :aria-busy="isLoading"
      >
      <!-- Loading: the card's own shape, so nothing reflows when it arrives. -->
      <template v-if="isLoading">
        <p
          class="size-14 shrink-0 animate-pulse rounded-pill bg-surface-raised"
          aria-hidden="true"
        />
        <p
          class="flex w-full flex-col gap-2"
          aria-hidden="true"
        >
          <i class="block h-[1.15rem] w-32 animate-pulse rounded bg-surface-raised" />
          <i class="block h-[0.9rem] w-44 animate-pulse rounded bg-surface" />
          <i class="block h-[0.9rem] w-28 animate-pulse rounded bg-surface" />
        </p>
        <p class="visually-hidden">Loading your advisor’s details.</p>
      </template>

      <!-- Error: the page is still usable, so this stays inside the card. -->
      <template v-else-if="error || !broker">
        <p
          class="flex w-full flex-col gap-1"
          role="status"
        >
          <strong class="font-brand text-lead font-normal">Your advisor is not loading</strong>
          <small class="text-small text-text-meta">Their details will appear once the connection returns.</small>
        </p>
        <button
          class="shrink-0 rounded-pill border border-hairline-strong px-3 py-1.5 font-ui text-ui text-text-bright transition-colors duration-(--duration-quick) hover:border-text hover:bg-surface"
          type="button"
          @click="refresh()"
        >
          Retry
        </button>
      </template>

      <template v-else>
        <img
          class="size-14 shrink-0 rounded-pill object-cover"
          :src="broker.avatar.src"
          alt=""
          width="56"
          height="56"
          loading="lazy"
        >
        <p class="flex min-w-0 flex-col gap-1">
          <strong class="font-brand text-lead font-normal leading-tight text-text">{{ broker.name }}</strong>
          <small class="text-small leading-[1.64] text-text-meta">
            {{ broker.company }} · {{ broker.role }}
          </small>
          <!-- Empty state: a broker with nothing new to say has no note and no dot. -->
          <em
            v-if="broker.note"
            class="mt-1 text-small leading-[1.64] text-text"
          >{{ broker.note }}</em>
        </p>
        <i
          v-if="broker.note"
          class="absolute -right-1 -top-1 size-4 rounded-pill bg-alert"
          aria-hidden="true"
        />
      </template>
      </article>

    <footer
      class="relative z-10 mt-[clamp(1.5rem,8vh,5rem)] flex animate-fade items-center justify-between [animation-delay:400ms]"
    >
      <NuxtLink
        class="rounded px-3 py-3 font-ui text-ui font-medium text-text-faint transition-colors duration-(--duration-quick) hover:text-text"
        to="/project/berkeley-square-north"
      >
        Skip
      </NuxtLink>

      <p class="visually-hidden">Step 1 of 3</p>
      <ol
        class="flex items-center gap-1"
        aria-hidden="true"
      >
        <li class="h-2 w-4 rounded bg-text" />
        <li class="size-2 rounded bg-hairline-strong" />
        <li class="size-2 rounded bg-hairline-strong" />
      </ol>

      <NuxtLink
        class="flex items-center justify-center gap-2 rounded-pill bg-control px-5 py-3 font-ui text-ui font-medium text-text-bright transition-[transform,background-color] duration-(--duration-quick) hover:bg-deep active:scale-[0.98]"
        to="/onboarding"
      >
        Next
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
      </NuxtLink>
      </footer>
    </section>
  </main>
</template>

<style scoped>
/*
 * The two background layers are pseudo-elements rather than markup: they carry
 * no meaning, so they should not exist in the accessibility tree or the DOM.
 * Both are sized in percentages of the page so they scale with it.
 */
.splash::before {
  content: '';
  position: absolute;
  z-index: 0;
  left: 50%;
  top: calc(50% + 1.3%);
  inline-size: min(142%, 44rem);
  aspect-ratio: 567 / 761;
  translate: -50% -50%;
  background: radial-gradient(
    closest-side,
    rgb(0 169 207 / 0.3),
    rgb(0 127 155 / 0.225) 25%,
    rgb(0 85 104 / 0.15) 50%,
    rgb(0 42 52 / 0.075) 75%,
    transparent 100%
  );
  filter: blur(20px);
  pointer-events: none;
}

/* The contour field, which in the comp runs off every edge of the frame. */
.splash::after {
  content: '';
  position: absolute;
  z-index: 0;
  inset: -3.18% -68.72% 20.65% -22.82%;
  background-image: url('/brand/contour-lines.svg');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: color-dodge;
  pointer-events: none;
}

/*
 * The mark is a lit glass object in the comp, not a flat image, so it is given
 * the motion of one — but on a rhythm rather than a constant sway: it turns
 * left, turns back through to the right, settles to square, and then rests for
 * about a third of the cycle before going again. Perpetual motion in the
 * corner of the eye is tiring; a pause is what makes the movement read as
 * deliberate.
 *
 * The lustre runs on the same twelve seconds so the glass brightens through the
 * turn and calms while it is still. Transform and filter only, so the whole
 * thing stays on the compositor and nothing triggers layout.
 *
 * Under prefers-reduced-motion the global override collapses both to a single
 * instant iteration with no fill, so the mark simply sits square and still.
 */
.mark {
  mix-blend-mode: plus-lighter;
  animation:
    mark-tilt 12s var(--ease-in-out-soft) infinite,
    mark-lustre 12s var(--ease-in-out-soft) infinite;
  will-change: transform, filter;
}

@keyframes mark-tilt {
  /* Square, and holding. */
  0%,
  8% {
    transform: perspective(900px) rotate3d(0, 1, 0, 0deg) rotate3d(1, 0, 0, 0deg)
      translate3d(0, 0, 0);
  }

  /* Away to the left. */
  28% {
    transform: perspective(900px) rotate3d(0, 1, 0, -8deg) rotate3d(1, 0, 0, 2deg)
      translate3d(0, -5px, 0);
  }

  /* Through to the right. */
  52% {
    transform: perspective(900px) rotate3d(0, 1, 0, 8deg) rotate3d(1, 0, 0, -1.5deg)
      translate3d(0, 5px, 0);
  }

  /* Back to square, then still until the cycle comes round. */
  70%,
  100% {
    transform: perspective(900px) rotate3d(0, 1, 0, 0deg) rotate3d(1, 0, 0, 0deg)
      translate3d(0, 0, 0);
  }
}

@keyframes mark-lustre {
  0%,
  10% {
    filter: brightness(1) saturate(1);
  }
  28% {
    filter: brightness(1.16) saturate(1.2);
  }
  52% {
    filter: brightness(1.22) saturate(1.28);
  }
  72%,
  100% {
    filter: brightness(1) saturate(1);
  }
}
</style>
