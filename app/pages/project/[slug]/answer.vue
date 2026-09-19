<script setup lang="ts">
import AgentHeader from '~/components/deck/AgentHeader.vue'
import AnswerPanel from '~/components/deck/AnswerPanel.vue'
import type { Answer, Project, Session } from '#shared/types/domain'

/**
 * 04 · The answer deck.
 *
 * One screen, however many panels her answer has, paged. The comp draws two of
 * them and puts three dots under it, which is the schedule panel missing rather
 * than a miscount — so the pager counts the panels it is given rather than
 * always drawing three.
 *
 * The deck is the conversation, not a report: the header carries the question
 * it is answering and the microphone to ask another. Every way in — a chapter's
 * arrow, either control under the greeting — lands here; what differs is the
 * question it arrives with.
 *
 * Paging is a scroll-snap track rather than a JavaScript carousel. That gives
 * touch, trackpad, keyboard and a screen reader's own reading order for free,
 * and it is the browser doing the animating, which is the only way it is
 * genuinely smooth on a phone.
 */

const route = useRoute()
const router = useRouter()
const slug = computed(() => String(route.params.slug))
const briefing = computed(() => `/project/${slug.value}`)

const { data: project } = useApiFetch<Project>(() => `/api/projects/${slug.value}`, {
  key: `project-${slug.value}`,
})
const { data: session } = useApiFetch<Session>('/api/session', { key: 'session' })

const scenario = useScenarioQuery()

/** What she was asked. The chapter's question, or the one she opens with. */
const asked = computed(() => {
  const q = route.query.q
  return typeof q === 'string' && q.trim().length > 1 ? q.trim() : null
})

const primed = computed(() => route.query.speak === '1')

const answer = ref<Answer | null>(null)
const pending = ref(true)
const failed = ref(false)

const ask = async (question: string | null) => {
  pending.value = true
  failed.value = false

  try {
    answer.value = await $fetch<Answer>('/api/agent/ask', {
      method: 'POST',
      query: scenario.value,
      body: {
        question: question ?? DEFAULT_QUESTION,
        projectSlug: session.value?.projectSlug ?? slug.value,
      },
    })
  }
  catch {
    // The server's own message is never surfaced; what is needed is the way on.
    answer.value = null
    failed.value = true
  }
  finally {
    pending.value = false
  }
}

const DEFAULT_QUESTION = 'What makes this the perfect first investment?'

const panels = computed(() => answer.value?.panels ?? [])

useSeoMeta({
  title: () => (answer.value ? `Rechitta on ${project.value?.name ?? 'the project'}` : 'Rechitta'),
  description: () => answer.value?.transcript ?? 'Rechitta’s answer, in full.',
})

/* ---------------------------------------------------------------------------
   Paging
--------------------------------------------------------------------------- */

const track = ref<HTMLElement | null>(null)
const current = ref(0)

/**
 * Where the next key press counts from.
 *
 * Separate from `current`, which is what the dots show. `current` follows the
 * scroll continuously, so during a smooth scroll it reads whatever panel is
 * passing — and a second arrow press computed from that could send you back the
 * way you came. `intent` only moves when a press sets it, or when the track has
 * genuinely settled somewhere.
 */
let intent = 0

/**
 * Which panel is in view, read off the track's own scroll position rather than
 * held as the source of truth. A swipe moves the scroll and nothing else, so
 * anything that watched a ref instead would be permanently one gesture behind.
 */
const onScroll = () => {
  const el = track.value
  if (!el || el.clientWidth === 0) return

  const index = Math.round(el.scrollLeft / el.clientWidth)
  current.value = index

  // Settled, rather than passing through: only then is this where a key press
  // should count from.
  if (Math.abs(el.scrollLeft - index * el.clientWidth) < 2) intent = index
}

const goTo = (index: number) => {
  const el = track.value
  if (!el) return
  intent = index
  el.scrollTo({ left: index * el.clientWidth })
}

/** Both axes, because the dots read as a row and the panels as a sequence. */
const onKeydown = (event: KeyboardEvent) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  const last = panels.value.length - 1
  const target = ['ArrowRight', 'ArrowDown'].includes(event.key)
    ? Math.min(intent + 1, last)
    : ['ArrowLeft', 'ArrowUp'].includes(event.key)
      ? Math.max(intent - 1, 0)
      : event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : null

  if (target === null) return
  event.preventDefault()
  goTo(target)
}

/**
 * Asking again from the header replaces the question in the URL, so the answer
 * on screen is always the one the address describes — and a reload, a share or
 * the back button all land on the same thing.
 */
const askAgain = () => router.replace({ query: { ...route.query, q: DEFAULT_QUESTION } })

watch(asked, question => ask(question), { immediate: true })
watch(panels, () => {
  current.value = 0
  intent = 0
})
</script>

