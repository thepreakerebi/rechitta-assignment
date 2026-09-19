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

  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/image', '@vueuse/nuxt', 'motion-v/nuxt'],

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
    head: {
      htmlAttrs: { lang: 'en', 'data-theme': 'dark' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#09090B' },
      ],
      link: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    },
  },

  nitro: {
    routeRules: {
      '/**': { headers: securityHeaders },
    },
  },

  devtools: { enabled: true },
})
