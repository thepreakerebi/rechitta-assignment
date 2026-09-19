import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-mic-granted',
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['microphone'],
        launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
      },
    },
    {
      // The page must be fully usable when the microphone is refused.
      name: 'chromium-mic-denied',
      use: { ...devices['Desktop Chrome'], permissions: [] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    // The devtools overlay is not part of the product and fails rules of its
    // own; see nuxt.config.ts.
    env: { NUXT_DEVTOOLS: 'false' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
