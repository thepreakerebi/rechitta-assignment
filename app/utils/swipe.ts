/**
 * Reading a swipe out of two pointer positions.
 *
 * Pure, so the thresholds can be argued with in a unit test rather than by
 * flicking a phone. They are the usual ones: far enough that it was meant,
 * quick enough that it was a flick rather than a drag, and more sideways than
 * up so that a scroll is never mistaken for a page turn.
 */

export interface SwipePoint {
  readonly x: number
  readonly y: number
  readonly at: number
}

export type SwipeDirection = 'forward' | 'back' | null

/** Shorter than this and it is a tap with a wobble. */
export const MIN_DISTANCE = 56
/** Longer than this and it is a drag, or a finger resting mid-scroll. */
export const MAX_DURATION = 700
/** A swipe must be at least twice as sideways as it is vertical. */
export const AXIS_RATIO = 2

/**
 * iOS reads a swipe from the very edge as Back, and Chrome on Android does the
 * same. Anything starting inside this band belongs to the browser.
 */
export const EDGE_GUARD = 28

export const readSwipe = (
  from: SwipePoint,
  to: SwipePoint,
  viewportWidth: number,
): SwipeDirection => {
  if (from.x < EDGE_GUARD || from.x > viewportWidth - EDGE_GUARD) return null

  const dx = to.x - from.x
  const dy = to.y - from.y

  if (to.at - from.at > MAX_DURATION) return null
  if (Math.abs(dx) < MIN_DISTANCE) return null
  if (Math.abs(dx) < Math.abs(dy) * AXIS_RATIO) return null

  // Pushing the page leftwards brings the next one in, as it does everywhere.
  return dx < 0 ? 'forward' : 'back'
}
