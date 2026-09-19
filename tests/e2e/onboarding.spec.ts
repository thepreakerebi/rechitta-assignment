import { expect, test } from '@playwright/test'

/**
 * 02 · Onboarding — Speak to Discover.
 *
 * The screen exists to ask for the microphone, so the tests are mostly about
 * the asking: that the browser is really given the chance to prompt, that a
 * refusal explains itself instead of dead-ending, and that the briefing is
 * reachable either way. Voice is an enhancement here, never a gate.
 */

const PHONE = { width: 390, height: 844 }
const NARROW = { width: 320, height: 640 }
const PROJECT = /\/project\/berkeley-square-north$/

/** Records every getUserMedia call so the request itself can be asserted on. */
const spyOnGetUserMedia = (page: import('@playwright/test').Page) =>
  page.addInitScript(() => {
    const seen: unknown[] = []
    Object.defineProperty(window, '__micCalls', { get: () => seen })
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = (constraints) => {
      seen.push(JSON.parse(JSON.stringify(constraints)))
      return real(constraints)
    }
  })

const micCalls = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __micCalls: unknown[] }).__micCalls)

test.describe('02 · Onboarding', () => {
  test('presents the ask, the prompts and the privacy promise', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Speak to Discover')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(/You can ask Rechitta anything/i)

    const prompts = page.locator('main ul li')
    await expect(prompts).toHaveCount(5)
    await expect(prompts.first()).toContainText('Is there a 2-bed available')
    await expect(prompts.last()).toContainText('How does the payment plan work')

    await expect(page.getByText(/never stored without your explicit permission/i)).toBeVisible()
    await expect(page.getByText('Step 2 of 3')).toBeAttached()
  })

  test('the control says what it does, rather than calling itself Next', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')
    await expect(page.getByRole('button', { name: /allow microphone/i })).toBeVisible()
  })

  test('actually asks the browser for the microphone', async ({ page, context }) => {
    needsFakeDevice()
    // The project pre-grants the microphone, which is the returning-visitor
    // path — and a returning visitor is deliberately never asked again. Clear
    // it so this is a first visit, with the fake UI accepting the prompt.
    await context.clearPermissions()
    await spyOnGetUserMedia(page)
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    await page.getByRole('button', { name: /allow microphone/i }).click()
    await expect(page.locator('main output')).toContainText(/microphone connected/i)

    const calls = await micCalls(page)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ audio: { echoCancellation: true } })
  })
})

/** Only the project launched with a fake capture device can be granted one. */
const needsFakeDevice = () =>
  test.skip(test.info().project.name !== 'chromium-mic-granted', 'needs a fake capture device')

test.describe('02 · Onboarding · microphone granted', () => {
  test('confirms rather than whisking you away', async ({ page, context }) => {
    needsFakeDevice()
    await context.clearPermissions()
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    await page.getByRole('button', { name: /allow microphone/i }).click()

    // Moving someone the instant a system dialog closes gives them no chance to
    // see that it worked, so the screen confirms and waits.
    await expect(page.locator('main output')).toContainText(/microphone connected/i)
    await expect(page).toHaveURL(/\/onboarding$/)

    const onward = page.locator('main footer button')
    await expect(onward).toBeVisible()
    await onward.click()
    await expect(page).toHaveURL(PROJECT)
  })

  test('does not ask a returning visitor twice', async ({ page, context }) => {
    needsFakeDevice()
    await context.grantPermissions(['microphone'])
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    // Consent already given: go straight to a plain way forward.
    await expect(page.locator('main footer button')).toHaveText(/^Next/)
    await expect(page.getByRole('button', { name: /allow microphone/i })).toHaveCount(0)
  })

  test('does not hold the device open across the navigation', async ({ page, context }) => {
    needsFakeDevice()
    await context.grantPermissions(['microphone'])
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    // Prior consent is read asynchronously, so wait for the control to settle
    // rather than racing it.
    const onward = page.locator('main footer button')
    await expect(onward).toHaveText(/^Next/)
    await onward.click()
    await expect(page).toHaveURL(PROJECT)

    // A track left running would keep the recording indicator lit on the next
    // screen, which is exactly what the privacy note promises not to do.
    const capturing = await page.evaluate(() =>
      Boolean((window as unknown as { __liveTracks?: number }).__liveTracks),
    )
    expect(capturing).toBe(false)
  })
})

