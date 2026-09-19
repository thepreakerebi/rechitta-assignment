<script setup lang="ts">
import TheOrb from '~/components/orb/TheOrb.vue'
import { useMicAudio } from '~/composables/useMicAudio'
import type { OrbDrive } from '~/utils/orb/drive'

/**
 * A workbench for the orb, not part of the product.
 *
 * The sliders stand in for the microphone so the shader can be judged against
 * every audio state deliberately, including ones that are hard to produce by
 * speaking at a laptop. The microphone source next to them is the real thing.
 */
definePageMeta({ layout: false })
useSeoMeta({ title: 'Orb workbench', robots: 'noindex' })

const bass = ref(0)
const mid = ref(0)
const treble = ref(0)
const level = ref(0)

const backdrop = ref<'ink' | 'deep' | 'grey' | 'photo'>('ink')
const driver = ref<'manual' | 'microphone'>('manual')

const mic = useMicAudio()

const manualDrive = (): OrbDrive => ({
  bass: bass.value,
  mid: mid.value,
  treble: treble.value,
  level: level.value,
})

const source = (elapsedMs: number): OrbDrive =>
  driver.value === 'microphone' ? mic.readDrive(elapsedMs) : manualDrive()

watch(driver, async (next) => {
  if (next === 'microphone') await mic.start()
  else mic.stop()
})

const STATUS_COPY: Record<string, string> = {
  idle: 'Not listening yet.',
  prompting: 'Waiting for you to allow the microphone…',
  listening: 'Listening. Nothing is recorded or sent anywhere.',
  blocked: 'Microphone blocked. Allow it in the address bar, then choose it again.',
  unsupported: 'This browser cannot capture a microphone.',
  unavailable: 'No microphone was available. Check it is not in use elsewhere.',
}

const controls = [
  { label: 'Bass', model: bass, hint: '20–250 Hz · opens the core' },
  { label: 'Mid', model: mid, hint: '250 Hz–2 kHz · thickens the noise, shifts the hue' },
  { label: 'Treble', model: treble, hint: '2–8 kHz · spins the colour wheel' },
  { label: 'Level', model: level, hint: 'broadband · deepens the pulse and bloom' },
]
</script>

<template>
  <main
    id="main"
    class="min-h-dvh px-gutter py-10"
    :class="{
      'bg-ink': backdrop === 'ink',
      'bg-deep': backdrop === 'deep',
      'bg-[#6e7276]': backdrop === 'grey',
      'bg-[url(/images/skyline.jpg)] bg-cover bg-center': backdrop === 'photo',
    }"
  >
    <hgroup class="mb-8">
      <p class="eyebrow">Workbench</p>
      <h1 class="text-heading font-bold">Orb</h1>
    </hgroup>

    <section class="mx-auto grid max-w-5xl items-start gap-10 sm:grid-cols-[minmax(0,1fr)_21rem]">
      <figure class="mx-auto w-full max-w-md">
        <TheOrb :source="source" />
      </figure>

      <form
        class="glass flex flex-col gap-6 rounded-panel border border-hairline p-5 [--glass-blur:12px]"
        @submit.prevent
      >
        <fieldset class="flex flex-col gap-3 border-0 p-0">
          <legend class="caps-meta mb-3">Source</legend>
          <p class="flex gap-2">
            <label
              v-for="option in (['manual', 'microphone'] as const)"
              :key="option"
              class="cursor-pointer rounded-pill border border-hairline px-3 py-1.5 text-small capitalize transition-colors duration-(--duration-quick) has-checked:border-gold has-checked:text-gold"
            >
              <input
                v-model="driver"
                class="visually-hidden"
                type="radio"
                name="driver"
                :value="option"
              >
              {{ option }}
            </label>
          </p>
          <output
            v-if="driver === 'microphone'"
            class="text-small text-text-faint"
          >{{ STATUS_COPY[mic.status.value] }}</output>
        </fieldset>

        <fieldset
          class="flex flex-col gap-5 border-0 p-0 transition-opacity duration-(--duration-base)"
          :class="driver === 'microphone' ? 'pointer-events-none opacity-40' : ''"
          :disabled="driver === 'microphone'"
        >
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
              <output class="tabular-nums text-text-faint">{{ control.model.value.toFixed(2) }}</output>
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
          <p class="flex flex-wrap gap-2">
            <label
              v-for="option in (['ink', 'deep', 'grey', 'photo'] as const)"
              :key="option"
              class="cursor-pointer rounded-pill border border-hairline px-3 py-1.5 text-small capitalize transition-colors duration-(--duration-quick) has-checked:border-gold has-checked:text-gold"
            >
              <input
                v-model="backdrop"
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
