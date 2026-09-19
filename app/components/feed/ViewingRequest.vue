<script setup lang="ts">
/**
 * The close of the feed: the one thing the whole briefing is asking for.
 *
 * Everything above it is the project explaining itself; this is the only place
 * that wants something back, so it is the only card on the screen with a
 * border and a filled button.
 */

defineProps<{
  projectName: string
  developer: string
}>()
</script>

<template>
  <section
    class="request mx-auto flex w-full max-w-column flex-col items-center gap-3 rounded-panel border border-gold/10 bg-white/3 p-[clamp(1.5rem,5cqi,2.5rem)] text-center backdrop-blur-[10px]"
    aria-labelledby="viewing-heading"
  >
    <p class="grid size-16 place-items-center rounded-pill bg-gold/10">
      <img
        class="h-6 w-[1.3125rem]"
        src="/icons/calendar-check.svg"
        alt=""
        width="21"
        height="24"
      >
    </p>

    <h2
      id="viewing-heading"
      class="pt-1 text-balance text-[clamp(1.15rem,1rem+0.6cqi,1.6rem)] font-normal leading-[1.6] text-white"
    >
      Schedule Private Viewing
    </h2>

    <p class="max-w-[20rem] text-pretty pb-3 text-[clamp(0.8rem,0.75rem+0.3cqi,1rem)] leading-[1.45] text-note-text">
      Experience {{ projectName }} with our exclusive tour
    </p>

    <p>
      <NuxtLink
        class="flex min-h-11 items-center justify-center gap-2 rounded-pill bg-white px-5 py-3 font-ui text-ui font-medium text-[#292929] transition-[transform,background-color] duration-(--duration-quick) hover:bg-bone active:scale-[0.98]"
        to="/book"
      >
        Book Appointment
        <img
          class="size-5"
          src="/icons/arrow-right.svg"
          alt=""
          width="20"
          height="20"
        >
      </NuxtLink>
    </p>

    <p class="text-small leading-[1.35] text-text-faint">
      <cite class="not-italic">{{ developer }}</cite>
    </p>
  </section>
</template>

<style scoped>
.request {
  container-type: inline-size;
}
</style>
