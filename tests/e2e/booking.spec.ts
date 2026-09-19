import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Booking a viewing.
 *
 * The one thing the whole briefing is asking for, and the only place on the
 * feed that wants something back. It opens in place rather than navigating,
 * because the briefing is the argument for booking and taking someone away
 * from it asks them to carry that argument in their head.
 *
 * There is no comp for this: the design stops at the button. So the tests are
 * about the behaviour the brief does name — every state reachable, nothing
 * disabled without a visible reason, and the server never leaking through.
 */

const PHONE = { width: 390, height: 844 }
const FEED = '/project/berkeley-square-north'

const open = async (page: Page, query = '') => {
  await page.setViewportSize(PHONE)
  await page.goto(FEED + query)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /book appointment/i }).click()
}

const cta = (page: Page) => page.locator('main form button[type="submit"]')
const toast = (page: Page) => page.locator('output.toast')
const problems = (page: Page) => page.locator('main form output.problems')

const fill = async (page: Page, over: { name?: string, email?: string, slot?: boolean } = {}) => {
  if (over.slot !== false) await page.locator('main label.chip:not(.is-taken)').first().click()
  await page.getByLabel('Your name').fill(over.name ?? 'Aryaman Shah')
  await page.getByLabel('Email').fill(over.email ?? 'aryaman@example.com')
}

test.describe('Booking · opening', () => {
  test('the card opens in place, and the button becomes the one that confirms', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(FEED)
    await page.waitForLoadState('networkidle')

    const button = page.getByRole('button', { name: /book appointment/i })
    const panel = page.locator('main form fieldset.disclosure')

    await expect(button).toHaveAttribute('aria-expanded', 'false')
    // Closed, the disclosure is a zero-height row. Its fields are still in the
    // document — clipped, not removed — so they are held inert rather than
    // left as invisible tab stops.
    await expect(panel).toHaveAttribute('inert', '')
    expect((await panel.boundingBox())!.height).toBeLessThan(2)

    // Measured against the card, not the viewport: the card sits at the foot of
    // a four-thousand-pixel page, so opening it moves the page as well as the
    // button and viewport coordinates say nothing.
    const offset = () => page.evaluate(() => {
      const card = document.querySelector('main section[aria-labelledby="viewing-heading"]')!
      const cta = document.querySelector('main form button[type="submit"]')!
      return cta.getBoundingClientRect().top - card.getBoundingClientRect().top
    })

    const before = await offset()
    await button.click()

    // Same control, new job, pushed down by exactly the room the fields need.
    await expect(cta(page)).toHaveText(/Confirm booking/)
    await expect(cta(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(panel).not.toHaveAttribute('inert', '')
    await expect.poll(async () => (await panel.boundingBox())!.height).toBeGreaterThan(200)
    await expect.poll(offset).toBeGreaterThan(before + 200)

    // And it stayed on the feed rather than navigating away from the argument.
    await expect(page).toHaveURL(new RegExp(`${FEED}$`))
  })

  test('opening does not submit the form it just revealed', async ({ page }) => {
    await open(page)

    // The button used to be type=button when closed and type=submit when open.
    // Vue flushes in a microtask, which runs before the browser carries out the
    // click — so the click that opened the form also submitted it, and the
    // empty form came up pre-scolded.
    await expect(problems(page)).toBeEmpty()
    await expect(page.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'false')
  })

  test('the times are not fetched until they are asked for', async ({ page }) => {
    const calls: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/appointments/slots')) calls.push(request.url())
    })

    await page.setViewportSize(PHONE)
    await page.goto(FEED)
    await page.waitForLoadState('networkidle')

    // They are the bottom of a four-thousand-pixel page; most visitors never
    // reach them.
    expect(calls).toHaveLength(0)

    await page.getByRole('button', { name: /book appointment/i }).click()
    await expect.poll(() => calls.length).toBe(1)
  })
})

