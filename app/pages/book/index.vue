<script setup lang="ts">
/**
 * 05 · Book a viewing.
 *
 * Placeholder. The appointment flow — slots, the form, the confirmation — is a
 * later milestone; the mock server already serves it at /api/appointments. It
 * exists now so the feed's one call to action lands somewhere real rather than
 * failing against a route that does not resolve.
 */
useSeoMeta({ title: 'Book a viewing' })
</script>

<template>
  <main
    id="main"
    class="grid min-h-dvh place-items-center bg-deep px-edge text-center"
  >
    <hgroup>
      <p class="eyebrow">The viewing</p>
      <h1 class="mt-2 text-heading font-bold">Book a viewing</h1>
      <p class="mt-3 text-lead text-text-muted">The appointment flow is the next milestone.</p>
    </hgroup>
  </main>
</template>
