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

const mic = (page: Page) => page.locator('main header button.mic')
const caption = (page: Page) => page.locator('main section.said')
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

    const answer = await response.json() as { question: string, heard?: { confidence: number } }

    // Recognised, not echoed: the client never sent any words to echo.
    expect(answer.question.length).toBeGreaterThan(4)
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

test.describe('04b · Speaking to her', () => {
  test('sends what it measured, and never the audio', async ({ page }) => {
    await open(page)

    const posts: Request[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/agent/ask') && request.method() === 'POST') posts.push(request)
    })

    await mic(page).click()
    await expect(mic(page)).toHaveAttribute('aria-pressed', 'true')
    // Long enough for the fake device to carry a sentence's worth of sound.
    await page.waitForTimeout(2000)
    await mic(page).click()

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

    await mic(page).click()
    await page.waitForTimeout(2000)
    await mic(page).click()

    // The address describes the screen, including for a question nobody typed.
    await expect.poll(() => new URL(page.url()).searchParams.get('q'), { timeout: 15_000 })
      .not.toBeNull()

    const heard = new URL(page.url()).searchParams.get('q') ?? ''
    await expect(page.locator('main header h1')).toContainText(heard)
  })

  test('shows her words, and offers to play them again', async ({ page }) => {
    await open(page)

    await expect(caption(page)).toBeVisible()
    await expect(caption(page)).not.toBeEmpty()

    // WCAG 2.1.2: sound that has started can be stopped. It is the same control
    // that starts it again, which is what anyone actually wants from it.
    await expect(sound(page)).toBeVisible()
    await expect(sound(page)).toHaveAttribute('aria-pressed', /true|false/)
  })

  test('her answer is a file the orb can hear, not a voice it has to guess at', async ({ page }) => {
    // Watched from before the page exists: she says her answer on arrival, so
    // by the time a loaded page is idle the clip has already been fetched.
    const clips: string[] = []
    page.on('response', (response) => {
      if (response.url().includes('/audio/') && response.status() < 400) {
        clips.push(response.headers()['content-type'] ?? '')
      }
    })

    await open(page)

    await expect.poll(() => clips.length, { timeout: 15_000 }).toBeGreaterThan(0)
    // Real audio, decoded by the browser — which is what makes the orb's
    // reaction to it a real one rather than an animation on a timer.
    expect(clips[0]).toContain('audio')
  })

  test('playing her answer again is a state the control reports', async ({ page }) => {
    await open(page)
    await expect(sound(page)).toBeVisible()

    await sound(page).click()

    // Pressed or not, it says which — movement in an orb is not a state anyone
    // can name, and a screen reader cannot see it at all.
    await expect.poll(
      async () => sound(page).getAttribute('aria-pressed'),
      { timeout: 10_000 },
    ).toMatch(/true|false/)
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

    await mic(page).click()
    await page.waitForTimeout(1200)
    await mic(page).click()

    await expect(page.getByText(/did not catch/i)).toBeVisible({ timeout: 15_000 })
    // The answer that was already there is still true.
    await expect(page.locator('main header h1')).toHaveText(before)
    await expect(caption(page)).toBeVisible()
  })
})
