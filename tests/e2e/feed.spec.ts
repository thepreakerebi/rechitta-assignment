import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 03 · The project feed.
 *
 * Seven full-bleed chapters between Rechitta's greeting and the one thing the
 * briefing asks for. The tests cover what the comp cannot: that the stack is
 * genuinely one scroll with nothing between the cards, that the greeting says
 * something before it says a name, and that a failed briefing is recoverable
 * without losing the page.
 */

const PHONE = { width: 390, height: 844 }
const NARROW = { width: 320, height: 640 }
const DESKTOP = { width: 1440, height: 900 }
const FEED = '/project/berkeley-square-north'

const open = async (page: Page, path: string, size = PHONE) => {
  await page.setViewportSize(size)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

const cards = (page: Page) => page.locator('main article')

test.describe('03 · Feed', () => {
  test('tells the story in seven chapters, in order', async ({ page }) => {
    await open(page, FEED)

    await expect(cards(page)).toHaveCount(7)
    await expect(page.getByRole('heading', { level: 2, name: 'Berkeley Square North' })).toBeVisible()
    await expect(cards(page).last().getByRole('heading', { level: 2 })).toHaveText('The Life Here')

    // The comp repeated the Returns card's metric on Amenities, putting a
    // rental yield under a heading about the podium gardens.
    await expect(cards(page).last()).not.toContainText('12.73%')
  })

  test('every chapter names its place in the sequence', async ({ page }) => {
    await open(page, FEED)

    // The eyebrow alone does not say "third of seven".
    await expect(page.getByText('— chapter 1 of 7')).toBeAttached()
    await expect(page.getByText('— chapter 7 of 7')).toBeAttached()
  })

  test('is one continuous scroll, with nothing between the cards', async ({ page }) => {
    await open(page, FEED)

    const gaps = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('main article')].map(el => el.getBoundingClientRect())
      return boxes.slice(1).map((box, i) => Math.round(box.top - boxes[i]!.bottom))
    })

    // Edge to edge: a photograph with a margin round it reads as a thumbnail.
    expect(gaps.every(gap => gap === 0), `gaps were ${gaps.join(', ')}`).toBe(true)
  })

  test('every photograph carries a real alt, and the decoration carries none', async ({ page }) => {
    await open(page, FEED)

    for (const hero of await page.locator('main article > img').all()) {
      expect((await hero.getAttribute('alt'))?.length ?? 0).toBeGreaterThan(20)
    }

    // The arrow badge repeats nothing and means nothing on its own.
    for (const mark of await page.locator('main article hgroup img').all()) {
      await expect(mark).toHaveAttribute('alt', '')
    }
  })

  test('only the first photograph is fetched eagerly', async ({ page }) => {
    await open(page, FEED)

    const heroes = page.locator('main article > img')
    await expect(heroes.first()).toHaveAttribute('loading', 'eager')
    await expect(heroes.nth(1)).toHaveAttribute('loading', 'lazy')
    await expect(heroes.last()).toHaveAttribute('loading', 'lazy')
  })
})

