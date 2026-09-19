import { expect, test } from '@playwright/test'

/**
 * The splash, across every state the mock server can put it in.
 *
 * The states are reachable by URL on purpose — a reviewer should be able to see
 * the error screen rather than take its existence on trust, and so should a
 * test.
 */

const PHONE = { width: 390, height: 844 }
const NARROW = { width: 320, height: 640 }

test.describe('01 · Splash', () => {
  test('presents the agent, the advisor and the way forward', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Rechitta')
    await expect(page.getByText('Sara Rahman')).toBeVisible()
    await expect(page.getByText('Prestige Group · Senior Advisor')).toBeVisible()
    await expect(page.getByText('1 new note for you')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Next' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Skip', exact: true })).toBeVisible()
  })

  test('the controls are reachable without scrolling on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/')

    const next = page.getByRole('link', { name: 'Next' })
    const box = await next.boundingBox()

    expect(box).not.toBeNull()
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height)
  })

  test('reflows at 320px with no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(NARROW)
    await page.goto('/')

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflows).toBe(false)
  })

  test('shows the advisor as a skeleton while it loads, not a spinner', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/?latency=3000')

    const card = page.locator('article[aria-busy]')
    await expect(card).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByText('Loading your advisor’s details.')).toBeAttached()
    await expect(page.getByText(/^Loading…$/)).toHaveCount(0)

    await expect(page.getByText('Sara Rahman')).toBeVisible({ timeout: 10_000 })
    await expect(card).toHaveAttribute('aria-busy', 'false')
  })

  test('recovers from a failed advisor without taking the page down', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/?fail=server')

    await expect(page.getByText('Your advisor is not loading')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()

    // The rest of the screen still works — the failure is contained to the card.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Next' })).toBeVisible()
  })

  test('drops the unread dot when there is no note — colour never carries meaning alone', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/?fail=empty')

    await expect(page.getByText('Sara Rahman')).toBeVisible()
    await expect(page.getByText('1 new note for you')).toHaveCount(0)
    await expect(page.locator('main i.bg-alert')).toHaveCount(0)
  })

  test('is operable by keyboard alone', async ({ page }) => {
    // WebKit only tabs to links when "Press Tab to highlight each item" is on,
    // which is an OS setting rather than anything the page controls.
    test.skip(test.info().project.name === 'mobile-safari', 'WebKit excludes links from tab order by default')
    await page.setViewportSize(PHONE)
    await page.goto('/')
    await expect(page.getByText('Sara Rahman')).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('main footer > a').first()).toBeFocused()

    // The pager is real navigation now, so it sits in the tab order between
    // Skip and Next — three steps, each its own link.
    const steps = page.locator('nav[aria-label="Onboarding progress"] a')
    for (let index = 0; index < 3; index++) {
      await page.keyboard.press('Tab')
      await expect(steps.nth(index)).toBeFocused()
    }

    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Next' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/onboarding$/)
  })

  test('announces its step for assistive technology', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/')
    await expect(page.getByText('Step 1 of 3')).toBeAttached()
  })

  test('the mark is alive, and stops dead under reduced motion', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto('/')

    const read = () =>
      page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('.mark')!)
        return `${style.transform}|${style.filter}`
      })

    // The cycle deliberately rests for about a third of its length, so a short
    // sample can legitimately catch no movement. Sample across a full cycle.
    const samples = new Set<string>()
    for (let tick = 0; tick < 13; tick++) {
      samples.add(await read())
      await page.waitForTimeout(600)
    }
    expect(samples.size).toBeGreaterThan(1)

    // And it must come back to square, not drift.
    const squared = [...samples].some(sample => sample.startsWith('matrix3d(1, 0, 0, 0, 0, 1'))
    expect(squared).toBe(true)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await page.waitForTimeout(400)

    const still = await read()
    await page.waitForTimeout(1200)
    expect(await read()).toBe(still)
    expect(still.startsWith('none')).toBe(true)
  })
})
