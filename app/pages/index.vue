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
        class="mark-stage relative min-h-0 flex-1 animate-emerge [animation-delay:100ms]"
      >
        <img
          class="mark"
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
 *
 * The wash is capped, but generously: at the comp's 142% it would be nearly
 * three metres across on a wide display, while the old 44rem ceiling left it a
 * small pool in the middle of a flat black screen at 1920. 62rem keeps it
 * present without letting it take over.
 */
.splash::before {
  content: '';
  position: absolute;
  z-index: 0;
  left: 50%;
  top: calc(50% + 1.3%);
  inline-size: min(142%, 62rem);
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
  /* The blur has to grow with the wash, or it reads as a hard-edged disc
     once the element is a thousand pixels across. */
  filter: blur(clamp(20px, 3cqi, 40px));
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
 * the behaviour of one. Rotating a photograph is not enough on its own: the
 * highlights turn rigidly with the object, and the eye reads that as a picture
 * turning rather than glass turning. Three things break that rigidity.
 *
 *  1. A specular sweep that travels ACROSS the mark while it turns. A highlight
 *     that moves independently of the surface is the clearest signal there is
 *     that something is glass.
 *  2. Chromatic fringing at the extremes of the turn, and only there — a lens
 *     disperses most when you are looking through it most obliquely. The fringe
 *     swaps sides with the direction of the lean.
 *  3. A bloom that swells with the turn instead of throbbing on its own clock,
 *     so the light and the rotation read as one gesture.
 *
 * All four layers share one geometry, derived from height rather than width, so
 * the sweep's mask registers exactly to the artwork at every size. Sizing by
 * width and capping the height would letterbox the image inside its own box and
 * the mask would drift off the shape.
 *
 * Everything is on the same twelve-second cycle. Under prefers-reduced-motion
 * the global override collapses the animations to a single instant iteration
 * with no fill, and every layer's resting state is its invisible one, so the
 * mark simply sits square, unlit and still.
 */
.mark-stage {
  --mark-block: min(100%, calc(clamp(7rem, 40cqi, 11rem) * 529 / 512));
}

.mark,
.mark-stage::before,
.mark-stage::after {
  position: absolute;
  inset: 0;
  margin: auto;
  block-size: var(--mark-block);
  inline-size: auto;
  aspect-ratio: 512 / 529;
  pointer-events: none;
}

/* -- the mark itself ------------------------------------------------------ */

.mark {
  mix-blend-mode: plus-lighter;
  animation:
    mark-tilt 12s var(--ease-in-out-soft) infinite,
    mark-dispersion 12s var(--ease-in-out-soft) infinite;
  will-change: transform, filter;
}

@keyframes mark-tilt {
  /* Square, and holding. */
  0%,
  8% {
    transform: perspective(420px) rotateY(0deg);
  }

  /* Turned away to the left. */
  28% {
    transform: perspective(420px) rotateY(-28deg);
  }

  /* Through square and on to the right. */
  52% {
    transform: perspective(420px) rotateY(28deg);
  }

  /* Back to square, then still until the cycle comes round. */
  70%,
  100% {
    transform: perspective(420px) rotateY(0deg);
  }
}

/*
 * Every keyframe declares the same filter functions in the same order. A filter
 * list that changes length between keyframes cannot be interpolated, and the
 * browser falls back to switching discretely — which would make the fringe
 * appear and vanish rather than swell.
 */
@keyframes mark-dispersion {
  0%,
  10% {
    filter: brightness(1) saturate(1) drop-shadow(0 0 0 rgb(0 190 255 / 0))
      drop-shadow(0 0 0 rgb(255 60 170 / 0));
  }
  28% {
    filter: brightness(1.1) saturate(1.16) drop-shadow(-2px 0 0 rgb(0 190 255 / 0.5))
      drop-shadow(2px 0 0 rgb(255 60 170 / 0.32));
  }
  52% {
    filter: brightness(1.16) saturate(1.24) drop-shadow(2px 0 0 rgb(0 190 255 / 0.5))
      drop-shadow(-2px 0 0 rgb(255 60 170 / 0.32));
  }
  72%,
  100% {
    filter: brightness(1) saturate(1) drop-shadow(0 0 0 rgb(0 190 255 / 0))
      drop-shadow(0 0 0 rgb(255 60 170 / 0));
  }
}

/* -- bloom, behind the mark ----------------------------------------------- */

.mark-stage::before {
  content: '';
  opacity: 0;
  scale: 1.75;
  background: radial-gradient(
    closest-side,
    rgb(0 169 207 / 0.5),
    rgb(0 169 207 / 0.18) 45%,
    transparent 72%
  );
  filter: blur(14px);
  animation: mark-bloom 12s var(--ease-in-out-soft) infinite;
}

@keyframes mark-bloom {
  0%,
  10% {
    opacity: 0;
  }
  28% {
    opacity: 0.7;
  }
  52% {
    opacity: 0.95;
  }
  72%,
  100% {
    opacity: 0;
  }
}

/* -- specular sweep, in front of the mark --------------------------------- */

/*
 * Masked to the mark's own alpha, and carrying the same tilt, so it stays
 * registered to the shape while its gradient travels across it. That is the
 * difference between a highlight that belongs to the object and a band of light
 * sliding over a rectangle.
 */
.mark-stage::after {
  content: '';
  opacity: 0;
  background-image: linear-gradient(
    104deg,
    transparent 43%,
    rgb(255 255 255 / 0.22) 47%,
    rgb(255 255 255 / 0.95) 50%,
    rgb(255 255 255 / 0.22) 53%,
    transparent 57%
  );
  /* Wide track, narrow band: the highlight has to be small against the mark or
     it reads as the whole thing brightening rather than a light crossing it. */
  background-size: 340% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: plus-lighter;

  -webkit-mask-image: url('/brand/mark-glass.webp');
  mask-image: url('/brand/mark-glass.webp');
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;

  animation:
    mark-tilt 12s var(--ease-in-out-soft) infinite,
    mark-sweep 12s linear infinite;
  will-change: transform, background-position, opacity;
}

/*
 * Timed to cross while the mark is actually turning — the sweep arrives after
 * the rest, travels through both extremes, and is gone before the mark settles.
 * Linear, because a highlight tracking a moving surface should not ease.
 */
@keyframes mark-sweep {
  0%,
  13% {
    background-position: 185% 0;
    opacity: 0;
  }
  19% {
    opacity: 0.9;
  }
  50% {
    background-position: -85% 0;
    opacity: 0.9;
  }
  58% {
    background-position: -85% 0;
    opacity: 0;
  }
  100% {
    background-position: -85% 0;
    opacity: 0;
  }
}
</style>
