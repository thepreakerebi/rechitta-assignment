<script setup lang="ts">
import ChapterCard from '~/components/feed/ChapterCard.vue'
import type { Chapter } from '#shared/types/domain'

/**
 * The chapters, in the two shapes they take.
 *
 * On a phone they stack edge to edge and the page is one scroll — the comp's
 * own 400×4172. Given room, they squeeze into an accordion instead: one open
 * panel and the rest as strips, each strip still showing its photograph, which
 * is the shape the whole briefing takes in at a glance.
 *
 * Both shapes are the same list and the same cards, switched in CSS rather
 * than chosen in JavaScript. Rendering one of two variants would mean the
 * server guessing which, and either a hydration mismatch or a flash of the
 * wrong layout the moment the client disagreed — and it would fetch fourteen
 * photographs to show seven.
 *
 * Adapted from the "Squeeze Carousel" idea by yura on 21st.dev. Its source is
 * behind a login and was never read; this is a Vue implementation from the
 * described behaviour, which it had to be either way — the original is React,
 * and nothing in this project renders a div.
 */

const props = defineProps<{ chapters: readonly Chapter[], slug: string }>()

/** Opening a chapter asks its question, and lands on the answer. */
const answerTo = (chapter: Chapter) =>
  `/project/${props.slug}/answer?q=${encodeURIComponent(chapter.question)}`

const active = ref(0)

/*
 * Keep the open panel in range if the list ever changes underneath, so the
 * accordion cannot end up with nothing open.
 */
watch(() => props.chapters.length, (length) => {
  if (active.value > length - 1) active.value = 0
})

const buttons = ref<HTMLButtonElement[]>([])

const open = (index: number) => {
  active.value = index
  buttons.value[index]?.focus()
}

/**
 * The arrows walk the accordion, as they do in any tablist. Home and End go to
 * the ends. Anything else — including every modifier combination — is left to
 * the browser, because Alt+Left is Back and taking it would be worse than
 * offering nothing.
 */
const onKeydown = (event: KeyboardEvent, index: number) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  const last = props.chapters.length - 1
  const target = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    ? Math.min(index + 1, last)
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
      ? Math.max(index - 1, 0)
      : event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : null

  if (target === null) return
  event.preventDefault()
  open(target)
}
</script>

<template>
  <ul class="deck">
    <li
      v-for="(chapter, index) in chapters"
      :key="chapter.id"
      class="panel"
      :class="{ 'is-open': index === active }"
    >
      <ChapterCard
        :answer-to="answerTo(chapter)"
        :chapter="chapter"
        :index="index + 1"
        :total="chapters.length"
        :priority="index === 0"
      />

      <!-- The control is a sibling laid over the card, not a wrapper around
           it: a button may not contain a heading, and the card has one. -->
      <button
        ref="buttons"
        class="expand"
        type="button"
        :aria-expanded="index === active"
        @click="open(index)"
        @keydown="onKeydown($event, index)"
      >
        <em class="visually-hidden">
          {{ index === active ? 'Showing' : 'Show' }} chapter {{ index + 1 }} of
          {{ chapters.length }}: {{ chapter.title }}
        </em>
      </button>

      <!-- The strip's own label, turned on its side. Hidden from assistive
           technology because it repeats the card's heading verbatim. -->
      <p
        class="spine"
        aria-hidden="true"
      >{{ chapter.title }}</p>
    </li>
  </ul>
</template>

<style scoped>
.deck {
  display: flex;
  flex-direction: column;
}

/*
 * 401×484 in the comp. Held as a ratio rather than a height so the card grows
 * with the screen, and capped in vh so a short window still shows the foot of
 * one card and the head of the next — which is what makes it read as a feed.
 */
.panel {
  position: relative;
  inline-size: 100%;
  aspect-ratio: 400 / 484;
  max-block-size: 86vh;
}

/* Below the accordion's width these do not exist, so they are not focusable
   and not read out. */
.expand,
.spine {
  display: none;
}

/*
 * The accordion. A width, not a device: the stack is right whenever there is
 * not room to lay seven photographs side by side and still see one of them.
 */
@media (width >= 64rem) {
  .deck {
    flex-direction: row;
    block-size: min(84vh, 44rem);
    gap: 0;
  }

  .panel {
    inline-size: auto;
    aspect-ratio: auto;
    max-block-size: none;
    flex: 1 1 0;
    min-inline-size: 0;
    /*
     * A deliberate exception to this project's transform-and-opacity rule, and
     * the only one. The squeeze *is* a width change: the alternative, scaling a
     * panel horizontally, stretches the photograph inside it. Seven elements on
     * one row is a bounded cost, and the images themselves stay composited.
     */
    transition: flex-grow var(--duration-slow) var(--ease-out-soft);
  }

  .panel.is-open {
    flex-grow: 7;
  }

  /* Hover grows a strip without opening it, so the row answers the pointer
     before it is asked to. Focus does the same, or a keyboard walk would move
     through panels that never acknowledge it. */
  .panel:not(.is-open):hover,
  .panel:not(.is-open):focus-within {
    flex-grow: 1.9;
  }

  .expand {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 2;
    cursor: pointer;
    background: none;
    border: 0;
  }

  .panel.is-open .expand {
    cursor: default;
  }

  /*
   * A strip is too narrow for the card's own footer — the type would break
   * mid-word — so the footer fades and the title stands up on its side
   * instead. Opacity only; nothing here moves.
   */
  .panel :deep(.chapter > footer) {
    transition: opacity var(--duration-base) var(--ease-out-soft);
  }

  .panel:not(.is-open) :deep(.chapter > footer) {
    opacity: 0;
    pointer-events: none;
  }

  /*
   * Physical offsets, not logical ones. Logical properties resolve against the
   * element's *own* writing mode, and this one is turned on its side — so
   * inset-block-end here would mean the right-hand edge, not the bottom, and
   * the label would float in the middle of the strip.
   */
  .spine {
    display: block;
    position: absolute;
    bottom: 1.75rem;
    left: 50%;
    z-index: 1;
    writing-mode: vertical-rl;
    rotate: 180deg;
    transform-origin: center;
    translate: -50% 0;
    white-space: nowrap;
    font-size: var(--text-small);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-bone);
    text-shadow: 0 1px 12px rgb(0 0 0 / 0.8);
    opacity: 1;
    transition: opacity var(--duration-base) var(--ease-out-soft);
    pointer-events: none;
  }

  .panel.is-open .spine {
    opacity: 0;
  }
}
</style>
