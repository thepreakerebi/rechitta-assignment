/** The backing-store size a canvas should use for a given CSS box. */
export interface CanvasSize {
  readonly width: number
  readonly height: number
  readonly dpr: number
}

/** Beyond this, extra pixels cost frames and buy nothing the eye can see. */
export const DEFAULT_MAX_PIXELS = 1_400_000

/** Sharper than this is wasted on an organic, soft-edged shape. */
export const MAX_DPR = 3

/**
 * Below this the orb turns to mush, so the pixel budget gives way instead. It
 * only binds on boxes far larger than the orb is ever laid out at.
 */
export const MIN_DPR = 0.5

/**
 * Resolves the backing-store size for a canvas.
 *
 * A naive `width * devicePixelRatio` is how a fragment shader ends up rendering
 * four million pixels on a 3x phone. The pixel budget is the performance
 * guarantee here, so it is resolution that gives way: the effective ratio is
 * lowered — below 1 if the CSS box is large enough to need it — until the frame
 * fits, stopping only at `MIN_DPR`.
 */
export const resolveCanvasSize = (
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxPixels: number = DEFAULT_MAX_PIXELS,
): CanvasSize => {
  const safeWidth = Math.max(1, Math.floor(cssWidth))
  const safeHeight = Math.max(1, Math.floor(cssHeight))
  const requested = Math.min(Math.max(devicePixelRatio, MIN_DPR), MAX_DPR)

  const wanted = safeWidth * safeHeight * requested * requested
  const fitted = wanted > maxPixels
    ? requested * Math.sqrt(maxPixels / wanted)
    : requested

  const dpr = Math.max(MIN_DPR, fitted)

  return {
    width: Math.max(1, Math.round(safeWidth * dpr)),
    height: Math.max(1, Math.round(safeHeight * dpr)),
    dpr,
  }
}
