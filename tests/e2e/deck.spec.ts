import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 04 · The answer deck.
 *
 * The conversation, not a report: the header carries the question it is
 * answering and the microphone to ask another. Every way in lands here — a
 * chapter's arrow, either control under the greeting — and what differs is the
 * question it arrives with.
 */

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }
const FEED = '/project/berkeley-square-north'
const DECK = `${FEED}/answer`

const open = async (page: Page, path = DECK, size = PHONE) => {
  await page.setViewportSize(size)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

const dots = (page: Page) => page.locator('main nav[aria-label="Answer panels"] button')
const panels = (page: Page) => page.locator('main .slide')
const asked = (page: Page) => page.locator('main header h1')

test.describe('04 · Deck', () => {
  test('opens on her answer, and invites the question rather than quoting one', async ({ page }) => {
    await open(page)

    // Arrived at without a question, the line asks for one: nobody has said
    // anything yet, and a quotation with no speaker in it is a fiction. Her
    // opening answer is on screen all the same.
    await expect(asked(page)).toContainText(/mic to speak/i)
    await expect(asked(page).locator('q')).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 2, name: /The overview/i })).toBeVisible()

    // The opening question is the whole briefing: seven chapters, seven panels.
    await expect(panels(page)).toHaveCount(7)
    await expect(dots(page)).toHaveCount(7)
  })

  test('titles every panel for what it is about, not for the shape it takes', async ({ page }) => {
    await open(page)

    /*
     * Three shapes of panel are not three things to say. Titled by kind, every
     * grid of figures read "Project overview" — over the commute times, over
     * the yields, and over the amenity deck.
     */
    const titles = await page.locator('main .slide h2').allInnerTexts()

    expect(titles).toHaveLength(7)
    expect(new Set(titles).size).toBe(7)
    expect(titles[2]).toMatch(/Location & connectivity/i)
  })

  test('counts the panels it has rather than always drawing seven', async ({ page }) => {
    // A narrower question earns fewer: the schedule and the arithmetic behind
    // it, not a tour of the gardens.
    await open(page, `${DECK}?q=${encodeURIComponent('How does the payment plan work?')}`)

    await expect(asked(page)).toContainText('How does the payment plan work?')
    await expect(panels(page)).toHaveCount(2)
    await expect(dots(page)).toHaveCount(2)
    await expect(page.getByRole('heading', { level: 2, name: /Pricing & payment/i })).toBeVisible()
  })

  test('answers each chapter’s own question, not one answer with seven doors', async ({ page }) => {
    await open(page, `${DECK}?q=${encodeURIComponent('What is nearby, and how long does it take to get there?')}`)

    await expect(page.getByText('Nearest metro')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('Rental ROI')
  })

  test('keeps the figures two by two, and unbroken', async ({ page }) => {
    for (const size of [PHONE, DESKTOP]) {
      await open(page, DECK, size)

      // The first panel's own tiles: every panel is in the DOM at once, so an
      // unscoped count measures seven panels' worth of rows.
      const rows = await page.locator('main .slide:first-child .tile').evaluateAll(tiles =>
        [...new Set(tiles.map(tile => Math.round(tile.getBoundingClientRect().top)))].length)

      // Four figures, two rows of two, as the comp draws them. Left to fit
      // itself the grid found room for three across on a desktop and broke
      // "AED 1.68M" over two lines — and the figures are the point.
      expect(rows, `at ${size.width}`).toBe(2)

      const wraps = await page.locator('main .slide .tile .value').evaluateAll(values =>
        values.filter((el) => {
          const line = Number.parseFloat(getComputedStyle(el).lineHeight)
          return el.getBoundingClientRect().height > line * 1.5
        }).length)
      expect(wraps, `at ${size.width}`).toBe(0)
    }
  })

  test('back goes to the briefing the answer belongs to', async ({ page }) => {
    await open(page)

    await page.getByRole('link', { name: /back to the briefing/i }).click()
    await expect(page).toHaveURL(new RegExp(`${FEED}$`))
  })

  test('never colours a settled instalment without saying so', async ({ page }) => {
    await open(page, `${DECK}?q=${encodeURIComponent('How does the payment plan work?')}`)

    const paid = page.locator('main ol.rows > li').first()
    await expect(paid).toContainText(/Paid/)
  })
})