<template>
  <main
    id="main"
    class="deck"
  >
    <AgentHeader
      class="header"
      :question="asked ?? DEFAULT_QUESTION"
      :back-to="briefing"
      :primed="primed"
      @ask="askAgain"
    />

    <!-- Thinking: the panel's own shape, so the answer arrives into its outline
         instead of the page jumping to its full height. -->
    <section
      v-if="pending"
      class="stage"
      aria-busy="true"
    >
      <p class="skeleton" />
      <em class="visually-hidden">Rechitta is answering.</em>
    </section>

    <section
      v-else-if="failed"
      class="stage recover"
      aria-labelledby="deck-error"
    >
      <hgroup>
        <h2 id="deck-error">She could not answer</h2>
        <p>Nothing is wrong with your connection as far as we can tell.</p>
      </hgroup>
      <p class="actions">
        <button
          type="button"
          class="again"
          @click="ask(asked)"
        >Try again</button>
        <NuxtLink
          class="away"
          :to="briefing"
        >Back to the briefing</NuxtLink>
      </p>
    </section>

    <section
      v-else-if="panels.length === 0"
      class="stage recover"
      aria-labelledby="deck-empty"
    >
      <hgroup>
        <h2 id="deck-empty">Nothing to show for that one</h2>
        <p>Rechitta understood the question but has nothing on file for it.</p>
      </hgroup>
      <p class="actions">
        <NuxtLink
          class="away"
          :to="briefing"
        >Back to the briefing</NuxtLink>
      </p>
    </section>

    <template v-else>
      <ul
        ref="track"
        class="track"
        tabindex="0"
        :aria-label="`Rechitta's answer, ${panels.length} panels`"
        @scroll.passive="onScroll"
        @keydown="onKeydown"
      >
        <li
          v-for="(panel, index) in panels"
          :key="panel.id"
          class="slide"
        >
          <AnswerPanel
            :panel="panel"
            :index="index + 1"
            :total="panels.length"
            :priority="index === 0"
          />
        </li>
      </ul>

      <!-- The pager, bottom left as the comp places it. Real controls: the dots
           are the only way back through the answer without a swipe. -->
      <nav
        class="pager"
        aria-label="Answer panels"
      >
        <ol>
          <li
            v-for="(panel, index) in panels"
            :key="panel.id"
          >
            <button
              type="button"
              :class="{ 'is-current': index === current }"
              :aria-current="index === current ? 'true' : undefined"
              @click="goTo(index)"
            >
              <em class="visually-hidden">Panel {{ index + 1 }} of {{ panels.length }}</em>
            </button>
          </li>
        </ol>
      </nav>
    </template>
  </main>
</template>

<style scoped>
.deck {
  position: relative;
  isolation: isolate;
  block-size: 100dvh;
  overflow: hidden;
  background-color: var(--color-ink);
  container-type: inline-size;
}

/* Over the panels, as the comp draws it, and inset from the edge on a phone. */
.header {
  position: absolute;
  z-index: 3;
  inset-inline: clamp(0.75rem, 4cqi, 2rem);
  inset-block-start: clamp(0.75rem, 3vh, 2rem);
  inline-size: auto;
  max-inline-size: 40rem;
  margin-inline: auto;
  border-radius: var(--radius-card);
}

/*
 * A scroll-snap track. The browser animates it, which is the only way paging is
 * genuinely smooth on a phone, and it brings touch, trackpad and keyboard with
 * it. Under reduced motion the page's own scroll-behavior turns the animation
 * off and the jump is instant.
 */
.track {
  display: flex;
  block-size: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  /* The panels are the page; a bar across them would be chrome. */
  -ms-overflow-style: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.slide {
  flex: 0 0 100%;
  inline-size: 100%;
  block-size: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.pager {
  position: absolute;
  z-index: 3;
  inset-inline-start: clamp(1rem, 6.5cqi, 3rem);
  inset-block-end: clamp(1rem, 3vh, 2rem);
}

.pager ol {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* An 8px mark inside a 24px target, the smallest WCAG 2.2 allows for a
   pointer. */
.pager button {
  display: grid;
  place-items: center;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  border-radius: var(--radius-card);
}

.pager button::before {
  content: '';
  display: block;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 0.25rem;
  background-color: rgb(255 255 255 / 0.15);
  transition:
    inline-size var(--duration-base) var(--ease-out-soft),
    background-color var(--duration-base) var(--ease-out-soft);
}

.pager button.is-current::before {
  inline-size: 1rem;
  background-color: var(--color-text);
}

.stage {
  display: grid;
  place-content: center;
  gap: 1rem;
  block-size: 100%;
  padding-inline: var(--spacing-edge);
  text-align: center;
}

.skeleton {
  inline-size: min(90cqi, 28rem);
  block-size: min(50vh, 20rem);
  border-radius: var(--radius-panel);
  background: linear-gradient(
    90deg,
    var(--color-surface) 0%,
    var(--color-surface-raised) 50%,
    var(--color-surface) 100%
  );
  background-size: 200% 100%;
  animation: sheen 1.6s var(--ease-in-out-soft) infinite;
}

.recover h2 {
  font-size: var(--text-lead);
  font-weight: 500;
  color: var(--color-text);
}

.recover p {
  margin-block-start: 0.5rem;
  max-inline-size: 34ch;
  margin-inline: auto;
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
}

.again {
  min-block-size: 2.75rem;
  padding-inline: 1.25rem;
  border-radius: var(--radius-pill);
  background-color: var(--color-control);
  font-family: var(--font-ui);
  font-size: var(--text-ui);
  font-weight: 500;
  color: var(--color-text-bright);
  transition: background-color var(--duration-quick) var(--ease-out-soft);
}

.again:hover {
  background-color: var(--color-deep);
}

.away {
  display: grid;
  place-items: center;
  min-block-size: 2.75rem;
  padding-inline: 1rem;
  font-family: var(--font-ui);
  font-size: var(--text-ui);
  font-weight: 500;
  color: var(--color-text-faint);
  transition: color var(--duration-quick) var(--ease-out-soft);
}

.away:hover {
  color: var(--color-text);
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
