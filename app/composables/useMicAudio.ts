import { VOICE_ENVELOPE, followEnvelope } from '~/utils/orb/bands'
import {
  EMPTY_TALLY,
  FFT_SIZE,
  readDriveFrom,
  summarise,
  tallyFrame,
} from '~/utils/orb/analyse'
import type { UtteranceTally } from '~/utils/orb/analyse'
import { SILENT_DRIVE, clamp01, idleDrive, mixDrive } from '~/utils/orb/drive'
import type { OrbDrive } from '~/utils/orb/drive'
import type { Utterance } from '#shared/types/domain'

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
  /**
   * Whether this origin has already been granted the microphone in a previous
   * visit. Distinct from `status`, which describes the current session: a
   * returning visitor has consented but is not yet listening.
   */
  const hasPriorConsent = ref(false)

  let context: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let stream: MediaStream | null = null
  let spectrum: Uint8Array<ArrayBuffer> = new Uint8Array(0)

  let smoothed: OrbDrive = SILENT_DRIVE
  let lastReadAt = 0
  let listeningSince = 0

  /**
   * What this open microphone has added up to so far.
   *
   * Accumulated as the orb reads, because those frames have already been
   * analysed — measuring the same audio twice would be a second pass over the
   * spectrum sixty times a second for numbers already in hand.
   */
  let tally: UtteranceTally = EMPTY_TALLY

  /**
   * The live permission handle, kept so the interface can follow a decision made
   * outside it. Permission is not a question asked once: it is changed from the
   * browser's own address bar, and from any other tab on this origin. A screen
   * that reads it only on mount goes on offering to ask for something it already
   * has — or claims to be refused long after the refusal was lifted.
   */
  let permission: PermissionStatus | null = null

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

  const syncPermission = () => {
    if (!permission) return
    hasPriorConsent.value = permission.state === 'granted'

    if (permission.state === 'denied') {
      // Revoked mid-session: stop capturing immediately rather than waiting for
      // the next teardown, and say so.
      releaseGraph()
      status.value = 'blocked'
      return
    }

    // Only an explicit grant lifts a refusal. Chromium reports 'prompt' again
    // after a request is dismissed, and reading that as consent would erase a
    // refusal this session actually observed — leaving the screen offering to
    // ask for something it has already been told it cannot have.
    if (permission.state === 'granted' && status.value === 'blocked') status.value = 'idle'
  }

  /**
   * Reads the current permission without prompting, where the browser allows
   * it, and applies what it finds. A screen that already knows the microphone
   * is refused should not offer to ask for it again — only the browser's own
   * controls can undo that.
   */
  const peekPermission = async (): Promise<MicStatus> => {
    const found = await (async (): Promise<MicStatus> => {
      if (!import.meta.client || !navigator.mediaDevices?.getUserMedia) return 'unsupported'
      if (!navigator.permissions?.query) return 'idle'

      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        permission = result
        result.addEventListener('change', syncPermission)
        hasPriorConsent.value = result.state === 'granted'
        return result.state === 'denied' ? 'blocked' : 'idle'
      }
      catch {
        // Firefox and Safari have historically rejected this query outright.
        return 'idle'
      }
    })()

    // Never downgrade a live session back to idle.
    if (status.value === 'idle') status.value = found
    return found
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
      tally = EMPTY_TALLY
      listeningSince = performance.now()
      status.value = 'listening'
    }
    catch (error) {
      releaseGraph()
      status.value = isAbortLike(error) ? 'blocked' : 'unavailable'
    }
  }

  /**
   * What was heard, as measurements — never as audio.
   *
   * Taken at the end of an utterance and cleared by the same call, so an
   * utterance can only be sent once and a second question can never be answered
   * with what was said for the first.
   *
   * Null when the microphone was open but nothing came through it: no frames,
   * because permission was refused or the tab was hidden throughout.
   */
  const takeUtterance = (): Utterance | null => {
    const spoken = tally
    const openMs = listeningSince === 0 ? 0 : performance.now() - listeningSince
    tally = EMPTY_TALLY

    if (spoken.frames === 0) return null
    return summarise(spoken, openMs)
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

    const target = readDriveFrom(analyser, spectrum)
    tally = tallyFrame(tally, target, deltaMs)

    smoothed = {
      bass: followEnvelope(smoothed.bass, target.bass, deltaMs, VOICE_ENVELOPE),
      mid: followEnvelope(smoothed.mid, target.mid, deltaMs, VOICE_ENVELOPE),
      treble: followEnvelope(smoothed.treble, target.treble, deltaMs, VOICE_ENVELOPE),
      level: followEnvelope(smoothed.level, target.level, deltaMs, VOICE_ENVELOPE),
    }

    const handover = clamp01((now - listeningSince) / HANDOVER_MS)
    return mixDrive(idle, smoothed, handover)
  }

  onScopeDispose(() => {
    permission?.removeEventListener('change', syncPermission)
    permission = null
    releaseGraph()
  })

  return {
    status: readonly(status),
    hasPriorConsent: readonly(hasPriorConsent),
    isListening: computed(() => status.value === 'listening'),
    peekPermission,
    start,
    stop,
    takeUtterance,
    readDrive,
  }
}