test.describe('04 · Deck · paging', () => {
  const showing = (page: Page) => page.evaluate(() => {
    const track = document.querySelector('main .track') as HTMLElement
    return Math.round(track.scrollLeft / track.clientWidth)
  })

  test('the dots move between panels, and say which is which', async ({ page }) => {
    await open(page)

    await expect(dots(page).first()).toHaveAttribute('aria-current', 'true')
    await expect(dots(page).first()).toHaveAccessibleName(/panel 1 of 7/i)

    await dots(page).nth(2).click()
    await expect.poll(() => showing(page)).toBe(2)
    await expect(dots(page).nth(2)).toHaveAttribute('aria-current', 'true')
    await expect(dots(page).first()).not.toHaveAttribute('aria-current', 'true')
  })

  test('slides rather than jumps between panels', async ({ page }) => {
    await open(page)

    // scroll-behavior is not inherited, and the track is its own scroll
    // container — so the page's smooth scrolling never reached it and every
    // dot press landed instantly.
    await expect(page.locator('main .track')).toHaveCSS('scroll-behavior', 'smooth')

    const track = page.locator('main .track')
    await dots(page).nth(2).click()

    // Caught in flight: a jump would already be at its destination.
    const midway = await track.evaluate(el => el.scrollLeft)
    const destination = await track.evaluate(el => el.clientWidth * 2)
    expect(midway).toBeLessThan(destination)

    await expect.poll(() => showing(page)).toBe(2)
  })

  test('walks on the arrow keys from anywhere on the screen', async ({ page }) => {
    await open(page, DECK, DESKTOP)

    // Not only once someone has tabbed onto a scroll container, which would
    // make the shortcut useful only to people who had already found it.
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => showing(page)).toBe(1)

    await page.keyboard.press('ArrowDown')
    await expect.poll(() => showing(page)).toBe(2)

    await page.keyboard.press('ArrowUp')
    await expect.poll(() => showing(page)).toBe(1)

    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => showing(page)).toBe(0)
  })

  test('the arrows still belong to a focused control', async ({ page }) => {
    await open(page, DECK, DESKTOP)

    // The microphone owns its own keys while it has focus.
    await page.locator('main header button').focus()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(400)
    expect(await showing(page)).toBe(0)
  })

  test('stops at both ends rather than wrapping', async ({ page }) => {
    await open(page, DECK, DESKTOP)

    await page.locator('main .track').focus()
    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => showing(page)).toBe(0)

    await page.keyboard.press('ArrowRight')
    await expect.poll(() => showing(page)).toBe(1)

    // Derived, not written down: an answer's length is the mock's to decide.
    const last = (await panels(page).count()) - 1

    await page.keyboard.press('End')
    await expect.poll(() => showing(page)).toBe(last)

    await page.keyboard.press('ArrowRight')
    await expect.poll(() => showing(page)).toBe(last)

    await page.keyboard.press('Home')
    await expect.poll(() => showing(page)).toBe(0)
  })

  test('leaves the browser its own shortcuts', async ({ page }) => {
    await open(page, DECK, DESKTOP)

    await page.locator('main .track').focus()
    await page.keyboard.press('Alt+ArrowRight')
    await expect.poll(() => showing(page)).toBe(0)
  })

  test('a thumb swipes between panels, natively', async ({ page }) => {
    await open(page)

    // The track is a real scroll-snap container, so touch is the browser's job
    // rather than something rebuilt in script. This asserts it is genuinely
    // swipeable — overflowing, snapping, and scrollable by touch.
    const track = await page.locator('main .track').evaluate((el) => {
      const style = getComputedStyle(el)
      return {
        overflowX: style.overflowX,
        snap: style.scrollSnapType,
        touchAction: style.touchAction,
        overflows: el.scrollWidth > el.clientWidth,
      }
    })

    expect(track.overflows).toBe(true)
    expect(track.overflowX).toBe('auto')
    expect(track.snap).toContain('mandatory')
    // Nothing has taken the horizontal gesture away from it.
    expect(['auto', 'pan-x', 'manipulation']).toContain(track.touchAction)
  })

  test('the dots follow a swipe rather than lagging a gesture behind', async ({ page }) => {
    await open(page)

    // The track's scroll is the truth; the dots read it. A ref held as the
    // source of truth would be one gesture behind every swipe.
    await page.evaluate(() => {
      const track = document.querySelector('main .track') as HTMLElement
      track.scrollLeft = track.clientWidth
    })

    await expect.poll(async () => dots(page).nth(1).getAttribute('aria-current')).toBe('true')
  })
})

