import { resolveCanvasSize } from './viewport'
import type { OrbRenderer } from './renderer'
import type { OrbDrive } from './drive'

/** Stops within this many pixels of centre are indistinguishable; skip the work. */
const RING_COUNT = 5

/**
 * A Canvas 2D stand-in for browsers without WebGL2.
 *
 * It cannot do thin-film interference, so it does not pretend to: layered
 * radial gradients in the same palette, a dark core and a bright rim. It still
 * answers to the audio — the radius, the rim weight and the halo all move — so
 * the requirement holds even where the shader cannot run.
 */
export const createOrbFallbackRenderer = (canvas: HTMLCanvasElement): OrbRenderer | null => {
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) return null

  let disposed = false

  const resize = (cssWidth: number, cssHeight: number, devicePixelRatio: number) => {
    if (disposed) return
    const { width, height } = resolveCanvasSize(cssWidth, cssHeight, devicePixelRatio, 700_000)
    if (canvas.width === width && canvas.height === height) return
    canvas.width = width
    canvas.height = height
  }

  const draw = (elapsedMs: number, drive: OrbDrive, opacity: number) => {
    if (disposed) return

    const { width, height } = canvas
    const shortest = Math.min(width, height)
    const centreX = width / 2
    const centreY = height / 2
    const seconds = elapsedMs / 1000

    context.clearRect(0, 0, width, height)
    context.globalAlpha = opacity

    const radius = shortest * (0.315 + 0.04 * drive.bass + 0.012 * Math.sin(seconds * 0.55))

    // Halo.
    const halo = context.createRadialGradient(centreX, centreY, radius * 0.6, centreX, centreY, radius * 1.6)
    halo.addColorStop(0, `rgba(122, 84, 190, ${0.26 + 0.3 * drive.level})`)
    halo.addColorStop(1, 'rgba(122, 84, 190, 0)')
    context.fillStyle = halo
    context.beginPath()
    context.arc(centreX, centreY, radius * 1.6, 0, Math.PI * 2)
    context.fill()

    // Body: dark core out to a bright, hue-shifting rim.
    const hue = 262 + 52 * drive.mid + 10 * Math.sin(seconds * 0.21)
    const body = context.createRadialGradient(
      centreX - radius * 0.18,
      centreY - radius * 0.2,
      radius * 0.05,
      centreX,
      centreY,
      radius,
    )
    body.addColorStop(0, 'rgba(11, 12, 37, 0.96)')
    body.addColorStop(0.55, `hsla(${hue}, 58%, 26%, 0.94)`)
    body.addColorStop(0.86, `hsla(${hue - 40}, 72%, 62%, 0.95)`)
    body.addColorStop(1, `hsla(46, 84%, ${78 + 12 * drive.treble}%, 0.92)`)
    context.fillStyle = body
    context.beginPath()
    context.arc(centreX, centreY, radius, 0, Math.PI * 2)
    context.fill()

    // Concentric films, each offset slightly, standing in for the warped bands.
    for (let ring = 1; ring <= RING_COUNT; ring++) {
      const ratio = ring / (RING_COUNT + 1)
      context.strokeStyle = `hsla(${hue + ring * 26}, 70%, 70%, ${0.1 + 0.05 * drive.mid})`
      context.lineWidth = Math.max(1, shortest * 0.008)
      context.beginPath()
      context.arc(
        centreX + Math.sin(seconds * 0.3 + ring) * radius * 0.05,
        centreY + Math.cos(seconds * 0.24 + ring) * radius * 0.05,
        radius * ratio,
        0,
        Math.PI * 2,
      )
      context.stroke()
    }

    // Highlight.
    const spot = context.createRadialGradient(
      centreX - radius * 0.32,
      centreY - radius * 0.36,
      0,
      centreX - radius * 0.32,
      centreY - radius * 0.36,
      radius * 0.34,
    )
    spot.addColorStop(0, `rgba(255, 255, 255, ${0.5 + 0.35 * drive.treble})`)
    spot.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = spot
    context.beginPath()
    context.arc(centreX - radius * 0.32, centreY - radius * 0.36, radius * 0.34, 0, Math.PI * 2)
    context.fill()

    context.globalAlpha = 1
  }

  const dispose = () => {
    disposed = true
  }

  return { resize, draw, dispose }
}
