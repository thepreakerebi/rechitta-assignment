<script setup lang="ts">
import type { Project } from '#shared/types/domain'

/**
 * 03 · The project feed.
 *
 * Placeholder. The full screen — seven full-bleed chapters over a 4,172px
 * scroll, closing on the viewing request — is the next milestone. It exists
 * now so that Skip and Allow on the onboarding screen have somewhere real to
 * land, rather than failing silently against a route that does not resolve.
 */
const route = useRoute()
const slug = computed(() => String(route.params.slug))

const { data: project } = useApiFetch<Project>(() => `/api/projects/${slug.value}`, {
  key: `project-${slug.value}`,
})

useSeoMeta({ title: () => project.value?.name ?? 'Briefing' })
</script>

<template>
  <main
    id="main"
    class="grid min-h-dvh place-items-center bg-deep px-edge text-center"
  >
    <hgroup>
      <p class="eyebrow">The overview</p>
      <h1 class="mt-2 text-heading font-bold">{{ project?.name ?? 'Briefing' }}</h1>
      <p class="mt-3 text-lead text-text-muted">The full briefing is the next milestone.</p>
    </hgroup>
  </main>
</template>
