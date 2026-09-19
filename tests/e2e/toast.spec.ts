import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The permission toast.
 *
 * It replaced a block that sat in the column between the privacy note and the
 * footer, where appearing pushed the whole screen down — a successful press
 * looked like a layout error. So the tests are mostly about the two things
 * that made it worth moving: it must not disturb the page, and it must not
 * take a refusal's instructions away on a timer.
 */

const PHONE = { width: 390, height: 844 }

const toast = (page: Page) => page.locator('main > output')

const open = async (page: Page, path: string) => {
  await page.setViewportSize(PHONE)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

const needsFakeDevice = () =>
  test.skip(test.info().project.name !== 'chromium-mic-granted', 'needs a fake capture device')

test.describe('Permission toast', () => {
  test('says nothing until something has been asked', async ({ page }) => {
    await open(page, '/onboarding')

    // A toast answers an action. On arrival there has been none — including for
    // someone who granted the microphone on an earlier visit.
    await expect(toast(page)).toHaveCount(0)
  })

  test('confirms a grant at the top of the screen, clear of the heading', async ({ page, context }) => {
    needsFakeDevice()
    await context.clearPermissions()
    await open(page, '/onboarding')

    await page.getByRole('button', { name: /allow microphone/i }).click()
    await expect(toast(page)).toContainText(/microphone connected/i, { timeout: 20_000 })

    const box = (await toast(page).boundingBox())!
    const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!

    // Top of the screen, horizontally centred, and above the page title rather
    // than across it.
    expect(box.y).toBeLessThan(60)
    expect(Math.abs((box.x + box.width / 2) - PHONE.width / 2)).toBeLessThan(2)
    // A heading's box starts above its cap height by half the leading, so a few
    // pixels of overlap with the box is still clear of the letters.
    expect(box.y + box.height).toBeLessThanOrEqual(heading.y + 8)
  })

  test('does not move the page it sits over', async ({ page, context }) => {
    needsFakeDevice()
    await context.clearPermissions()
    await open(page, '/onboarding')

    const footer = page.locator('main footer')
    const before = (await footer.boundingBox())!

    await page.getByRole('button', { name: /allow microphone/i }).click()
    await expect(toast(page)).toBeVisible({ timeout: 20_000 })

    // The whole reason it is a toast: nothing below it shifts.
    const after = (await footer.boundingBox())!
    expect(Math.round(after.y)).toBe(Math.round(before.y))
  })

  test('can be dismissed by hand, and by keyboard', async ({ page, context }) => {
    needsFakeDevice()
    await context.clearPermissions()
    await open(page, '/onboarding')

    await page.getByRole('button', { name: /allow microphone/i }).click()
    await expect(toast(page)).toBeVisible({ timeout: 20_000 })

    const dismiss = page.getByRole('button', { name: /dismiss this message/i })
    await expect(dismiss).toBeVisible()

    // A 24px target is the smallest WCAG 2.2 allows for a pointer.
    const box = (await dismiss.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(24)
    expect(box.height).toBeGreaterThanOrEqual(24)

    await dismiss.focus()
    await page.keyboard.press('Enter')
    await expect(toast(page)).toHaveCount(0)
  })

  test('a refusal keeps its instructions instead of timing out', async ({ page, context }) => {
    test.skip(test.info().project.name === 'chromium-mic-granted', 'that project cannot refuse')
    await context.clearPermissions()
    await open(page, '/onboarding')

    const ask = page.getByRole('button', { name: /allow microphone/i })
    await expect(ask.or(toast(page)).first()).toBeVisible({ timeout: 20_000 })
    if (await ask.isVisible()) await ask.click()

    await expect(toast(page)).toBeVisible({ timeout: 20_000 })
    await expect(toast(page)).toContainText(/microphone/i)

    // The copy tells you how to undo it. Taking that away on a clock means
    // reading fast, or pressing again to get it back.
    await page.waitForTimeout(8_000)
    await expect(toast(page)).toBeVisible()
  })

  test('a refusal explains itself once, then stops standing in the way', async ({ page, context }) => {
    test.skip(test.info().project.name === 'chromium-mic-granted', 'that project cannot refuse')
    await context.clearPermissions()
    await open(page, '/onboarding')

    const onward = page.locator('main footer button')
    const ask = page.getByRole('button', { name: /allow microphone/i })
    await expect(ask.or(toast(page)).first()).toBeVisible({ timeout: 20_000 })
    if (await ask.isVisible()) await ask.click()

    await expect(toast(page)).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/onboarding$/)

    // Voice was never a gate.
    await onward.click()
    await expect(page).toHaveURL(/\/ask$/)
  })
})
