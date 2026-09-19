import { describe, expect, it } from 'vitest'
import { DEFAULT_LATENCY_MS, FAILURES, isFailure, resolveScenario } from '../../server/mock/scenario'

describe('isFailure', () => {
  it.each(FAILURES)('accepts %s', (failure) => {
    expect(isFailure(failure)).toBe(true)
  })

  it.each([['nonsense'], [''], [null], [undefined], [42], [{}]])('rejects %s', (value) => {
    expect(isFailure(value)).toBe(false)
  })
})

describe('resolveScenario', () => {
  it('defaults to a short latency and no failure', () => {
    expect(resolveScenario({})).toEqual({ latencyMs: DEFAULT_LATENCY_MS, failure: null })
  })

  it('reads a failure from the query', () => {
    expect(resolveScenario({ fail: 'server' }).failure).toBe('server')
  })

  it('falls back to the cookie, so the switcher survives navigation', () => {
    expect(resolveScenario({}, { fail: 'timeout' }).failure).toBe('timeout')
  })

  it('lets the query override the cookie, so one link shows one state', () => {
    expect(resolveScenario({ fail: 'empty' }, { fail: 'server' }).failure).toBe('empty')
  })

  it('ignores a failure it does not recognise', () => {
    expect(resolveScenario({ fail: 'explode' }).failure).toBeNull()
  })

  it('honours a requested latency', () => {
    expect(resolveScenario({ latency: '1500' }).latencyMs).toBe(1500)
  })

  it('accepts zero latency — a reviewer may not want to wait', () => {
    expect(resolveScenario({ latency: '0' }).latencyMs).toBe(0)
  })

  it('caps latency so a stray URL cannot hang the demo', () => {
    expect(resolveScenario({ latency: '999999' }).latencyMs).toBe(8_000)
  })

  it.each([['-1'], ['abc'], [''], [null]])('ignores %s and uses the default', (latency) => {
    expect(resolveScenario({ latency }).latencyMs).toBe(DEFAULT_LATENCY_MS)
  })

  it('makes slow actually slow, whatever latency was asked for', () => {
    expect(resolveScenario({ fail: 'slow', latency: '10' }).latencyMs).toBe(2_600)
  })

  it('does not shorten a latency already longer than slow', () => {
    expect(resolveScenario({ fail: 'slow', latency: '5000' }).latencyMs).toBe(5_000)
  })
})
