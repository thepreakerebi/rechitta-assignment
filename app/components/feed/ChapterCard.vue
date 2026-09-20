<script setup lang="ts">
import type { Chapter } from '#shared/types/domain'

/**
 * One chapter of the feed: a full-bleed photograph with the story written
 * across its foot.
 *
 * The same card serves both layouts — stacked down the page on a phone, and
 * squeezed into the accordion on a desktop — so it owns no layout beyond
 * filling the box it is handed. What differs between the two is how much room
 * that box has, which is why the card is its own container: the type follows
 * the card, not the window, or a chapter squeezed to a strip would keep
 * desktop-sized headings.
 */

defineProps<{
  chapter: Chapter
  /** This chapter's own slide of her answer. */
  answerTo: string
  /**
   * Where this sits in the sequence. The eyebrow does not say "third of
   * seven", and someone moving through by heading should still know.
   */
  index: number
  total: number
  /** Only the first is above the fold; the rest can wait. */
  priority?: boolean
}>()
</script>

<template>
  <article class="chapter relative isolate size-full overflow-hidden bg-chapter-foot">
    <img
      class="absolute inset-0 size-full object-cover"
      :src="chapter.hero.src"
      :alt="chapter.hero.alt"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
    >

    <footer class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-[clamp(1rem,4.25cqi,2rem)] pb-[clamp(1.25rem,5cqi,2.25rem)] pt-[clamp(2rem,8cqi,3.5rem)]">
      <hgroup class="flex min-w-0 flex-col gap-1">
        <!-- Valid hgroup content is paragraphs and one heading, which is
             exactly what this is: a mark, a kicker, and the title. -->
        <!-- The feed is the skim and the deck is the same briefing in full, so
             the arrow opens the deck at this chapter rather than at its front. -->
        <p class="mb-1">
          <NuxtLink
            class="open grid size-[clamp(2.75rem,7cqi,3rem)] place-items-center rounded-pill border border-gold/30 transition-[background-color,transform] duration-(--duration-quick) hover:bg-gold-soft active:scale-95"
            :to="answerTo"
          >
            <img
              class="size-[clamp(0.7rem,2.9cqi,1rem)] -rotate-45"
              src="/icons/chapter-arrow.svg"
              alt=""
              width="12"
              height="14"
            >
            <em class="visually-hidden">Open {{ chapter.title }} in Rechitta’s answer</em>
          </NuxtLink>
        </p>

        <p class="text-eyebrow font-normal uppercase leading-[1.5] tracking-[0.25em] text-gold">
          {{ chapter.eyebrow }}
          <em class="visually-hidden">— chapter {{ index }} of {{ total }}</em>
        </p>

        <h2 class="text-balance text-[clamp(1.1rem,4.6cqi,1.85rem)] font-normal leading-[1.4] text-bone">
          {{ chapter.title }}
        </h2>
      </hgroup>

      <dl class="flex shrink-0 flex-col items-end gap-1 text-right">
        <dt class="text-eyebrow font-normal uppercase leading-[1.5] tracking-[0.25em] text-bone-muted">
          {{ chapter.metricLabel }}
        </dt>
        <dd class="text-[clamp(0.75rem,2.7cqi,1rem)] font-medium leading-[1.6] text-bone">
          {{ chapter.metricValue }}
        </dd>
      </dl>
    </footer>
  </article>
</template>

<style scoped>
.chapter {
  /* The card's own box is the measure for its type, not the viewport. A strip
     in the carousel cannot learn how narrow it is from the window. */
  container-type: inline-size;
  /* The comp draws a hairline under every card — the only thing separating one
     photograph from the next where they stack edge to edge. */
  border-block-end: 1px solid var(--color-hairline);
  box-shadow: 0 20px 40px rgb(0 0 0 / 0.4);
}

/*
 * The scrim, as a layer rather than an element: text over photography never
 * sits on the raw image, and this is the comp's own gradient — a cyan cast at
 * the top falling through half black to solid by seven eighths down. It is
 * decoration, so it is CSS, not markup.
 */
.chapter::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    var(--color-chapter-tint) 0%,
    rgb(0 0 0 / 0.5) 60%,
    var(--color-chapter-foot) 87%
  );
  pointer-events: none;
}

.chapter > footer {
  /* Above the scrim the ::after paints. */
  z-index: 1;
}

/* The badge is 31px in the comp, lifted to the 44px the touch-target rule asks
   for now that it is something you press. */
.open {
  color: var(--color-gold);
}
</style>
