import { createError, getCookie, getQuery } from 'h3'
import type { H3Event } from 'h3'

/**
 * The failure modes the mock can be asked to produce.
 *
 * Every state the interface claims to handle is reachable from a URL, so a
 * reviewer can see the error screen rather than take its existence on trust.
 */
export const FAILURES = ['server', 'timeout', 'empty', 'slow'] as const
export type Failure = (typeof FAILURES)[number]

export const isFailure = (value: unknown): value is Failure =>
  typeof value === 'string' && (FAILURES as readonly string[]).includes(value)

/** Long enough to see a skeleton, short enough not to feel broken. */
export const DEFAULT_LATENCY_MS = 420
const SLOW_LATENCY_MS = 2_600
const MAX_LATENCY_MS = 8_000

export interface Scenario {
  readonly latencyMs: number
  readonly failure: Failure | null
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const readLatency = (raw: unknown): number | null => {
  const value = Number(raw)
  if (raw === undefined || raw === null || raw === '' || !Number.isFinite(value) || value < 0) return null
  return Math.min(value, MAX_LATENCY_MS)
}

/** What a request can ask for, from either the query string or a cookie. */
export interface ScenarioRequest {
  readonly fail?: unknown
  readonly latency?: unknown
}

/**
 * The scenario rules, as a pure function so they can be tested without an HTTP
 * server. A query parameter wins, so one link demonstrates one state; a cookie
 * carries the scenario switcher's choice across navigation.
 */
export const resolveScenario = (query: ScenarioRequest, cookie: ScenarioRequest = {}): Scenario => {
  const failure = isFailure(query.fail)
    ? query.fail
    : isFailure(cookie.fail)
      ? cookie.fail
      : null

  const base = readLatency(query.latency) ?? readLatency(cookie.latency) ?? DEFAULT_LATENCY_MS

  return {
    latencyMs: failure === 'slow' ? Math.max(base, SLOW_LATENCY_MS) : base,
    failure,
  }
}

/** Reads the scenario off a request. */
export const readScenario = (event: H3Event): Scenario => {
  const query = getQuery(event)
  return resolveScenario(
    { fail: query.fail, latency: query.latency },
    { fail: getCookie(event, 'mock-failure'), latency: getCookie(event, 'mock-latency') },
  )
}

/**
 * Applies the scenario, then hands back whether the route should return its
 * empty shape. Anything that should abort the request has already thrown.
 */
export const applyScenario = async (event: H3Event): Promise<{ empty: boolean }> => {
  const { latencyMs, failure } = readScenario(event)

  if (latencyMs > 0) await sleep(latencyMs)

  if (failure === 'server') {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      // Deliberately vague: a backend message must never reach the interface.
      message: 'The briefing could not be loaded.',
    })
  }

  if (failure === 'timeout') {
    throw createError({
      statusCode: 504,
      statusMessage: 'Gateway Timeout',
      message: 'The briefing took too long to answer.',
    })
  }

  return { empty: failure === 'empty' }
}
