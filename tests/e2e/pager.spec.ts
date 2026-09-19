import { expect, test } from '@playwright/test'

/**
 * The onboarding pager, across all three screens.
 *
 * The dots are the only way back through the flow, so they are real navigation
 * rather than decoration — and they answer to the keyboard as well as the
 * pointer, from anywhere on the screen.
 */

const PHONE = { width: 390, height: 844 }

const at = {
  splash: /\/$/,
  onboarding: /\/onboarding$/,
  ask: /\/ask$/,
}

type Page = import('@playwright/test').Page

const open = async (page: Page, path: string) => {
  await page.setViewportSize(PHONE)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/**
 * Presses a key and waits for the screen it lands on to be live.
 *
 * Page transitions run out-in, so for a couple of hundred milliseconds the
 * outgoing pager has gone and the incoming one has not arrived. A person cannot
 * press twice inside that window; a test can, and would be measuring the
 * transition rather than the shortcut.
 */
const press = async (page: Page, key: string, url: RegExp) => {
  await page.keyboard.press(key)
  await expect(page).toHaveURL(url)
  // Mid-transition both screens are briefly in the document. One pager means
  // the new screen has settled and owns the keyboard on its own.
  await expect(page.locator('nav[aria-label="Onboarding progress"]')).toHaveCount(1)
}

/**
 * A flick of the thumb, dispatched as the browser would send it. Playwright's
 * touchscreen can tap but not drag, so the pointer events are made by hand —
 * which is also the only way to set `pointerType`, and the handler reads it.
 */
const swipe = (page: Page, direction: 'forward' | 'back', from = { x: 300, y: 500 }) =>
  page.evaluate(({ direction, from }) => {
    const distance = direction === 'forward' ? -140 : 140
    const send = (type: string, x: number, y: number) =>
      document.dispatchEvent(new PointerEvent(type, {
        pointerType: 'touch',
        clientX: x,
        clientY: y,
        bubbles: true,
      }))

    send('pointerdown', from.x, from.y)
    send('pointerup', from.x + distance, from.y + 4)
  }, { direction, from })

test.describe('Onboarding pager · swiping', () => {
  test('a flick of the thumb turns the page, both ways', async ({ page }) => {
    await open(page, '/')

    await swipe(page, 'forward')
    await expect(page).toHaveURL(at.onboarding)
    await expect(page.locator('nav[aria-label="Onboarding progress"]')).toHaveCount(1)

    await swipe(page, 'back')
    await expect(page).toHaveURL(at.splash)
  })

  test('a scroll that drifted sideways is still a scroll', async ({ page }) => {
    await open(page, '/onboarding')

    await page.evaluate(() => {
      const send = (type: string, x: number, y: number) =>
        document.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', clientX: x, clientY: y, bubbles: true }))
      // Twice as far down as across.
      send('pointerdown', 300, 200)
      send('pointerup', 220, 420)
    })

    await expect(page).toHaveURL(at.onboarding)
  })

  test('leaves the edges to the browser’s own back gesture', async ({ page }) => {
    await open(page, '/onboarding')

    // iOS reads a swipe from the very edge as Back. Taking it would mean the
    // page and the browser both answering one gesture.
    await swipe(page, 'back', { x: 6, y: 500 })
    await expect(page).toHaveURL(at.onboarding)
  })

  test('a mouse drag is a selection, not a page turn', async ({ page }) => {
    await open(page, '/onboarding')

    await page.evaluate(() => {
      const send = (type: string, x: number) =>
        document.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', clientX: x, clientY: 500, bubbles: true }))
      send('pointerdown', 300)
      send('pointerup', 120)
    })

    await expect(page).toHaveURL(at.onboarding)
  })

  test('stops at the ends rather than wrapping', async ({ page }) => {
    await open(page, '/')
    await swipe(page, 'back')
    await expect(page).toHaveURL(at.splash)

    await open(page, '/ask')
    await swipe(page, 'forward')
    await expect(page).toHaveURL(at.ask)
  })
})

test.describe('Onboarding pager · keyboard', () => {
  test('moves forward and back on both axes', async ({ page }) => {
    await open(page, '/')

    await press(page, 'ArrowRight', at.onboarding)
    await press(page, 'ArrowDown', at.ask)
    await press(page, 'ArrowLeft', at.onboarding)
    await press(page, 'ArrowUp', at.splash)
  })

  test('stops at both ends rather than wrapping', async ({ page }) => {
    await open(page, '/')

    // There is no step before the first: pressing back must do nothing at all,
    // not loop round to the last screen.
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(at.splash)

    await open(page, '/ask')
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(at.ask)
  })

  test('Home and End reach the ends directly', async ({ page }) => {
    await open(page, '/onboarding')

    await press(page, 'End', at.ask)
    await press(page, 'Home', at.splash)
  })

  test('leaves the browser’s own shortcuts alone', async ({ page }) => {
    await open(page, '/onboarding')

    // Alt+Left is Back. Taking it would be worse than offering nothing.
    await page.keyboard.press('Alt+ArrowLeft')
    await expect(page).toHaveURL(at.onboarding)

    await page.keyboard.press('Shift+ArrowRight')
    await expect(page).toHaveURL(at.onboarding)
  })

  test('does not take the arrows from a focused control', async ({ page }) => {
    await open(page, '/ask')

    // A button owns its own keys while it has focus.
    await page.locator('main footer button').focus()
    await page.keyboard.press('ArrowLeft')
    await expect(page).toHaveURL(at.ask)
  })

  test('works from the dots themselves once they have focus', async ({ page }) => {
    await open(page, '/onboarding')

    await page.locator('nav[aria-label="Onboarding progress"] a').first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(at.ask)
  })

  test('tells assistive technology the shortcut exists', async ({ page }) => {
    await open(page, '/onboarding')

    await expect(page.getByText(/Use the arrow keys, or swipe sideways, to move between the three steps/))
      .toBeAttached()
  })
})
