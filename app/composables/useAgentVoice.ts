import { VOICE_ENVELOPE, followEnvelope } from '~/utils/orb/bands'
import { FFT_SIZE, readDriveFrom } from '~/utils/orb/analyse'
import { SILENT_DRIVE, clamp01, idleDrive, mixDrive } from '~/utils/orb/drive'
import type { OrbDrive } from '~/utils/orb/drive'

/**
 * Rechitta's side of the conversation, out loud.
 *
 * Her answers are pre-rendered files rather than `speechSynthesis`, and the
 * reason is the orb. The Web Speech API exposes no audio node and no stream, so
 * nothing can analyse what it says; an orb "reacting" to it could only be
 * guessing from word-boundary events. An audio element goes through
 * `createMediaElementSource` into the same `AnalyserNode` the microphone uses,
 * so the orb moves to her voice by exactly the numbers it moves to yours.
 *
 * As with the microphone, nothing here is recorded and nothing is sent: the
 * graph exists to draw with.
 */

export type VoiceStatus =
  | 'idle'
  /** The browser would not start audio without a gesture it recognises. */
  | 'blocked'
  | 'speaking'
  | 'unsupported'

/** Crossfade from the idle animation to her voice, in milliseconds. */
const HANDOVER_MS = 500

export const useAgentVoice = () => {
  const status = ref<VoiceStatus>('idle')

  let audio: HTMLAudioElement | null = null
  let context: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let source: MediaElementAudioSourceNode | null = null
  let spectrum: Uint8Array<ArrayBuffer> = new Uint8Array(0)

  let smoothed: OrbDrive = SILENT_DRIVE
  let lastReadAt = 0
  let speakingSince = 0

  const onEnded = () => {
    if (status.value === 'speaking') status.value = 'idle'
    smoothed = SILENT_DRIVE
  }

  /**
   * One element and one graph for the session.
   *
   * `createMediaElementSource` may be called once per element — a second call
   * throws, and the element is silent from then on — so the element is made
   * once and its `src` changes for each answer.
   */
  const ensureGraph = (): HTMLAudioElement | null => {
    if (!import.meta.client || typeof Audio === 'undefined') {
      status.value = 'unsupported'
      return null
    }

    if (audio) return audio

    audio = new Audio()
    audio.preload = 'auto'
    audio.crossOrigin = 'anonymous'
    audio.addEventListener('ended', onEnded)

    if (typeof AudioContext === 'undefined') {
      // Playable, but nothing can be drawn from it. She still speaks; the orb
      // keeps its idle drive, which is honest about what is known.
      return audio
    }

    context = new AudioContext()
    analyser = context.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.72
    analyser.minDecibels = -85
    analyser.maxDecibels = -25

    source = context.createMediaElementSource(audio)
    source.connect(analyser)
    // Onward to the speakers as well: an analyser is a tap, not a destination,
    // and a graph that stops here plays nothing at all.
    analyser.connect(context.destination)

    spectrum = new Uint8Array(analyser.frequencyBinCount)
    return audio
  }

  /**
   * Say one answer. Resolves when playback has started, not when it ends —
   * the screen has states to move through in the meantime.
   */
  const speak = async (src: string) => {
    const element = ensureGraph()
    if (!element || !src) return

    element.pause()
    element.src = src
    element.currentTime = 0
    smoothed = SILENT_DRIVE
    lastReadAt = 0

    try {
      // Suspended until a gesture on most browsers, and a context that is never
      // resumed makes an analyser of zeros behind audible sound.
      if (context?.state === 'suspended') await context.resume()

      await element.play()
      speakingSince = performance.now()
      status.value = 'speaking'
    }
    catch {
      // Autoplay refused, or the file will not decode. Her words are on screen
      // either way; the screen offers to play them rather than insisting.
      status.value = 'blocked'
    }
  }

  const silence = () => {
    audio?.pause()
    if (audio) audio.currentTime = 0
    smoothed = SILENT_DRIVE
    if (status.value === 'speaking') status.value = 'idle'
  }

  /**
   * The orb's per-frame source while she speaks — the same signature as the
   * microphone's, so a component can hand either to the orb without knowing
   * which voice it is drawing.
   */
  const readDrive = (elapsedMs: number): OrbDrive => {
    const idle = idleDrive(elapsedMs)
    if (!analyser || status.value !== 'speaking') return idle

    const now = performance.now()
    const deltaMs = lastReadAt === 0 ? 16 : Math.min(now - lastReadAt, 100)
    lastReadAt = now

    const target = readDriveFrom(analyser, spectrum)

    smoothed = {
      bass: followEnvelope(smoothed.bass, target.bass, deltaMs, VOICE_ENVELOPE),
      mid: followEnvelope(smoothed.mid, target.mid, deltaMs, VOICE_ENVELOPE),
      treble: followEnvelope(smoothed.treble, target.treble, deltaMs, VOICE_ENVELOPE),
      level: followEnvelope(smoothed.level, target.level, deltaMs, VOICE_ENVELOPE),
    }

    return mixDrive(idle, smoothed, clamp01((now - speakingSince) / HANDOVER_MS))
  }

  onScopeDispose(() => {
    audio?.removeEventListener('ended', onEnded)
    audio?.pause()
    source?.disconnect()
    analyser?.disconnect()
    void context?.close().catch(() => undefined)
    audio = null
    source = null
    analyser = null
    context = null
  })

  return {
    status: readonly(status),
    isSpeaking: computed(() => status.value === 'speaking'),
    speak,
    silence,
    readDrive,
  }
}
