<script setup lang="ts">
import TheOrb from '~/components/orb/TheOrb.vue'
import type { OrbDrive } from '~/utils/orb/drive'

/**
 * A workbench for the orb, not part of the product.
 *
 * The sliders stand in for the microphone so the shader can be judged against
 * every audio state deliberately, including ones that are hard to produce by
 * speaking at a laptop.
 */
definePageMeta({ layout: false })
useSeoMeta({ title: 'Orb workbench', robots: 'noindex' })

const bass = ref(0)
const mid = ref(0)
const treble = ref(0)
const level = ref(0)
const background = ref<'ink' | 'deep' | 'grey' | 'photo'>('grey')

const source = (): OrbDrive => ({
  bass: bass.value,
  mid: mid.value,
  treble: treble.value,
  level: level.value,
})

const controls = [
  { label: 'Bass', model: bass, hint: '20–250 Hz · pushes the silhouette out' },
  { label: 'Mid', model: mid, hint: '250 Hz–2 kHz · shifts the film colour' },
  { label: 'Treble', model: treble, hint: '2–8 kHz · ripples the rim' },
  { label: 'Level', model: level, hint: 'broadband · drives the halo' },
]
</script>

<template>
  <main
    id="main"
    class="min-h-dvh px-gutter py-10"
    :class="{
      'bg-ink': background === 'ink',
      'bg-deep': background === 'deep',
      'bg-[#6e7276]': background === 'grey',
      'bg-[url(/images/skyline.jpg)] bg-cover bg-center': background === 'photo',
    }"
  >
    <hgroup class="mb-8">
      <p class="eyebrow">Workbench</p>
      <h1 class="text-heading font-bold">Orb</h1>
    </hgroup>

    <section class="mx-auto grid max-w-5xl gap-10 sm:grid-cols-[minmax(0,1fr)_20rem]">
      <figure class="mx-auto w-full max-w-md">
        <TheOrb :source="source" />
      </figure>

      <form
        class="flex flex-col gap-6 rounded-panel border border-hairline bg-surface p-5 backdrop-blur-md"
        @submit.prevent
      >
        <fieldset class="flex flex-col gap-5 border-0 p-0">
          <legend class="caps-meta mb-3">Drive</legend>

          <p
            v-for="control in controls"
            :key="control.label"
            class="flex flex-col gap-1.5"
          >
            <label
              class="flex items-baseline justify-between text-small font-medium"
              :for="`orb-${control.label}`"
            >
              {{ control.label }}
              <output class="text-text-faint tabular-nums">{{ control.model.value.toFixed(2) }}</output>
            </label>
            <small class="text-text-faint">{{ control.hint }}</small>
            <input
              :id="`orb-${control.label}`"
              v-model.number="control.model.value"
              class="accent-gold"
              type="range"
              min="0"
              max="1"
              step="0.01"
            >
          </p>
        </fieldset>

        <fieldset class="flex flex-col gap-2 border-0 p-0">
          <legend class="caps-meta mb-3">Backdrop</legend>
          <p class="flex gap-2">
            <label
              v-for="option in (['ink', 'deep', 'grey', 'photo'] as const)"
              :key="option"
              class="cursor-pointer rounded-pill border border-hairline px-3 py-1.5 text-small capitalize has-checked:border-gold has-checked:text-gold"
            >
              <input
                v-model="background"
                class="visually-hidden"
                type="radio"
                name="backdrop"
                :value="option"
              >
              {{ option }}
            </label>
          </p>
        </fieldset>
      </form>
    </section>
  </main>
</template>