test.describe('04 · Deck · states', () => {
  test('a skeleton stands in while she thinks, never the word Loading', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(`${DECK}?latency=2000`)

    await expect(page.locator('main [aria-busy="true"] .skeleton')).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/loading/i)
    await expect(panels(page)).toHaveCount(7, { timeout: 20_000 })
  })

  test('a failure keeps the header and offers both ways on', async ({ page }) => {
    await open(page, `${DECK}?fail=server`)

    await expect(page.getByRole('heading', { name: /could not answer/i })).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/500|Internal Server Error/i)
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
    await expect(page.getByRole('link', { name: /back to the briefing/i }).first()).toBeVisible()
  })

  test('has something to say when there is nothing to show', async ({ page }) => {
    await open(page, `${DECK}?fail=empty`)

    await expect(page.getByRole('heading', { name: /nothing to show/i })).toBeVisible()
    await expect(dots(page)).toHaveCount(0)
  })
})

test.describe('04 · Deck · the microphone', () => {
  test('says nothing about a refusal nobody has met yet', async ({ page, context }) => {
    await context.clearPermissions()
    await open(page)

    // A note explaining a refusal belongs to an attempt, and it pushes the
    // header past the height the comp draws it at for news nobody asked for.
    await expect(page.locator('main header output')).toHaveCount(0)
  })

  test('never opens the microphone just because you arrived', async ({ page, context }) => {
    await context.clearPermissions()
    await page.addInitScript(() => {
      const state = { calls: 0 }
      Object.defineProperty(window, '__mic', { get: () => state })
      const real = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
      if (real) navigator.mediaDevices.getUserMedia = (c) => { state.calls += 1; return real(c) }
    })

    // Even arriving primed: a click is spent on the navigation, so opening the
    // device on the other side is a recording nobody started here.
    await open(page, `${DECK}?speak=1`)
    await page.waitForTimeout(1200)

    expect(await page.evaluate(() => (window as unknown as { __mic: { calls: number } }).__mic.calls)).toBe(0)
  })

  test('arriving primed puts the microphone under the keyboard', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile-safari', 'WebKit excludes some controls from tab order by default')
    await open(page, `${DECK}?speak=1`)

    await expect(page.locator('main header button')).toBeFocused()
  })
})

test.describe('04 · Deck · the ways in', () => {
  test('a chapter’s arrow opens the deck at that chapter’s slide', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(FEED)
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: /Open The Plans in Rechitta/i }).click()

    await expect(page).toHaveURL(/\/answer\?panel=panel-plans/)
    // The whole briefing is here, opened in the middle of it.
    await expect(panels(page)).toHaveCount(7)
    await expect(page.getByRole('heading', { level: 2, name: /Pricing & payment/i }))
      .toBeInViewport()
    await expect(dots(page).nth(4)).toHaveAttribute('aria-current', 'true')
  })

  test('opens at the front when the address names a slide this answer has not got', async ({ page }) => {
    await open(page, `${DECK}?panel=panel-nonsense`)

    // A deck opens at the front anyway; a bad name is not worth a failure.
    await expect(dots(page).first()).toHaveAttribute('aria-current', 'true')
    await expect(panels(page)).toHaveCount(7)
  })

  test('both discs lead to the conversation, one of them ready to speak', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(FEED)
    await page.waitForLoadState('networkidle')

    const discs = page.locator('main header nav[aria-label="Talk to Rechitta"] a')
    await expect(discs.first()).toHaveAttribute('href', `${FEED}/answer`)
    await expect(discs.last()).toHaveAttribute('href', `${FEED}/answer?speak=1`)
  })
})
