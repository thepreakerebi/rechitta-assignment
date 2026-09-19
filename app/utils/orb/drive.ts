/**
 * The four numbers that make the orb move.
 *
 * Keeping the renderer's input to a plain value — rather than letting it reach
 * into an AnalyserNode — means the orb can be driven by a live microphone, by a
 * silent idle animation, or by a test, without knowing the difference.
 *
 * Every field is normalised to 0..1.
 */
export interface OrbDrive {
  /** 20–250 Hz. Pushes the silhouette outward. */
  readonly bass: number
  /** 250 Hz–2 kHz. Shifts the thickness of the iridescent film. */
  readonly mid: number
  /** 2–8 kHz. Ripples the rim and sharpens the highlights. */
  readonly treble: number
  /** Broadband loudness. Drives the outer glow. */
  readonly level: number
}

export const SILENT_DRIVE: OrbDrive = { bass: 0, mid: 0, treble: 0, level: 0 }

const TAU = Math.PI * 2

/** A number in 0..1 that eases in and out on a period of `seconds`. */
const breathe = (elapsedMs: number, seconds: number, phase = 0) =>
  0.5 + 0.5 * Math.sin((elapsedMs / (seconds * 1000)) * TAU + phase)

/**
 * What the orb does when nothing is listening.
 *
 * The three periods are deliberately coprime-ish so the motion never settles
 * into a visible loop, and the amplitudes stay low — this reads as "alive and
 * waiting", not as "reacting to something you cannot hear".
 */
export const idleDrive = (elapsedMs: number): OrbDrive => ({
  bass: 0.10 * breathe(elapsedMs, 7.3),
  mid: 0.16 * breathe(elapsedMs, 11.1, 1.7),
  treble: 0.06 * breathe(elapsedMs, 4.7, 3.4),
  level: 0.12 * breathe(elapsedMs, 9.2, 0.8),
})

export const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

/**
 * Blends between two drives. Used to fade from idle to live when the
 * microphone is granted, so the orb never jumps.
 */
export const mixDrive = (from: OrbDrive, to: OrbDrive, amount: number): OrbDrive => {
  const t = clamp01(amount)
  const lerp = (a: number, b: number) => a + (b - a) * t
  return {
    bass: lerp(from.bass, to.bass),
    mid: lerp(from.mid, to.mid),
    treble: lerp(from.treble, to.treble),
    level: lerp(from.level, to.level),
  }
}
