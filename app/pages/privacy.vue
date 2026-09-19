<script setup lang="ts">
/**
 * The onboarding screen promises that voice data is never stored. That promise
 * needs somewhere to point, and in this build it happens to be literally true:
 * the microphone stream is analysed into four numbers and never recorded,
 * buffered or transmitted.
 */
useSeoMeta({
  title: 'Privacy',
  description: 'How Rechitta handles your voice and your data.',
})

const POINTS = [
  {
    heading: 'Your voice is never recorded',
    body: 'The microphone stream is read as frequencies and reduced to four numbers — low, middle, high and overall loudness — which drive the orb. Nothing is written to disk, held in memory beyond the current frame, or sent anywhere.',
  },
  {
    heading: 'The microphone is opened only when you ask',
    body: 'Access is requested at the moment you press Allow, never on load, and the device is released the instant the screen that needs it goes away.',
  },
  {
    heading: 'Refusing costs you nothing but voice',
    body: 'Every briefing, unit, price and payment plan is readable without the microphone. Voice is an addition to the product, not a gate in front of it.',
  },
  {
    heading: 'This is a prototype',
    body: 'Data shown here is fixture data served by a mock server. No real enquiry, booking or personal detail is stored.',
  },
] as const
</script>

<template>
  <main
    id="main"
    class="min-h-dvh bg-ink px-edge py-[clamp(3rem,10vh,6rem)]"
  >
    <article class="mx-auto flex w-full max-w-[42rem] flex-col gap-band">
      <header>
        <p class="eyebrow">Rechitta</p>
        <h1 class="mt-2 text-heading font-bold">Privacy</h1>
        <p class="mt-3 max-w-[54ch] text-balance font-light leading-[1.7] text-body text-text-muted">
          What happens to your voice, in plain language.
        </p>
      </header>

      <dl class="flex flex-col gap-6">
        <template
          v-for="point in POINTS"
          :key="point.heading"
        >
          <dt class="font-brand text-lead text-text">{{ point.heading }}</dt>
          <dd class="max-w-[62ch] leading-[1.7] text-body text-text-muted">{{ point.body }}</dd>
        </template>
      </dl>

      <footer>
        <NuxtLink
          class="inline-flex items-center gap-2 rounded-pill border border-hairline px-4 py-2.5 font-ui text-ui font-medium text-text transition-colors duration-(--duration-quick) hover:border-hairline-strong hover:bg-surface"
          to="/onboarding"
        >
          <svg
            class="size-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15.833 10H4.167" />
            <path d="M10 15.834 4.167 10 10 4.167" />
          </svg>
          Back
        </NuxtLink>
      </footer>
    </article>
  </main>
</template>
