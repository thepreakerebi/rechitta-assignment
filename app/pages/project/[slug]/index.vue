<script setup lang="ts">
import AgentGreeting from '~/components/feed/AgentGreeting.vue'
import ChapterDeck from '~/components/feed/ChapterDeck.vue'
import ViewingRequest from '~/components/feed/ViewingRequest.vue'
import type { Project, Session } from '#shared/types/domain'

/**
 * 03 · The project feed.
 *
 * Seven full-bleed chapters between Rechitta's greeting and the one thing the
 * briefing is actually asking for. On a phone they stack edge to edge and the
 * whole thing is one scroll, which is the comp: a 400×4172 frame with no
 * chrome between the cards.
 *
 * The cards carry no gap and no page inset on purpose. Every other screen has
 * a reading column; this one deliberately does not, because a photograph with
 * a margin around it reads as a thumbnail rather than as a place.
 */

const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: project, status, error, refresh } = useApiFetch<Project>(
  () => `/api/projects/${slug.value}`,
  { key: `project-${slug.value}` },
)

const { data: session } = useApiFetch<Session>('/api/session', { key: 'session' })

const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')
const chapters = computed(() => project.value?.chapters ?? [])

useSeoMeta({
  title: () => project.value?.name ?? 'The briefing',
  description: () => project.value?.tagline ?? 'The full briefing, chapter by chapter.',
})

/**
 * Her opening line. It names the visitor, so it waits for the session rather
 * than greeting "undefined" — and it is built here rather than stored with a
 * placeholder in it, because a template string in mock data is a template
 * string that reaches production one day.
 */
const greeting = computed(() => {
  const name = session.value?.visitor.firstName
  if (!name) return null
  return `Hello ${name}! I'm Rechitta. Your broker asked me to speak with you, because buying your first home is one of life's biggest decisions.`
})
</script>

<template>
  <main
    id="main"
    class="feed bg-ink"
  >
    <AgentGreeting
      :greeting="greeting"
      :loading="!greeting && isLoading"
    />

    <!-- The failure has to be recoverable without leaving the page: the
         greeting above it still stands, so this replaces the chapters rather
         than the screen. -->
    <section
      v-if="error"
      class="mx-auto w-full max-w-column px-edge py-section text-center"
      aria-labelledby="feed-error-heading"
    >
      <h2
        id="feed-error-heading"
        class="text-lead font-medium text-text"
      >
        The briefing did not load
      </h2>
      <p class="mx-auto mt-2 max-w-[32ch] text-pretty text-body leading-[1.6] text-text-muted">
        Nothing is wrong with your connection as far as we can tell. Try again, and
        Rechitta will fetch it.
      </p>
      <p class="mt-5">
        <button
          class="mx-auto flex min-h-11 items-center rounded-pill bg-control px-5 py-3 font-ui text-ui font-medium text-text-bright transition-[transform,background-color] duration-(--duration-quick) hover:bg-deep active:scale-[0.98]"
          type="button"
          @click="refresh()"
        >Try again</button>
      </p>
    </section>

    <!-- Loading: the cards' own shape, so the feed does not jump to its full
         height the moment the data lands. -->
    <ul
      v-else-if="isLoading"
      class="chapters"
      aria-busy="true"
    >
      <li
        v-for="n in 3"
        :key="n"
        class="chapter-slot skeleton"
      />
      <li class="visually-hidden">Rechitta is fetching the briefing.</li>
    </ul>

    <p
      v-else-if="chapters.length === 0"
      class="mx-auto w-full max-w-column px-edge py-section text-center text-body leading-[1.6] text-text-muted"
    >
      This briefing has no chapters yet. The viewing below is still open.
    </p>

    <ChapterDeck
      v-else
      :chapters="chapters"
    />

    <footer class="px-edge py-[clamp(1.5rem,6vh,3rem)]">
      <ViewingRequest
        :project-name="project?.name ?? 'this project'"
        :project-slug="slug"
        :developer="project?.developer ?? 'Prestige Properties Group'"
      />
    </footer>
  </main>
</template>

<style scoped>
.feed {
  container-type: inline-size;
}

/* The loading stand-in only. The real chapters lay themselves out, in either
   of their two shapes, inside ChapterDeck. */
.chapters {
  display: flex;
  flex-direction: column;
}

.chapter-slot {
  inline-size: 100%;
  aspect-ratio: 400 / 484;
  max-block-size: 86vh;
}

@media (width >= 64rem) {
  .chapters {
    flex-direction: row;
    block-size: min(84vh, 44rem);
  }

  .chapter-slot {
    inline-size: auto;
    aspect-ratio: auto;
    max-block-size: none;
    flex: 1 1 0;
  }

  /* The first stands in for the open panel, so the skeleton has the shape the
     accordion will arrive in rather than seven equal columns. */
  .chapter-slot:first-child {
    flex-grow: 7;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    var(--color-surface-raised) 50%,
    var(--color-surface) 100%
  );
  background-size: 200% 100%;
  animation: sheen 1.6s var(--ease-in-out-soft) infinite;
  border-block-end: 1px solid var(--color-hairline);
}

@keyframes sheen {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
</style>
