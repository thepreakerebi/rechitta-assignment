import {
  BANDS,
  VOICE_ENVELOPE,
  bandBins,
  bandEnergy,
  followEnvelope,
  shapeBand,
} from '~/utils/orb/bands'
import type { Band } from '~/utils/orb/bands'
import { SILENT_DRIVE, clamp01, idleDrive, mixDrive } from '~/utils/orb/drive'
import type { OrbDrive } from '~/utils/orb/drive'

/**
 * Every state the microphone can be in, as far as the interface is concerned.
 *
 * `unsupported` and `blocked` are separate because they need different copy:
 * one is a browser that cannot, the other a browser that will not until the
 * person changes a setting.
 */
export type MicStatus =
  | 'idle'
  | 'prompting'
  | 'listening'
  | 'blocked'
  | 'unsupported'
  | 'unavailable'

/** Speech is quiet and narrow after the analyser's mapping; lift it. */
const SHAPING = {
  bass: { gain: 2.2, floor: 0.06 },
  mid: { gain: 2.6, floor: 0.05 },
  treble: { gain: 3.4, floor: 0.03 },
  level: { gain: 2.4, floor: 0.05 },
} as const

const FFT_SIZE = 2048

/** Crossfade from the idle animation to live audio, in milliseconds. */
const HANDOVER_MS = 900

const isAbortLike = (error: unknown) =>
  error instanceof DOMException
  && ['NotAllowedError', 'SecurityError', 'PermissionDeniedError'].includes(error.name)

/**
 * Captures the microphone and reduces it to the four numbers the orb runs on.
 *
 * The stream is analysed and never recorded, never buffered and never sent
 * anywhere: the only thing that leaves this composable is `readDrive`, which
 * returns four floats. `readDrive` is called from inside requestAnimationFrame,
 * so it deliberately touches no reactive state — the status ref changes at most
 * a handful of times in a session, the drive changes sixty times a second, and
 * only the first of those belongs to Vue.
 */
export const useMicAudio = () => {
  const status = ref<MicStatus>('idle')

  let context: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let stream: MediaStream | null = null
  let spectrum: Uint8Array<ArrayBuffer> = new Uint8Array(0)

  let smoothed: OrbDrive = SILENT_DRIVE
  let lastReadAt = 0
  let listeningSince = 0

  const releaseGraph = () => {
    source?.disconnect()
    analyser?.disconnect()
    stream?.getTracks().forEach(track => track.stop())
    void context?.close().catch(() => undefined)

    source = null
    analyser = null
    stream = null
    context = null
    spectrum = new Uint8Array(0)
    smoothed = SILENT_DRIVE
  }

  /** Reads the current permission without prompting, where the browser allows it. */
  const peekPermission = async (): Promise<MicStatus> => {
    if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) return 'unsupported'
    if (!navigator.permissions?.query) return 'idle'

    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      if (result.state === 'denied') return 'blocked'
      return 'idle'
    }
    catch {
      // Firefox and Safari have historically rejected this query outright.
      return 'idle'
    }
  }

  const start = async () => {
    if (status.value === 'listening' || status.value === 'prompting') return
    if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) {
      status.value = 'unsupported'
      return
    }

    status.value = 'prompting'

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      context = new AudioContext()
      // Browsers start a context suspended unless it follows a gesture.
      if (context.state === 'suspended') await context.resume()

      analyser = context.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.72
      // Tightened around speech: the defaults waste most of the range on
      // levels a conversation never reaches.
      analyser.minDecibels = -85
      analyser.maxDecibels = -25

      source = context.createMediaStreamSource(stream)
      source.connect(analyser)
      // Deliberately not connected to the destination — nothing is played back.

      spectrum = new Uint8Array(analyser.frequencyBinCount)
      lastReadAt = 0
      listeningSince = performance.now()
      status.value = 'listening'
    }
    catch (error) {
      releaseGraph()
      status.value = isAbortLike(error) ? 'blocked' : 'unavailable'
    }
  }

  const stop = () => {
    releaseGraph()
    if (status.value === 'listening') status.value = 'idle'
  }

  /**
   * The orb's per-frame source. Returns the idle animation until audio is
   * flowing, then crosses over to it so the handover is never a jump.
   */
  const readDrive = (elapsedMs: number): OrbDrive => {
    const idle = idleDrive(elapsedMs)
    if (!analyser || status.value !== 'listening') return idle

    const now = performance.now()
    const deltaMs = lastReadAt === 0 ? 16 : Math.min(now - lastReadAt, 100)
    lastReadAt = now

    analyser.getByteFrequencyData(spectrum)

    const { sampleRate } = analyser.context
    const read = (band: Band, shaping: { gain: number, floor: number }) => {
      const [start, end] = bandBins(band, sampleRate, FFT_SIZE)
      return shapeBand(bandEnergy(spectrum, start, end), shaping.gain, shaping.floor)
    }

    const target: OrbDrive = {
      bass: read(BANDS.bass, SHAPING.bass),
      mid: read(BANDS.mid, SHAPING.mid),
      treble: read(BANDS.treble, SHAPING.treble),
      level: shapeBand(bandEnergy(spectrum, 0, spectrum.length), SHAPING.level.gain, SHAPING.level.floor),
    }

    smoothed = {
      bass: followEnvelope(smoothed.bass, target.bass, deltaMs, VOICE_ENVELOPE),
      mid: followEnvelope(smoothed.mid, target.mid, deltaMs, VOICE_ENVELOPE),
      treble: followEnvelope(smoothed.treble, target.treble, deltaMs, VOICE_ENVELOPE),
      level: followEnvelope(smoothed.level, target.level, deltaMs, VOICE_ENVELOPE),
    }

    const handover = clamp01((now - listeningSince) / HANDOVER_MS)
    return mixDrive(idle, smoothed, handover)
  }

  onScopeDispose(() => releaseGraph())

  return {
    status: readonly(status),
    isListening: computed(() => status.value === 'listening'),
    peekPermission,
    start,
    stop,
    readDrive,
  }
}
