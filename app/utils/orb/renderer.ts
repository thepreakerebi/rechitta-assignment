import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders'
import { resolveCanvasSize } from './viewport'
import type { OrbDrive } from './drive'

export interface OrbRenderer {
  /** Matches the backing store to the canvas's CSS box. Safe to call often. */
  readonly resize: (cssWidth: number, cssHeight: number, devicePixelRatio: number) => void
  /** Draws one frame. `elapsedMs` is monotonic; `drive` is the audio state. */
  readonly draw: (elapsedMs: number, drive: OrbDrive, opacity: number) => void
  /** Releases the GL objects and the context. */
  readonly dispose: () => void
}

const UNIFORM_NAMES = [
  'uResolution',
  'uTime',
  'uBass',
  'uMid',
  'uTreble',
  'uLevel',
  'uOpacity',
] as const

type UniformName = (typeof UNIFORM_NAMES)[number]
type UniformMap = Record<UniformName, WebGLUniformLocation | null>

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[orb] shader failed to compile', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const link = (gl: WebGL2RenderingContext) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vertex || !fragment) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)

  // The shaders are owned by the program once linked.
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[orb] program failed to link', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

/**
 * Creates a WebGL2 renderer for the orb, or returns `null` when the browser
 * cannot provide one — the caller is expected to fall back rather than throw.
 *
 * The shader writes premultiplied alpha, so the blend function is
 * `ONE, ONE_MINUS_SRC_ALPHA`; this is what lets the halo glow over photography
 * without dragging a grey rectangle along with it.
 */
export const createOrbRenderer = (canvas: HTMLCanvasElement): OrbRenderer | null => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null

  const program = link(gl)
  if (!program) return null

  const buffer = gl.createBuffer()
  const vertexArray = gl.createVertexArray()

  gl.bindVertexArray(vertexArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  const uniforms = Object.fromEntries(
    UNIFORM_NAMES.map(name => [name, gl.getUniformLocation(program, name)]),
  ) as UniformMap

  gl.useProgram(program)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  let disposed = false

  const resize = (cssWidth: number, cssHeight: number, devicePixelRatio: number) => {
    if (disposed) return
    const { width, height } = resolveCanvasSize(cssWidth, cssHeight, devicePixelRatio)
    if (canvas.width === width && canvas.height === height) return

    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)
  }

  const draw = (elapsedMs: number, drive: OrbDrive, opacity: number) => {
    if (disposed) return

    gl.useProgram(program)
    gl.bindVertexArray(vertexArray)

    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height)
    gl.uniform1f(uniforms.uTime, elapsedMs / 1000)
    gl.uniform1f(uniforms.uBass, drive.bass)
    gl.uniform1f(uniforms.uMid, drive.mid)
    gl.uniform1f(uniforms.uTreble, drive.treble)
    gl.uniform1f(uniforms.uLevel, drive.level)
    gl.uniform1f(uniforms.uOpacity, opacity)

    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  const dispose = () => {
    if (disposed) return
    disposed = true

    // Paint the buffer transparent and push it before tearing anything down.
    // Losing a context leaves its drawing buffer undefined, and the compositor
    // can present that undefined buffer as an opaque white rectangle for a
    // single frame — which on a full-bleed canvas is a full-width white flash.
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.flush()

    gl.deleteVertexArray(vertexArray)
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return { resize, draw, dispose }
}
