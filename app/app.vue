<script setup lang="ts">
/**
 * Nuxt's own <NuxtRouteAnnouncer> renders a <span>, which this project bans, so
 * the announcement is rendered here on an <output> instead — an element that is
 * a polite live region by definition rather than by attribute.
 */
const { message } = useRouteAnnouncer()

useHead({
  titleTemplate: (title?: string) => (title ? `${title} · Rechitta` : 'Rechitta'),
})
</script>

<template>
  <!--
    The announcement is empty on the server and carries the page's title the
    instant it hydrates, which Vue reports as a text mismatch — a console error
    on every page load in production. It is not a mistake to fix but a
    difference to declare: the element is rendered server-side on purpose, so
    the live region exists before there is ever anything to announce into it.
  -->
  <output
    class="visually-hidden"
    data-allow-mismatch="text"
  >{{ message }}</output>

  <a
    class="fixed start-4 top-0 z-50 -translate-y-24 rounded-pill bg-text px-4 py-2 text-small font-medium text-ink shadow-lg transition-transform duration-(--duration-base) ease-(--ease-out-soft) focus-visible:translate-y-4"
    href="#main"
  >
    Skip to content
  </a>

  <NuxtPage />
</template>
