import { describe, expect, it } from 'vitest'
import { EDGE_GUARD, MAX_DURATION, MIN_DISTANCE, readSwipe } from '~/utils/swipe'

const WIDTH = 390
const at = (x: number, y: number, t = 0) => ({ x, y, at: t })

describe('readSwipe', () => {
  it('reads a flick left as going forward, and right as going back', () => {
    expect(readSwipe(at(300, 400), at(120, 404, 200), WIDTH)).toBe('forward')
    expect(readSwipe(at(120, 400), at(300, 404, 200), WIDTH)).toBe('back')
  })

  it('ignores a tap with a wobble', () => {
    expect(readSwipe(at(200, 400), at(200 - MIN_DISTANCE + 1, 402, 120), WIDTH)).toBeNull()
  })

  it('ignores a scroll that drifted sideways', () => {
    // Twice as far down as across is a scroll, whatever the fingers intended.
    expect(readSwipe(at(200, 200), at(120, 400, 250), WIDTH)).toBeNull()
  })

  it('ignores a slow drag', () => {
    expect(readSwipe(at(300, 400), at(100, 400, MAX_DURATION + 1), WIDTH)).toBeNull()
  })

  it('leaves the edges to the browser', () => {
    // iOS reads a swipe from the very edge as Back, and taking it would mean
    // the page and the browser both responding to one gesture.
    expect(readSwipe(at(EDGE_GUARD - 1, 400), at(300, 400, 200), WIDTH)).toBeNull()
    expect(readSwipe(at(WIDTH - EDGE_GUARD + 1, 400), at(100, 400, 200), WIDTH)).toBeNull()
  })

  it('accepts a swipe that starts just inside the guard', () => {
    expect(readSwipe(at(EDGE_GUARD + 1, 400), at(EDGE_GUARD + 1 + MIN_DISTANCE, 400, 200), WIDTH))
      .toBe('back')
  })
})
