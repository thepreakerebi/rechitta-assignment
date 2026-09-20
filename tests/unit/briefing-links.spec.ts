import { describe, expect, it } from 'vitest'
import { answer, answerFor, project } from '../../server/mock/data'

/**
 * The feed and the deck are the same briefing told twice, and a chapter's arrow
 * is the seam between them. Nothing in the types can hold that seam together —
 * a chapter names its panel by id — so it is held here.
 */

describe('a chapter and its slide', () => {
  const opening = answer.panels

  it('gives every chapter a slide in her opening answer', () => {
    for (const chapter of project.chapters) {
      expect(
        opening.some(panel => panel.id === chapter.panel),
        `${chapter.id} points at ${chapter.panel}, which is not in the opening answer`,
      ).toBe(true)
    }
  })

  it('gives each chapter a different one', () => {
    const named = project.chapters.map(chapter => chapter.panel)

    expect(new Set(named).size).toBe(named.length)
  })

  // The deck is the briefing in full: seven chapters, seven slides, and the
  // arrows land in the order the feed reads.
  it('tells them in the same order as the feed', () => {
    expect(opening.map(panel => panel.id))
      .toEqual(project.chapters.map(chapter => chapter.panel))
  })

  it('still answers each chapter’s own question with fewer panels', () => {
    const plans = answerFor('How does the payment plan work?')

    expect(plans.panels.length).toBeLessThan(opening.length)
    expect(plans.panels.some(panel => panel.id === 'panel-plans')).toBe(true)
  })
})