test.describe('02 · Onboarding · microphone refused', () => {
  test('explains itself and still lets you through', async ({ page, context }) => {
    // The granted project runs with --use-fake-ui-for-media-stream, which
    // accepts every prompt on sight, so a refusal is only observable elsewhere.
    test.skip(test.info().project.name === 'chromium-mic-granted', 'that project cannot refuse')
    await context.clearPermissions()
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    const ask = page.getByRole('button', { name: /allow microphone/i })

    // A machine with no capture device at all settles before the first click;
    // one that can prompt settles after it. Both end in the same place.
    if (await ask.isVisible()) {
      await ask.click()
      await expect(page).not.toHaveURL(PROJECT)
    }

    // Whatever the reason, it is said out loud rather than swallowed. Matched on
    // the element rather than the role, because the app's route announcer is a
    // status region too and the page must not depend on which one wins.
    const explanation = page.locator('main output')
    await expect(explanation).toBeVisible()
    await expect(explanation).not.toBeEmpty()

    // And the briefing is still reachable — voice was never a gate.
    const onward = page.locator('main footer button')
    await expect(onward).toHaveText(/^Continue/)
    await onward.click()
    await expect(page).toHaveURL(PROJECT)
  })
})

test.describe('02 · Onboarding · layout', () => {
  test('reflows at 320px with no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(NARROW)
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  })

  test('keeps the prompts from piling on top of one another', async ({ page }) => {
    for (const size of [NARROW, PHONE, { width: 1440, height: 900 }]) {
      await page.setViewportSize(size)
      await page.goto('/onboarding')
      await page.waitForLoadState('networkidle')

      const overlaps = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll('main ul li')].map(el => el.getBoundingClientRect())
        return boxes.filter((box, index) =>
          index < boxes.length - 1 && box.bottom > boxes[index + 1]!.top + 6,
        ).length
      })
      expect(overlaps, `at ${size.width}×${size.height}`).toBe(0)
    }
  })

  test('can be stepped through backwards', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    const steps = page.locator('nav[aria-label="Onboarding progress"] a')
    await expect(steps).toHaveCount(3)
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step')

    // Every dot is a 24px target, the smallest WCAG 2.2 allows for a pointer.
    for (const box of await steps.all()) {
      const rect = await box.boundingBox()
      expect(rect!.width).toBeGreaterThanOrEqual(24)
      expect(rect!.height).toBeGreaterThanOrEqual(24)
    }

    await steps.first().click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('takes the orb out of compositing the moment a route change starts', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')
    await page.locator('main canvas').waitFor()

    const canvas = page.locator('main canvas')
    await expect(canvas).toHaveCSS('visibility', 'visible')

    // A route change rebuilds the page's compositor layers, and a WebGL canvas
    // caught in that rebuild is presented before it is painted — a full-width
    // white flash across the orb, measured at 51% of the frame blown out.
    // Hiding it costs nothing because the page is already leaving.
    //
    // Opacity is not enough: a canvas faded to zero is still composited and the
    // flash comes straight back. It has to leave painting altogether.
    await page.locator('nav[aria-label="Onboarding progress"] a').first().click()
    await expect(canvas).toHaveCSS('visibility', 'hidden')
  })

  test('is operable by keyboard alone', async ({ page }) => {
    // WebKit only tabs to links when "Press Tab to highlight each item" is on,
    // which is an OS setting rather than anything the page controls.
    test.skip(test.info().project.name === 'mobile-safari', 'WebKit excludes links from tab order by default')
    await page.setViewportSize(PHONE)
    await page.goto('/onboarding')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /Privacy Policy/ })).toBeFocused()
    await page.keyboard.press('Tab')
    // The page's own Skip, not the skip-to-content link in the app shell.
    await expect(page.locator('main footer > a')).toBeFocused()

    // The pager is real navigation, so its three steps sit in the tab order.
    const steps = page.locator('nav[aria-label="Onboarding progress"] a')
    for (let index = 0; index < 3; index++) {
      await page.keyboard.press('Tab')
      await expect(steps.nth(index)).toBeFocused()
    }

    await page.keyboard.press('Tab')
    await expect(page.locator('main footer button')).toBeFocused()
  })
})