test.describe('Booking · closing', () => {
  const dismiss = (page: Page) => page.getByRole('button', { name: /not now/i })

  test('offers a way out only once there is something to close', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(FEED)
    await page.waitForLoadState('networkidle')

    await expect(dismiss(page)).toHaveCount(0)
    await page.getByRole('button', { name: /book appointment/i }).click()
    await expect(dismiss(page)).toBeVisible()
  })

  test('closes the form and gives the button its first job back', async ({ page }) => {
    await open(page)
    const panel = page.locator('main form fieldset.disclosure')

    await dismiss(page).click()

    await expect(cta(page)).toHaveText(/Book Appointment/)
    await expect(cta(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(panel).toHaveAttribute('inert', '')
    await expect.poll(async () => (await panel.boundingBox())!.height).toBeLessThan(2)
    await expect(dismiss(page)).toHaveCount(0)
  })

  test('escape closes it too, from wherever focus happens to be', async ({ page }) => {
    await open(page)

    await page.getByLabel('Your name').fill('Aryaman Shah')
    await page.keyboard.press('Escape')

    await expect(cta(page)).toHaveText(/Book Appointment/)
  })

  test('keeps what was typed, and drops the telling-off', async ({ page }) => {
    await open(page)
    await fill(page, { email: 'not-an-address' })
    await cta(page).click()
    await expect(problems(page)).toContainText(/email address does not look right/)

    await dismiss(page).click()
    await page.getByRole('button', { name: /book appointment/i }).click()

    // Hesitating is not a reason to lose your own name.
    await expect(page.getByLabel('Your name')).toHaveValue('Aryaman Shah')
    // But being told off again for a form you never sent is worse than nothing.
    await expect(problems(page)).toBeEmpty()
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'false')
  })

  test('hands focus back rather than stranding it on an inert fieldset', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile-safari', 'WebKit excludes some controls from tab order by default')
    await open(page)

    await page.getByLabel('Email').focus()
    await page.keyboard.press('Escape')

    await expect(cta(page)).toBeFocused()
  })
})

test.describe('Booking · the form', () => {
  test('labels every field properly, and never as a placeholder', async ({ page }) => {
    await open(page)

    for (const field of [page.getByLabel('Your name'), page.getByLabel('Email')]) {
      await expect(field).toBeVisible()
      await expect(field).not.toHaveAttribute('placeholder')
    }

    // Helper text sits between the label and the control.
    await expect(page.getByText(/Whoever will be meeting us at the door/)).toBeVisible()
    await expect(page.getByText(/We send the confirmation and the directions here/)).toBeVisible()
  })

  test('labels every field the same way, times included', async ({ page }) => {
    await open(page)

    const styles = await page.evaluate(() => {
      const read = (el: Element) => {
        const s = getComputedStyle(el)
        return [s.fontFamily, s.fontSize, s.fontWeight, s.color, s.textTransform, s.letterSpacing].join('|')
      }
      const form = document.querySelector('main form')!
      return {
        legend: read(form.querySelector('fieldset.slots legend')!),
        labels: [...form.querySelectorAll('.field label')].map(read),
        legendHelp: read(form.querySelector('fieldset.slots .help')!),
        helps: [...form.querySelectorAll('.field small')].map(read),
      }
    })

    // A group of times is a field like any other. Set as an eyebrow it read as
    // a section heading above the form rather than the label of the control
    // under it.
    for (const label of styles.labels) expect(styles.legend).toBe(label)
    for (const help of styles.helps) expect(styles.legendHelp).toBe(help)
  })

  test('a taken time says so on itself, not in a tooltip', async ({ page }) => {
    await open(page)

    const taken = page.locator('main label.chip.is-taken')
    await expect(taken).toHaveCount(1)
    // Nobody on a tablet ever sees a title attribute.
    await expect(taken).toContainText(/taken/i)
    await expect(taken.locator('input')).toBeDisabled()
  })

  test('waits to be asked before it says anything is wrong', async ({ page }) => {
    await open(page)

    await expect(problems(page)).toBeEmpty()
    await page.getByLabel('Your name').fill('A')
    await expect(problems(page)).toBeEmpty()

    await cta(page).click()
    await expect(problems(page)).toContainText(/Choose a time from the list/)
  })

  test('sends focus to the first field that is wrong', async ({ page }) => {
    await open(page)
    await fill(page, { name: '' })

    await cta(page).click()

    // Sending someone back to the top to hunt for it is the same as not saying.
    await expect(page.getByLabel('Your name')).toBeFocused()
    await expect(page.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'true')
  })

  test('clears a complaint the moment it is answered', async ({ page }) => {
    await open(page)
    await fill(page, { email: 'not-an-address' })
    await cta(page).click()

    await expect(problems(page)).toContainText(/email address does not look right/)
    await page.getByLabel('Email').fill('aryaman@example.com')
    await expect(problems(page)).toBeEmpty()
  })

  test('is operable by keyboard alone, times included', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile-safari', 'WebKit excludes some controls from tab order by default')
    await open(page)

    // A native radio group, so the arrows work without a line of script.
    const first = page.locator('main label.chip:not(.is-taken) input').first()
    await first.focus()
    await page.keyboard.press('ArrowDown')
    await expect(first).not.toBeChecked()

    // The chip wears the focus ring, because a ring on a 1px input is invisible.
    const chip = page.locator('main label.chip').nth(1)
    expect(Number.parseFloat(await chip.evaluate(el => getComputedStyle(el).outlineWidth)))
      .toBeGreaterThanOrEqual(2)
  })
})

