import { describe, expect, it } from 'vitest'
import { DEFAULT_MAX_PIXELS, MAX_DPR, MIN_DPR, resolveCanvasSize } from '~/utils/orb/viewport'

/** Rounding to whole pixels can add a hair; allow for it. */
const withinBudget = (width: number, height: number, budget: number) =>
  width * height <= budget * 1.001

describe('resolveCanvasSize', () => {
  it('uses the full device ratio when the box is small enough', () => {
    expect(resolveCanvasSize(400, 400, 2)).toEqual({ width: 800, height: 800, dpr: 2 })
  })

  it('stays inside the budget across a sweep of realistic viewports', () => {
    const boxes = [
      [320, 320],
      [390, 390],
      [768, 768],
      [1024, 640],
      [1440, 900],
      [2560, 1440],
    ] as const

    for (const [cssWidth, cssHeight] of boxes) {
      for (const ratio of [1, 1.5, 2, 3]) {
        const { width, height } = resolveCanvasSize(cssWidth, cssHeight, ratio)
        expect(withinBudget(width, height, DEFAULT_MAX_PIXELS)).toBe(true)
      }
    }
  })

  it('drops below one device pixel per CSS pixel when the box demands it', () => {
    // A 3x ratio on a 1200px box wants 13 megapixels; the budget wins.
    const { dpr } = resolveCanvasSize(1200, 1200, 3)
    expect(dpr).toBeLessThan(1)
    expect(dpr).toBeGreaterThanOrEqual(MIN_DPR)
  })

  it('never goes below the legibility floor, even on an absurd budget', () => {
    expect(resolveCanvasSize(2560, 1440, 3, 1_000).dpr).toBe(MIN_DPR)
  })

  it('honours a tighter budget, which is how the 2D fallback stays cheap', () => {
    const { width, height } = resolveCanvasSize(700, 700, 3, 200_000)
    expect(withinBudget(width, height, 200_000)).toBe(true)
  })

  it('caps the ratio at the point past which nothing is visible', () => {
    expect(resolveCanvasSize(100, 100, 8).dpr).toBe(MAX_DPR)
  })

  it('refuses to produce a zero-sized backing store', () => {
    expect(resolveCanvasSize(0, 0, 2)).toEqual({ width: 2, height: 2, dpr: 2 })
  })
})
