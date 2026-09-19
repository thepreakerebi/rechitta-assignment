<script setup lang="ts">
/**
 * The three-step pager from the comp, made navigable.
 *
 * In the comp these are decorative dots, which leaves no way back — the only
 * route to the previous step is the browser's own back button, and on a phone
 * that is a gesture many people never use. Making the existing indicator the
 * control adds no chrome and answers the question the dots already raise.
 *
 * Each dot is an 8px mark inside a 24px target, which is the smallest WCAG 2.2
 * allows for a pointer.
 */
const props = defineProps<{ current: 1 | 2 | 3 }>()

const STEPS = [
  { to: '/', label: 'Meet Rechitta' },
  { to: '/onboarding', label: 'Speak to discover' },
  { to: '/project/berkeley-square-north', label: 'The briefing' },
] as const

const steps = computed(() =>
  STEPS.map((step, index) => ({
    ...step,
    number: index + 1,
    isCurrent: index + 1 === props.current,
  })),
)
</script>

<template>
  <nav aria-label="Onboarding progress">
    <ol class="flex items-center">
      <li
        v-for="step in steps"
        :key="step.to"
      >
        <NuxtLink
          class="group grid size-6 place-items-center rounded"
          :to="step.to"
          :aria-current="step.isCurrent ? 'step' : undefined"
        >
          <i
            class="block h-2 rounded transition-[width,background-color] duration-(--duration-base) ease-(--ease-out-soft)"
            :class="step.isCurrent
              ? 'w-4 bg-text'
              : 'w-2 bg-hairline-strong group-hover:bg-text-faint'"
          />
          <em class="visually-hidden">
            Step {{ step.number }} of {{ steps.length }}: {{ step.label }}
          </em>
        </NuxtLink>
      </li>
    </ol>
  </nav>
</template>
