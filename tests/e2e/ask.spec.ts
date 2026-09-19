import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 03 · First words.
 *
 * The screen where the orb runs on the real microphone. The tests cover the two
 * things a reviewer would check by hand: that the audio path is genuinely wired
 * to the device rather than faked, and that every state the brief names —
 * loading, empty, error, permission, success — is reachable and says something
 * useful when it is.
 */

const PHONE = { width: 390, height: 844 }
const NARROW = { width: 320, height: 640 }
const BRIEFING = /\/project\/berkeley-square-north$/

/** Only the project launched with a fake capture device can be granted one. */
const needsFakeDevice = () =>
  test.skip(test.info().project.name !== 'chromium-mic-granted', 'needs a fake capture device')

/** The answer region holds the only <article> on the screen. */
const answerPanel = (page: Page) => page.locator('main article')
const primary = (page: Page) => page.locator('main footer button')

/**
 * Opens the screen and waits for it to come alive.
 *
 * Nothing on this screen is disabled while it loads, which is the point — the
 * control is never unavailable with the reason hidden. The cost is that before
 * hydration the footer button is inert markup, so a click lands on it and does
 * nothing. Waiting here keeps that from reading as "the button is broken".
 */
const open = async (page: Page, path: string) => {
  await page.setViewportSize(PHONE)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

test.describe('03 · First words · the microphone', () => {
  test('opens the device only when asked, and drives the orb from it', async ({ page, context }) => {
    needsFakeDevice()
    await context.grantPermissions(['microphone'])

    // Count the tracks the page actually opens, so "it is listening" is a fact
    // about the device rather than about a CSS class.
    await page.addInitScript(() => {
      const state = { calls: 0, live: 0 }
      Object.defineProperty(window, '__mic', { get: () => state })
      const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        state.calls += 1
        const stream = await real(constraints)
        for (const track of stream.getTracks()) {
          state.live += 1
          const stop = track.stop.bind(track)
          track.stop = () => { state.live -= 1; stop() }
        }
        return stream
      }
    })

    await open(page, '/ask')

    const read = () => page.evaluate(() => (window as unknown as { __mic: { calls: number, live: number } }).__mic)

    // Nothing is opened on load. The microphone is requested at the moment of use.
    expect((await read()).calls).toBe(0)

    const speak = page.getByRole('button', { name: 'Speak' })
    await speak.click()

    await expect(page.getByRole('button', { name: 'Stop listening' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('main .orb-stage output')).toContainText(/moving with your voice/i)
    await expect.poll(async () => (await read()).live).toBe(1)

    // And it closes again on request, rather than holding the indicator lit.
    await page.getByRole('button', { name: 'Stop listening' }).click()
    await expect(page.getByRole('button', { name: 'Speak' })).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(async () => (await read()).live).toBe(0)
  })

  test('releases the device before the question is sent', async ({ page, context }) => {
    needsFakeDevice()
    await context.grantPermissions(['microphone'])
    await page.addInitScript(() => {
      const state = { live: 0 }
      Object.defineProperty(window, '__mic', { get: () => state })
      const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await real(constraints)
        for (const track of stream.getTracks()) {
          state.live += 1
          const stop = track.stop.bind(track)
          track.stop = () => { state.live -= 1; stop() }
        }
        return stream
      }
    })

    await open(page, '/ask')
    await page.getByRole('button', { name: 'Speak' }).click()
    await expect.poll(async () =>
      (await page.evaluate(() => (window as unknown as { __mic: { live: number } }).__mic)).live,
    ).toBe(1)

    await primary(page).click()

    // Nothing should still be capturing while the answer is in flight.
    await expect.poll(async () =>
      (await page.evaluate(() => (window as unknown as { __mic: { live: number } }).__mic)).live,
    ).toBe(0)
  })

  test('explains a refusal and still lets the question be asked', async ({ page, context }) => {
    test.skip(test.info().project.name === 'chromium-mic-granted', 'that project cannot refuse')
    await context.clearPermissions()
    await open(page, '/ask')

    const speak = page.getByRole('button', { name: 'Speak' })
    const note = page.locator('.orb-stage p').filter({ hasText: /microphone/i })

    // Wait for the screen to settle before reading it. Asking `isVisible` the
    // instant the navigation resolves is a race with hydration, and a false
    // from that race silently skips the click — so the test then waits forever
    // for an explanation the page was never asked to produce.
    await expect(speak.or(note).first()).toBeVisible({ timeout: 20_000 })

    // A machine with no capture device at all has already settled; one that can
    // prompt settles after the press.
    if (await speak.isVisible()) await speak.click()

    // Whatever the browser said, the screen says why and points at the way on —
    // it never leaves a control that can only fail. Generously timed because a
    // permission round trip is a browser decision rather than a render.
    await expect(note.first()).toBeVisible({ timeout: 20_000 })

    await primary(page).click()
    await expect(answerPanel(page)).toContainText(/Rechitta answered/i)
  })
})

test.describe('03 · First words', () => {
  test('is the orb, one control, and nothing else to fill in', async ({ page }) => {
    await open(page, '/ask')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Say the first thing')

    // The question picker is deliberately gone: there is nothing to fill in.
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expect(page.getByRole('textbox')).toHaveCount(0)
  })

  test('names the gesture the screen actually uses, once', async ({ page }) => {
    await open(page, '/ask')

    const lead = page.locator('main header p')
    await expect(lead).toContainText(/“Speak”, speak out loud, and watch her listen\./)

    // Both verbs sit in the markup; exactly one is ever displayed, so the
    // sentence is never read out as "Click Tap Speak".
    const verbs = async () => ({
      click: await lead.locator('b:text-is("Click")').isVisible(),
      tap: await lead.locator('b:text-is("Tap")').isVisible(),
    })

    await expect.poll(verbs).toEqual({ click: false, tap: true })

    // A touch device stays "Tap" however wide the window gets — the finger does
    // not become a mouse. Only a fine pointer on a roomy screen says "Click".
    if (test.info().project.name === 'mobile-safari') return

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect.poll(verbs).toEqual({ click: true, tap: false })
  })
})

test.describe('03 · First words · states', () => {
  test('shows a skeleton while she thinks, never the word Loading', async ({ page }) => {
    await open(page, '/ask?latency=1200')

    await primary(page).click()

    const panel = answerPanel(page)
    await expect(panel).toContainText(/Rechitta is thinking/i)
    await expect(panel.locator('i')).toHaveCount(3)
    await expect(page.locator('main')).not.toContainText(/loading/i)

    // The control says it is busy rather than pretending to be idle.
    await expect(primary(page)).toHaveAttribute('aria-busy', 'true')
    await expect(primary(page)).toBeDisabled()

    await expect(panel).toContainText(/Rechitta answered/i, { timeout: 15_000 })
  })

  test('succeeds into a way forward, rather than a dead end', async ({ page }) => {
    await open(page, '/ask')

    await primary(page).click()
    await expect(answerPanel(page)).toContainText(/Rechitta answered/i)

    await expect(primary(page)).toHaveText(/^See the briefing/)
    await primary(page).click()
    await expect(page).toHaveURL(BRIEFING)
  })

  test('has something to say when there is nothing to show', async ({ page }) => {
    await open(page, '/ask?fail=empty')

    await primary(page).click()

    const panel = answerPanel(page)
    await expect(panel).toContainText(/Nothing to show yet/i)
    // An empty state that only says "empty" is not a state, it is a shrug.
    await expect(panel).toContainText(/carry on/i)
  })

  test('fails without leaking the server, and offers the retry', async ({ page }) => {
    await open(page, '/ask?fail=server')

    await primary(page).click()

    const panel = answerPanel(page)
    await expect(panel).toContainText(/could not answer/i)
    // The backend's own message must never reach the interface.
    await expect(panel).not.toContainText(/500|Internal Server Error/i)
    await expect(primary(page)).toHaveText(/^Try again/)
  })

  test('a timeout is handled the same way as a failure', async ({ page }) => {
    await open(page, '/ask?fail=timeout')

    await primary(page).click()
    await expect(answerPanel(page)).toContainText(/could not answer/i)
    await expect(answerPanel(page)).not.toContainText(/504|Gateway/i)
  })

})

test.describe('03 · First words · layout and keyboard', () => {
  test('reflows at 320px with no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(NARROW)
    await page.goto('/ask')
    await page.waitForLoadState('networkidle')

    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  })

  test('holds together from a narrow phone to a wide desktop', async ({ page }) => {
    for (const size of [NARROW, PHONE, { width: 1440, height: 900 }]) {
      await page.setViewportSize(size)
      await page.goto('/ask')
      await page.waitForLoadState('networkidle')

      const spills = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(spills, `at ${size.width}×${size.height}`).toBe(false)
    }
  })

  test('every control clears the 24px target, and the primary ones 44px', async ({ page }) => {
    await open(page, '/ask')

    for (const dot of await page.locator('nav[aria-label="Onboarding progress"] a').all()) {
      const box = await dot.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(24)
      expect(box!.height).toBeGreaterThanOrEqual(24)
    }

    for (const control of await page.locator('main button').all()) {
      const box = await control.boundingBox()
      if (!box) continue
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

})
