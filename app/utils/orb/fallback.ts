import { resolveCanvasSize } from './viewport'
import type { OrbRenderer } from './renderer'
import type { OrbDrive } from './drive'

/** Matches the shader's constant rotation, in radians per second. */
const BASE_ROTATION = 0.3

/**
 * A Canvas 2D stand-in for browsers without WebGL2.
 *
 * It cannot run the noise field, so it does not pretend to: a violet sphere, a
 * bright crescent travelling around its edge, and a soft bloom. It still answers
 * to the audio — the core opens on bass, the crescent brightens and speeds up on
 * treble, the bloom breathes on level — so the requirement holds even where the
 * shader cannot run.
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
    const centreX = width / 2
    const centreY = height / 2
    const seconds = elapsedMs / 1000
    const shortest = Math.min(width, height)

    const pulse = Math.sin(seconds * 1.5) * 0.02 + drive.level * 0.07
    const radius = shortest * (0.34 + pulse * 0.5 + drive.bass * 0.05)
    const core = 0.10 + drive.bass * 0.16

    context.clearRect(0, 0, width, height)
    context.globalAlpha = opacity

    // Bloom.
    const bloom = context.createRadialGradient(centreX, centreY, radius * 0.7, centreX, centreY, radius * 1.45)
    bloom.addColorStop(0, `rgba(143, 84, 235, ${0.24 + 0.26 * drive.level})`)
    bloom.addColorStop(1, 'rgba(143, 84, 235, 0)')
    context.fillStyle = bloom
    context.beginPath()
    context.arc(centreX, centreY, radius * 1.45, 0, Math.PI * 2)
    context.fill()

    // Sphere: dark at the core, violet toward the edge.
    const sphere = context.createRadialGradient(centreX, centreY, radius * core, centreX, centreY, radius)
    sphere.addColorStop(0, 'rgba(10, 11, 30, 0.96)')
    sphere.addColorStop(0.62, `rgba(${Math.round(70 + 40 * drive.mid)}, 62, 190, 0.88)`)
    sphere.addColorStop(0.93, 'rgba(160, 140, 240, 0.95)')
    sphere.addColorStop(1, 'rgba(226, 216, 196, 0.9)')
    context.fillStyle = sphere
    context.beginPath()
    context.arc(centreX, centreY, radius, 0, Math.PI * 2)
    context.fill()

    // The travelling crescent, offset from centre so it reads as a light source.
    const angle = seconds * (BASE_ROTATION + drive.level * 0.35) - Math.PI / 2
    const offsetX = centreX + Math.cos(angle) * radius * 0.82
    const offsetY = centreY + Math.sin(angle) * radius * 0.82
    const crescent = context.createRadialGradient(offsetX, offsetY, 0, offsetX, offsetY, radius * 0.62)
    crescent.addColorStop(0, `rgba(255, 248, 232, ${0.72 + 0.25 * drive.treble})`)
    crescent.addColorStop(1, 'rgba(255, 248, 232, 0)')

    context.save()
    context.beginPath()
    context.arc(centreX, centreY, radius, 0, Math.PI * 2)
    context.clip()
    context.fillStyle = crescent
    context.fillRect(0, 0, width, height)
    context.restore()

    context.globalAlpha = 1
  }

  const dispose = () => {
    disposed = true
  }

  return { resize, draw, dispose }
}
