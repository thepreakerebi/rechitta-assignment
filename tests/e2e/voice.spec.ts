import { expect, test } from '@playwright/test'
import type { Page, Request } from '@playwright/test'

/**
 * 04b · The voice loop.
 *
 * Speaking is the one thing on this site that is genuinely live, so what is
 * tested here is the whole round trip: the microphone is measured, the
 * measurements reach the agent, the agent answers, and she says it out loud.
 *
 * The two ends are tested differently on purpose. The endpoint is exercised
 * directly, because an utterance is data and data can be posted exactly; the
 * screen is exercised through the fake capture device Chromium provides, which
 * is the only honest way to find out whether a real microphone would work.
 */

const PHONE = { width: 390, height: 844 }
const FEED = '/project/berkeley-square-north'
const DECK = `${FEED}/answer`

const open = async (page: Page, path = DECK, size = PHONE) => {
  await page.setViewportSize(size)
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/** Only the project launched with a fake capture device can be granted one. */
const needsFakeDevice = () =>
  test.skip(test.info().project.name !== 'chromium-mic-granted', 'needs a fake capture device')

const mic = (page: Page) => page.locator('main header button.mic')

/** Say something to her: open the microphone, talk, stop. */
const speakTo = async (page: Page, forMs = 2000) => {
  await mic(page).click()
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(forMs)
  await mic(page).click()
}
const caption = (page: Page) => page.locator('main section.spoken')
const sound = (page: Page) => caption(page).locator('button.sound')

/** A well-formed utterance: two seconds, most of it voiced, clearly audible. */
const SPOKEN = {
  durationMs: 2400,
  voicedMs: 1800,
  peak: 0.62,
  mean: 0.31,
  profile: [0.4, 0.55, 0.22],
}

const askWith = (
  request: { post: (url: string, options: { data: unknown }) => Promise<{ status: () => number, json: () => Promise<unknown> }> },
  ask: unknown,
) => request.post('/api/agent/ask', { data: { projectSlug: 'berkeley-square-north', ask } })

test.describe('04b · The agent endpoint', () => {
  test('answers an utterance with the question it recognised', async ({ request }) => {
    const response = await askWith(request, { kind: 'utterance', utterance: SPOKEN })
    expect(response.status()).toBe(200)

    const answer = await response.json() as {
      question: string
      panels: unknown[]
      heard?: { confidence: number }
    }

    // Recognised, not echoed: the client never sent any words to echo.
    expect(answer.question).toBe('What makes this the perfect first investment?')
    expect(answer.panels).toHaveLength(3)
    expect(answer.heard?.confidence).toBeGreaterThan(0)
  })

  test('says it did not catch a silence rather than inventing a question', async ({ request }) => {
    const response = await askWith(request, {
      kind: 'utterance',
      utterance: { ...SPOKEN, voicedMs: 0, peak: 0 },
    })

    expect(response.status()).toBe(422)
  })

  // The bounds are not decoration: these are numbers from a client.
  test('refuses measurements that could not have come from a microphone', async ({ request }) => {
    const response = await askWith(request, {
      kind: 'utterance',
      utterance: { ...SPOKEN, peak: 4 },
    })

    expect(response.status()).toBe(422)
  })

  test('refuses a body that claims to be both ways of asking', async ({ request }) => {
    const response = await askWith(request, { kind: 'text', utterance: SPOKEN })

    expect(response.status()).toBe(422)
  })

  test('still answers a question that was typed or linked to', async ({ request }) => {
    const response = await askWith(request, {
      kind: 'text',
      question: 'How does the payment plan work?',
    })

    expect(response.status()).toBe(200)
    const answer = await response.json() as { question: string, heard?: unknown }
    expect(answer.question).toBe('How does the payment plan work?')
    // Nothing was heard, so nothing claims to have been.
    expect(answer.heard).toBeUndefined()
  })
})

/** She has a voice, and none of this needs one to be granted. */
test.describe('04b · Before she is spoken to', () => {
  // She is not a narrator: arriving from a chapter's arrow or a shared link is
  // reading, and reading should not start a recording of someone talking at you.
  test('says nothing at all until she is spoken to', async ({ page }) => {
    const clips: string[] = []
    page.on('response', (response) => {
      if (response.url().includes('/audio/')) clips.push(response.url())
    })

    await open(page)
    await expect(page.locator('main .slide').first()).toBeVisible()

    expect(clips).toHaveLength(0)
    await expect(caption(page)).toHaveCount(0)
  })

  // The line that will hold what was said has to say something before anything
  // has been: a question nobody asked is not a question.
  test('invites a question rather than quoting one nobody asked', async ({ page }) => {
    await open(page)

    await expect(page.locator('main header h1')).toContainText(/mic to speak/i)
    await expect(page.locator('main header h1 q')).toHaveCount(0)
  })
})

test.describe('04b · Speaking to her', () => {
  test.beforeEach(needsFakeDevice)

  test('sends what it measured, and never the audio', async ({ page }) => {
    await open(page)

    const posts: Request[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/agent/ask') && request.method() === 'POST') posts.push(request)
    })

    // Long enough for the fake device to carry a sentence's worth of sound.
    await speakTo(page)

    await expect.poll(() => posts.length, { timeout: 15_000 }).toBeGreaterThan(0)

    const body = posts[posts.length - 1]?.postDataJSON() as {
      ask: { kind: string, utterance?: Record<string, unknown> }
    }

    expect(body.ask.kind).toBe('utterance')
    expect(Object.keys(body.ask.utterance ?? {}).sort())
      .toEqual(['durationMs', 'mean', 'peak', 'profile', 'voicedMs'])

    // Whatever was said, the shape of it — not a recording of it.
    const serialised = JSON.stringify(body)
    expect(serialised).not.toContain('audio')
    expect(serialised).not.toContain('base64')
    expect(serialised).not.toContain('blob:')
  })

  test('puts the question she heard into the address', async ({ page }) => {
    await open(page)

    await speakTo(page)

    // The address describes the screen, including for a question nobody typed.
    await expect.poll(() => new URL(page.url()).searchParams.get('q'), { timeout: 15_000 })
      .not.toBeNull()

    const heard = new URL(page.url()).searchParams.get('q') ?? ''
    await expect(page.locator('main header h1')).toContainText(heard)
  })

  /*
   * The deck is one answer with three panels, and speaking to her is asking
   * about the thing already on screen. An answer that swapped its own slides
   * every time somebody spoke read as a bug, because that is what it was.
   */
  test('answers the question the deck is already showing, and keeps its panels', async ({ page }) => {
    await open(page)

    const panels = await page.locator('main .slide').count()

    await speakTo(page)
    await expect(caption(page)).toBeVisible({ timeout: 15_000 })

    // The invitation is replaced by what she heard, in the same line.
    await expect(page.locator('main header h1')).not.toContainText(/mic to speak/i)
    await expect(page.locator('main header h1 q'))
      .toHaveText('What makes this the perfect first investment?')
    await expect(page.locator('main .slide')).toHaveCount(panels)
  })

  test('shows her words once she has replied to something said', async ({ page }) => {
    await open(page)
    await speakTo(page)

    await expect(caption(page)).toBeVisible({ timeout: 15_000 })
    await expect(caption(page)).not.toBeEmpty()

    // WCAG 1.4.2: sound that has started can be stopped.
    await expect(sound(page)).toHaveText('Clear')
  })

  test('her answer is a file the orb can hear, not a voice it has to guess at', async ({ page }) => {
    const clips: string[] = []
    page.on('response', (response) => {
      if (response.url().includes('/audio/') && response.status() < 400) {
        clips.push(response.headers()['content-type'] ?? '')
      }
    })

    await open(page)
    await speakTo(page)

    await expect.poll(() => clips.length, { timeout: 15_000 }).toBeGreaterThan(0)
    // Real audio, decoded by the browser — which is what makes the orb's
    // reaction to it a real one rather than an animation on a timer.
    expect(clips[0]).toContain('audio')
  })

  test('clearing stops her and puts the header back the way it was', async ({ page }) => {
    await open(page)

    await speakTo(page)
    await expect(caption(page)).toBeVisible({ timeout: 15_000 })
    const said = await caption(page).innerText()

    await sound(page).click()

    await expect(caption(page)).toHaveCount(0)
    // Her reply is gone from the header, not merely collapsed inside it.
    await expect(page.locator('main header')).not.toContainText(said.slice(0, 40))
    // Silent, not merely hidden: a control that only hid the words would leave
    // her talking to a header that no longer said she was.
    const paused = await page.evaluate(() =>
      [...document.querySelectorAll('audio')].map(clip => clip.paused))

    expect(paused).not.toHaveLength(0)
    expect(paused.every(Boolean)).toBe(true)
  })

  test('says so when it could not make out the question, and keeps the answer', async ({ page }) => {
    await open(page)

    const before = await page.locator('main header h1').innerText()

    // Every utterance is refused: the screen has to hold its ground.
    await page.route('**/api/agent/ask**', async (route) => {
      const body = route.request().postDataJSON() as { ask?: { kind?: string } }
      if (body?.ask?.kind !== 'utterance') return route.continue()
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Rechitta did not catch that.' }),
      })
    })

    await speakTo(page, 1200)

    await expect(page.getByText(/did not catch/i)).toBeVisible({ timeout: 15_000 })
    /*
     * The answer that was already there is still true. Compared as rendered
     * text: the line carries both "Click" and "Tap" in its markup with one of
     * them display:none, and textContent — what toHaveText reads by default —
     * cannot tell which.
     */
    await expect(page.locator('main header h1')).toHaveText(before, { useInnerText: true })
    await expect(page.locator('main .slide').first()).toBeVisible()
  })
})
