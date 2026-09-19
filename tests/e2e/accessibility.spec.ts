import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * WCAG 2.2 AA, checked by machine.
 *
 * Automated testing catches perhaps a third of what matters — it cannot tell
 * whether a label is honest or an order makes sense — so this runs alongside
 * the keyboard and screen-reader assertions in the other suites rather than
 * instead of them. What it does catch, it catches everywhere and for free.
 *
 * Zero violations is the bar. A rule is never disabled to make a screen pass;
 * if something here goes red, the screen is wrong.
 */

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }
const FEED = '/project/berkeley-square-north'

const SCREENS = [
  { name: 'splash', path: '/' },
  { name: 'onboarding', path: '/onboarding' },
  { name: 'first words', path: '/ask' },
  { name: 'the feed', path: FEED },
  { name: 'the answer deck', path: `${FEED}/answer` },
  { name: 'privacy', path: '/privacy' },
] as const

const scan = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()

/** Enough detail in the failure to fix it without rerunning anything. */
const describe = (violations: Awaited<ReturnType<typeof scan>>['violations']) =>
  violations
    .map(v => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map(n => n.target.join(' ')).join('\n    ')}`)
    .join('\n')

for (const screen of SCREENS) {
  test.describe(`a11y · ${screen.name}`, () => {
    for (const [label, size] of [['on a phone', PHONE], ['on a desktop', DESKTOP]] as const) {
      test(`has no violations ${label}`, async ({ page }) => {
        await page.setViewportSize(size)
        await page.goto(screen.path)
        await page.waitForLoadState('networkidle')
        // The screens fetch after paint; scanning a skeleton scans nothing.
        await page.waitForTimeout(1200)

        const { violations } = await scan(page)
        expect(describe(violations), `${screen.name} ${label}`).toBe('')
      })
    }
  })
}

test.describe('a11y · the states, not just the happy path', () => {
  test('the booking form, open and complaining', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(FEED)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /book appointment/i }).click()
    await page.waitForTimeout(900)
    // Submit empty, so the scan sees the error state rather than a clean form.
    await page.locator('main form button[type="submit"]').click()
    await page.waitForTimeout(400)

    const { violations } = await scan(page)
    expect(describe(violations)).toBe('')
  })

  test('a failed briefing', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(`${FEED}?fail=server`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    const { violations } = await scan(page)
    expect(describe(violations)).toBe('')
  })

  test('an empty briefing', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(`${FEED}?fail=empty`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    const { violations } = await scan(page)
    expect(describe(violations)).toBe('')
  })
})
