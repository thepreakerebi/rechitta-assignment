import tailwindcss from '@tailwindcss/vite'

/**
 * A single place to describe what this document is allowed to do.
 *
 * `script-src` keeps `'unsafe-inline'` because Nuxt inlines its hydration
 * payload; everything else is locked to same-origin. `media-src blob:` is
 * required for the microphone stream, and `microphone=(self)` in
 * Permissions-Policy is the narrowest grant that still lets the orb listen.
 */
const isProduction = process.env.NODE_ENV === 'production'

/** Vite's HMR socket needs an explicit websocket grant; production does not. */
const connectSrc = isProduction ? "connect-src 'self'" : "connect-src 'self' ws: wss:"

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  connectSrc,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ')

const securityHeaders = {
  'Content-Security-Policy': contentSecurityPolicy,
  'Permissions-Policy': 'microphone=(self), camera=(), geolocation=(), payment=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

export default defineNuxtConfig({
  compatibilityDate: '2026-09-19',
  future: { compatibilityVersion: 4 },

  modules: ['@nuxt/eslint', '@nuxt/fonts', '@vueuse/nuxt', 'motion-v/nuxt'],

  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  eslint: {
    config: { stylistic: false },
  },

  fonts: {
    // Three families, because the design uses three: Inter for headings and
    // body, Space Grotesk for names, DM Sans for controls.
    families: [
      { name: 'Inter', provider: 'google', weights: [100, 300, 400, 500, 700] },
      { name: 'Space Grotesk', provider: 'google', weights: [400, 500] },
      { name: 'DM Sans', provider: 'google', weights: [400, 500] },
    ],
  },

  app: {
    /*
     * Every screen here is a full-bleed dark composition, so a hard swap between
     * them reads as a jolt — and on a real browser the moment a page mounts is
     * also when blend-mode and backdrop-filter layers can paint one unblended
     * frame. Crossing out and then in covers both: the outgoing screen fades to
     * the page background, which is already the right colour, and the incoming
     * one arrives from nothing.
     */
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'en', 'data-theme': 'dark' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#09090B' },
      ],
      /*
       * Rechitta's own mark, taken from rechitta.com rather than approximated.
       * The SVG is theirs as they ship it; the touch icon is built from the
       * lockup this project already carries, because the one the site serves
       * for iOS is a 50px image stretched to a home screen.
       *
       * The touch icon is deliberately square and opaque — iOS applies its own
       * rounding and ignores transparency, so a rounded transparent one arrives
       * with black corners.
       */
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      ],
    },
  },

  nitro: {
    routeRules: {
      '/**': { headers: securityHeaders },
    },
  },

  devtools: { enabled: true },
})
