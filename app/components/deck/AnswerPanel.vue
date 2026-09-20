<script setup lang="ts">
import { formatAed, formatSqft } from '~/utils/format'
import type { Panel } from '#shared/types/domain'

/**
 * One page of her answer: a full-bleed photograph with the figures written over
 * its foot.
 *
 * Three shapes, because an answer about a building takes three — a grid of
 * figures, a list of what is left, or the schedule you would pay it on. Which
 * one is drawn comes off the panel's own `kind`, so a fourth would be a compile
 * error here rather than a silently blank page.
 */

defineProps<{
  panel: Panel
  /** Only the panel in view is worth fetching eagerly. */
  priority?: boolean
  index: number
  total: number
}>()

</script>

<template>
  <article class="panel">
    <img
      class="hero"
      :src="panel.hero.src"
      :alt="panel.hero.alt"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
    >

    <section class="foot">
      <h2 class="title">
        {{ panel.title }}
        <em class="visually-hidden">— {{ index }} of {{ total }}</em>
      </h2>

      <!-- A list of figures rather than a description list. `dl` would say
           more about the label/value pairing, but grouping each pair inside a
           bordered tile needs a wrapper, and the only wrapper `dl` permits is a
           `div` — which this project does not use. A list of tiles is both
           valid and true. -->
      <ul
        v-if="panel.kind === 'stats'"
        class="grid"
      >
        <li
          v-for="metric in panel.metrics"
          :key="metric.id"
          class="tile"
        >
          <p class="label">{{ metric.label }}</p>
          <p class="value">{{ metric.value }}</p>
          <p class="detail">{{ metric.detail }}</p>
        </li>
      </ul>

      <ul
        v-else-if="panel.kind === 'units'"
        class="card rows"
      >
        <li
          v-for="unit in panel.units"
          :key="unit.id"
        >
          <p class="row-name">
            Unit {{ unit.reference }}
            <!-- Bedrooms, floor, size — the three the comp shows, in that
                 order. The features are what the unit is like; this line is
                 what it is. -->
            <small>{{ unit.bedrooms }} Bed · {{ unit.floorLabel }} · {{ formatSqft(unit.areaSqft) }}</small>
          </p>
          <p class="row-figure">{{ formatAed(unit.price) }}</p>
        </li>
      </ul>

      <ol
        v-else
        class="card rows"
      >
        <li
          v-for="step in panel.schedule"
          :key="step.id"
        >
          <p class="row-name">
            {{ step.label }}
            <small>
              {{ step.dueLabel }}
              <!-- Never colour alone: a settled instalment says so. -->
              <template v-if="step.settled"> · Paid</template>
            </small>
          </p>
          <p
            class="row-figure"
            :class="{ 'is-settled': step.settled }"
          >
            {{ step.percent }}%
            <small>{{ formatAed(step.amount) }}</small>
          </p>
        </li>
      </ol>
    </section>
  </article>
</template>

<style scoped>
.panel {
  position: relative;
  isolation: isolate;
  container-type: inline-size;
  inline-size: 100%;
  block-size: 100%;
  overflow: hidden;
  background-color: var(--color-chapter-foot);
}

.hero {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

/*
 * The comp's gradient: nothing at the top, the page's own black by about three
 * quarters down. Decoration, so CSS rather than markup.
 */
.panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgb(0 0 0 / 0) 28%, var(--color-chapter-foot) 77%);
  pointer-events: none;
}

/*
 * Left-aligned and given a measure. In the comp the block is 352 of a 400-wide
 * frame — nearly the full width because the frame is a phone. Let loose on a
 * desktop it becomes a single row of figures a metre apart, so it keeps a
 * width rather than a percentage, and stays where the comp puts it.
 */
.foot {
  position: absolute;
  z-index: 1;
  inset-inline: 0;
  inset-block-end: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  inline-size: min(100%, 38rem);
  padding-inline: clamp(1rem, 6.5cqi, 3rem);
  padding-block-end: clamp(3.5rem, 12cqi, 5rem);
  /*
   * Anchored to the bottom and free to grow upward, which the payment schedule
   * does: eight rows on a laptop put its title underneath the floating header
   * and the panel read as untitled. The header is 4.125rem tall and sits a
   * little under the top edge, so nothing may begin above that.
   */
  padding-block-start: calc(4.125rem + clamp(1.5rem, 5vh, 3.5rem));
  max-block-size: 100%;
}

.title {
  font-family: var(--font-brand);
  font-size: clamp(1.25rem, 6cqi, 2rem);
  font-weight: 400;
  line-height: 1.25;
  color: var(--color-text);
}

/*
 * Two by two, as the comp draws it — not auto-fit. Left to fit itself the grid
 * found room for three across on a desktop and broke "AED 1.68M" over two
 * lines in the process; the figures are the point of the panel and they should
 * not be the thing that wraps.
 */
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

/* Below about a 280px panel two columns stop being two columns. */
@container (width < 17rem) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.tile,
.card {
  border: 1px solid rgb(201 169 97 / 0.1);
  border-radius: var(--radius-card);
  background-color: rgb(255 255 255 / 0.03);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tile {
  padding: clamp(0.75rem, 3.5cqi, 1.25rem);
}

.tile .label {
  font-size: clamp(0.75rem, 3.2cqi, 0.875rem);
  color: var(--color-gold);
}

.tile .value {
  margin-block-start: 0.35rem;
  font-family: var(--font-brand);
  font-size: clamp(1.1rem, 5.4cqi, 1.65rem);
  line-height: 1.2;
  color: var(--color-text);
}

.tile .detail {
  margin-block-start: 0.35rem;
  font-family: var(--font-ui);
  font-size: clamp(0.6875rem, 3cqi, 0.8125rem);
  line-height: 1.4;
  color: var(--color-text-faint);
}

.card {
  padding: clamp(0.875rem, 4.25cqi, 1.5rem);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 6cqi, 1.5rem);
}

.rows > li {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.row-name {
  font-family: var(--font-brand);
  font-size: clamp(0.875rem, 4cqi, 1.0625rem);
  line-height: 1.25;
  color: var(--color-text);
}

.row-name small,
.row-figure small {
  display: block;
  margin-block-start: 0.25rem;
  font-family: var(--font-ui);
  font-size: clamp(0.6875rem, 3cqi, 0.8125rem);
  line-height: 1.35;
  color: #7d7d7d;
}

.row-figure {
  flex-shrink: 0;
  text-align: end;
  font-family: var(--font-brand);
  font-size: clamp(0.875rem, 4cqi, 1.0625rem);
  line-height: 1.25;
  color: var(--color-text);
}

.row-figure.is-settled {
  color: var(--color-gold);
}
</style>