test.describe('Booking · states', () => {
  test('skeletons stand in for the times, never the word Loading', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(`${FEED}?latency=1500`)
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /book appointment/i }).click()

    await expect(page.locator('main form ul[aria-busy="true"] i.skeleton').first()).toBeVisible()
    await expect(page.locator('main form')).not.toContainText(/loading/i)
    await expect(page.locator('main label.chip').first()).toBeVisible({ timeout: 20_000 })
  })

  test('a fully booked week says what to do instead', async ({ page }) => {
    await open(page, '?fail=empty')

    await expect(page.locator('main label.chip')).toHaveCount(0)
    await expect(page.getByText(/Every viewing this week is taken/)).toBeVisible()
    // An empty state that only says "empty" is a shrug.
    await expect(page.getByRole('link', { name: /viewings@rechitta.com/ })).toBeVisible()
  })

  test('confirms with a toast and the reference they will be asked for', async ({ page }) => {
    await open(page)
    await fill(page)
    await cta(page).click()

    await expect(toast(page)).toContainText(/Viewing confirmed for/)
    await expect(toast(page)).toContainText(/RCH-/)

    // The form has done its job and goes.
    await expect(page.getByRole('heading', { name: /Your viewing is booked/ })).toBeVisible()
    await expect(page.getByLabel('Your name')).toHaveCount(0)
    await expect(page.getByText('aryaman@example.com')).toBeVisible()
    await expect(page.locator('main dl time')).toBeVisible()
  })

  /**
   * Fails the booking itself, leaving the times alone. The `?fail=` switch
   * applies to every route, so using it here would break the slot list and
   * there would be nothing left to book.
   */
  const breakTheBooking = (page: Page, status: number, message: string) =>
    page.route('**/api/appointments**', (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: status, message }),
      })
    })

  test('a failure keeps what was typed and says nothing was reserved', async ({ page }) => {
    await breakTheBooking(page, 500, 'Internal Server Error')
    await open(page)
    await fill(page)
    await cta(page).click()

    await expect(problems(page)).toContainText(/Nothing has been reserved/)
    // The backend's own message must never reach the interface.
    await expect(page.locator('main form')).not.toContainText(/500|Internal Server Error/i)

    // Nothing was thrown away, so trying again is one press.
    await expect(page.getByLabel('Your name')).toHaveValue('Aryaman Shah')
    await expect(cta(page)).toHaveText(/Confirm booking/)
  })

  test('a timeout is handled the same way as a failure', async ({ page }) => {
    await breakTheBooking(page, 504, 'Gateway Timeout')
    await open(page)
    await fill(page)
    await cta(page).click()

    await expect(problems(page)).toContainText(/Nothing has been reserved/)
    await expect(page.locator('main form')).not.toContainText(/504|Gateway/i)
  })

  test('says it is working rather than pretending to be idle', async ({ page }) => {
    await open(page, '?latency=1200')
    await fill(page)
    await cta(page).click()

    await expect(cta(page)).toHaveAttribute('aria-busy', 'true')
    await expect(cta(page)).toBeDisabled()
    await expect(cta(page)).toHaveText(/Confirming…/)
    await expect(toast(page)).toBeVisible({ timeout: 20_000 })
  })
})