test.describe('03 · Feed · the greeting', () => {
  test('introduces her, and does not greet a name it does not have', async ({ page }) => {
    await open(page, FEED)

    await expect(page.getByText('Welcome')).toBeVisible()
    await expect(page.locator('main header figcaption')).toContainText(/Hello Aryaman! I’m Rechitta|Hello Aryaman! I'm Rechitta/)
    await expect(page.locator('main header')).not.toContainText(/undefined|null/)
  })

  test('the orb is here but never listening', async ({ page, context }) => {
    await context.clearPermissions()

    // Count any attempt to open the device. A briefing is not a conversation:
    // nobody asked to speak, so nothing may reach for the microphone.
    await page.addInitScript(() => {
      const state = { calls: 0 }
      Object.defineProperty(window, '__mic', { get: () => state })
      const real = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
      if (real) {
        navigator.mediaDevices.getUserMedia = (c) => { state.calls += 1; return real(c) }
      }
    })

    await open(page, FEED)
    await expect(page.locator('main header canvas')).toBeVisible()
    await page.waitForTimeout(1200)

    const calls = await page.evaluate(() => (window as unknown as { __mic: { calls: number } }).__mic.calls)
    expect(calls).toBe(0)
  })

  test('the whole orb shows, with nothing painting a box around it', async ({ page }) => {
    await open(page, FEED, DESKTOP)

    // The greeting used to dissolve the orb with two multiply washes sized to
    // the orb's block rather than the page. Multiplying a near-black over a
    // near-black darkens it, so the wash drew a visible rectangle around the
    // orb and cut its lower half off. Nothing here may darken a region of the
    // page that is narrower than the page.
    const offenders = await page.locator('main header *').evaluateAll(nodes =>
      nodes.filter((node) => {
        const blend = getComputedStyle(node).mixBlendMode
        return blend === 'multiply' || blend === 'darken'
      }).length,
    )
    expect(offenders).toBe(0)
  })

  test('the orb is half swallowed by the page, without a box around it', async ({ page }) => {
    for (const size of [PHONE, DESKTOP]) {
      await open(page, FEED, size)

      const m = await page.evaluate(() => {
        const stage = document.querySelector('main header .stage') as HTMLElement
        const mask = getComputedStyle(stage, '::after')
        const hero = document.querySelector('main header')!.getBoundingClientRect()
        return {
          hasGradient: mask.backgroundImage.includes('gradient'),
          maskWidth: Number.parseFloat(mask.width),
          stageWidth: stage.getBoundingClientRect().width,
          heroWidth: hero.width,
        }
      })

      // Half the orb is meant to sink into the page, so the gradient exists.
      expect(m.hasGradient, `at ${size.width}`).toBe(true)

      // And it runs past the whole header, not just the group. Sized to the
      // group it painted a dark rectangle the width of the group — the black
      // box around the orb.
      expect(m.maskWidth, `at ${size.width}`).toBeGreaterThan(m.heroWidth)
      expect(m.maskWidth).toBeGreaterThan(m.stageWidth)
    }
  })

  test('the buttons straddle the seam onto the first chapter', async ({ page }) => {
    for (const size of [PHONE, DESKTOP]) {
      await open(page, FEED, size)

      const m = await page.evaluate(() => {
        const hero = document.querySelector('main header')!.getBoundingClientRect()
        const discs = document.querySelector('main header nav')!.getBoundingClientRect()
        return { heroBottom: hero.bottom, top: discs.top, bottom: discs.bottom }
      })

      // Half on the greeting, half on the photograph below it, as the comp
      // draws them — which means the header must not clip its own children.
      expect(m.top, `at ${size.width}`).toBeLessThan(m.heroBottom)
      expect(m.bottom, `at ${size.width}`).toBeGreaterThan(m.heroBottom)
    }
  })

  test('the greeting is as tall as its words, at every width', async ({ page }) => {
    for (const size of [NARROW, PHONE, { width: 1024, height: 900 }, DESKTOP]) {
      await open(page, FEED, size)

      const { header, orb } = await page.evaluate(() => ({
        header: document.querySelector('main header')!.getBoundingClientRect().height,
        orb: document.querySelector('main header canvas')!.getBoundingClientRect().width,
      }))

      // The room above the words is a share of the orb, so the block stays in
      // proportion to it. Written as a percentage it measured the full-width
      // header instead, and a desktop window opened 600px of empty space
      // between the orb and the greeting.
      expect(header, `at ${size.width}×${size.height}`).toBeLessThan(orb * 2.2)
    }
  })

  test('the buttons sit below the greeting, never through it', async ({ page }) => {
    for (const size of [NARROW, PHONE, { width: 1024, height: 900 }, DESKTOP]) {
      await open(page, FEED, size)

      const boxes = await page.evaluate(() => {
        const speech = document.querySelector('main header figcaption')!.getBoundingClientRect()
        const discs = document.querySelector('main header nav')!.getBoundingClientRect()
        return { speechBottom: speech.bottom, discsTop: discs.top }
      })

      // Placed absolutely, the buttons had no way to know how tall the
      // greeting had become — a line more than the guess and the copy ran
      // straight through them.
      expect(boxes.discsTop, `at ${size.width}×${size.height}`)
        .toBeGreaterThanOrEqual(boxes.speechBottom)
    }
  })

  test('both discs are pressable to their edges, not half covered', async ({ page }) => {
    for (const size of [PHONE, DESKTOP]) {
      await open(page, FEED, size)

      // The accordion lays an invisible opener across every panel. At the same
      // z-index it won on document order and covered the lower half of both
      // controls — 45px by 23px to a finger, and looking perfectly fine.
      const covered = await page.evaluate(() =>
        [...document.querySelectorAll('main header nav a')].filter((disc) => {
          const box = disc.getBoundingClientRect()
          // Edge midpoints, not corners: the control is a circle, so its
          // bounding box corners fall outside the button itself and would
          // report every disc as covered.
          const edges: [number, number][] = [
            [box.x + box.width / 2, box.y + 3],
            [box.x + box.width / 2, box.bottom - 3],
            [box.x + 3, box.y + box.height / 2],
            [box.right - 3, box.y + box.height / 2],
          ]
          return edges.some(([x, y]) => !disc.contains(document.elementFromPoint(x, y)))
        }).length)

      expect(covered, `at ${size.width}`).toBe(0)
    }
  })

  test('both discs lead to the conversation', async ({ page }) => {
    await open(page, FEED)

    const discs = page.locator('main header nav[aria-label="Talk to Rechitta"] a')
    await expect(discs).toHaveCount(2)

    for (const disc of await discs.all()) {
      // Two doors into one room: the deck is where her answer is and where the
      // next question gets asked.
      await expect(disc).toHaveAttribute('href', new RegExp(`${FEED}/answer`))
      const box = (await disc.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }

    // Each has a name, because two identical circles otherwise read as "link".
    await expect(discs.first()).toHaveAccessibleName(/read rechitta’s answer/i)
    await expect(discs.last()).toHaveAccessibleName(/out loud/i)
  })
})

test.describe('03 · Feed · states', () => {
  test('skeletons stand in for the cards, never the word Loading', async ({ page }) => {
    // Deliberately not waiting for the network to settle: waiting for the
    // briefing to arrive is waiting for the skeleton to be replaced.
    await page.setViewportSize(PHONE)
    await page.goto(`${FEED}?latency=2000`)

    const slots = page.locator('main ul[aria-busy="true"] li.skeleton')
    await expect(slots.first()).toBeVisible()
    await expect(page.locator('main')).not.toContainText(/loading/i)

    await expect(cards(page)).toHaveCount(7, { timeout: 20_000 })
  })

  test('a failed briefing keeps the page and offers the way back', async ({ page }) => {
    await open(page, `${FEED}?fail=server`)

    await expect(page.getByRole('heading', { name: /did not load/i })).toBeVisible()
    // The backend's own message never reaches the interface.
    await expect(page.locator('main')).not.toContainText(/500|Internal Server Error/i)
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()

    // The greeting above it still stands — the failure replaced the chapters,
    // not the screen.
    await expect(page.getByText('Welcome')).toBeVisible()
  })

  test('the viewing is still open when there is nothing to show', async ({ page }) => {
    await open(page, `${FEED}?fail=empty`)

    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText(/no chapters yet/i)).toBeVisible()
    // The ask survives an empty briefing; it is the point of the page.
    await expect(page.getByRole('button', { name: /book appointment/i })).toBeVisible()
  })
})

test.describe('03 · Feed · the viewing request', () => {
  test('closes on the ask, and the ask goes somewhere', async ({ page }) => {
    await open(page, FEED)

    const request = page.getByRole('region', { name: /schedule private viewing/i })
    await expect(request).toBeVisible()
    await expect(request).toContainText('Berkeley Square North')

    // It opens in place rather than navigating: the briefing is the argument
    // for booking, and leaving it asks someone to carry that in their head.
    const book = page.getByRole('button', { name: /book appointment/i })
    await book.click()
    await expect(page).toHaveURL(new RegExp(`${FEED}$`))
    await expect(page.getByLabel('Your name')).toBeVisible()
  })
})

test.describe('03 · Feed · the accordion', () => {
  const panels = (page: Page) => page.locator('main .panel')
  const openers = (page: Page) => page.locator('main .panel button')

  test('lays the chapters side by side, one of them open', async ({ page }) => {
    await open(page, FEED, DESKTOP)

    const boxes = await panels(page).evaluateAll(list =>
      list.map(el => el.getBoundingClientRect().width))

    expect(boxes).toHaveLength(7)
    // One wide panel, the rest squeezed into strips.
    expect(Math.max(...boxes)).toBeGreaterThan(Math.min(...boxes) * 4)
    await expect(openers(page).first()).toHaveAttribute('aria-expanded', 'true')
  })

  test('clicking a strip opens it, and closes the one that was open', async ({ page }) => {
    await open(page, FEED, DESKTOP)

    const widthOf = (i: number) =>
      panels(page).nth(i).evaluate(el => el.getBoundingClientRect().width)

    await openers(page).nth(3).click()

    await expect(openers(page).nth(3)).toHaveAttribute('aria-expanded', 'true')
    await expect(openers(page).first()).toHaveAttribute('aria-expanded', 'false')
    await expect.poll(() => widthOf(3)).toBeGreaterThan(400)
    await expect.poll(() => widthOf(0)).toBeLessThan(200)
  })

  test('the open panel shows its story; a strip shows its spine instead', async ({ page }) => {
    await open(page, FEED, DESKTOP)

    // The footer would break mid-word in a strip, so it fades out there.
    const footers = page.locator('main .panel article > footer')
    await expect(footers.first()).toHaveCSS('opacity', '1')
    await expect(footers.nth(1)).toHaveCSS('opacity', '0')

    // The spine repeats the heading, so it is decoration to a screen reader.
    const spine = panels(page).nth(1).locator('.spine')
    await expect(spine).toHaveAttribute('aria-hidden', 'true')
    await expect(spine).toHaveText('Dubai 2040')
  })

  test('walks on the arrow keys, and leaves the browser its own', async ({ page }) => {
    await open(page, FEED, DESKTOP)

    await openers(page).first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(openers(page).nth(1)).toHaveAttribute('aria-expanded', 'true')
    await expect(openers(page).nth(1)).toBeFocused()

    await page.keyboard.press('ArrowLeft')
    await expect(openers(page).first()).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('End')
    await expect(openers(page).last()).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Home')
    await expect(openers(page).first()).toHaveAttribute('aria-expanded', 'true')

    // Alt+Left is Back. Taking it would be worse than offering nothing.
    await page.keyboard.press('Alt+ArrowRight')
    await expect(openers(page).first()).toHaveAttribute('aria-expanded', 'true')
  })

  test('stops at both ends rather than wrapping', async ({ page }) => {
    await open(page, FEED, DESKTOP)

    await openers(page).first().focus()
    await page.keyboard.press('ArrowLeft')
    await expect(openers(page).first()).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('End')
    await page.keyboard.press('ArrowRight')
    await expect(openers(page).last()).toHaveAttribute('aria-expanded', 'true')
  })

  test('every opener says which chapter it opens', async ({ page }) => {
    await open(page, FEED, DESKTOP)

    // Seven identical panels would otherwise all be announced as "button".
    await expect(openers(page).nth(2)).toHaveAccessibleName(/chapter 3 of 7.*Jumeirah Village Circle/i)
  })

  test('the accordion does not exist on a phone', async ({ page }) => {
    await open(page, FEED)

    // Its controls must not be focusable where they have no effect, or the
    // stack gains seven invisible tab stops.
    await expect(openers(page)).toHaveCount(7)
    for (const opener of await openers(page).all()) {
      await expect(opener).toBeHidden()
    }
  })
})

test.describe('03 · Feed · headings', () => {
  test('every screen has exactly one h1, and skips no level', async ({ page }) => {
    for (const path of ['/', '/onboarding', '/ask', FEED, `${FEED}/answer`, '/privacy']) {
      await page.setViewportSize(PHONE)
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
          .map(heading => Number(heading.tagName[1])))

      expect(levels.filter(level => level === 1).length, `h1 count on ${path}`).toBe(1)

      // No jump of more than one level on the way down the document.
      let deepest = 0
      for (const level of levels) {
        if (deepest !== 0) expect(level, `level jump on ${path}`).toBeLessThanOrEqual(deepest + 1)
        deepest = Math.max(deepest, level)
      }
    }
  })
})

test.describe('03 · Feed · layout', () => {
  test('reflows at 320px with no horizontal scroll', async ({ page }) => {
    await open(page, FEED, NARROW)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  })

  test('holds together from a narrow phone to a wide desktop', async ({ page }) => {
    for (const size of [NARROW, PHONE, { width: 1440, height: 900 }]) {
      await open(page, FEED, size)
      const spills = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      expect(spills, `at ${size.width}×${size.height}`).toBe(false)
    }
  })
})
