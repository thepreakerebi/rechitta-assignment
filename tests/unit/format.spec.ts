import { describe, expect, it } from 'vitest'
import {
  filsToDirhams,
  formatAed,
  formatAedExact,
  formatArea,
  formatCompletion,
  formatMultiple,
  formatPercent,
  formatSqft,
} from '~/utils/format'

/** The domain holds fils, so every figure here is dirhams × 100. */
const aed = (dirhams: number) => dirhams * 100

describe('formatAed', () => {
  it.each([
    [2_016_000, 'AED 2.016M'],
    [1_970_000, 'AED 1.97M'],
    [1_680_000, 'AED 1.68M'],
    [2_800_000, 'AED 2.8M'],
  ])('prints %d exactly as the design does', (dirhams, expected) => {
    expect(formatAed(aed(dirhams))).toBe(expected)
  })

  it('keeps three decimals, because 2.016M and 2.0M differ by sixteen thousand dirhams', () => {
    expect(formatAed(aed(2_016_000))).not.toBe('AED 2M')
  })

  it('drops trailing zeros rather than printing 2.000M', () => {
    expect(formatAed(aed(2_000_000))).toBe('AED 2M')
  })

  it('falls back to thousands below a million', () => {
    expect(formatAed(aed(950_000))).toBe('AED 950K')
  })

  it('prints small amounts in full', () => {
    expect(formatAed(aed(4_200))).toBe('AED 4.2K')
    expect(formatAed(aed(420))).toBe('AED 420')
  })

  it('handles zero without producing a stray decimal point', () => {
    expect(formatAed(0)).toBe('AED 0')
  })
})

describe('filsToDirhams', () => {
  it('does not lose precision on a figure a float would mangle', () => {
    expect(filsToDirhams(aed(1_970_000))).toBe(1_970_000)
  })
})

describe('formatAedExact', () => {
  it('groups thousands', () => {
    expect(formatAedExact(aed(1_680_000))).toBe('AED 1,680,000')
  })
})

describe('formatSqft and formatArea', () => {
  it('groups thousands', () => {
    expect(formatSqft(1_489)).toBe('1,489 sqft')
  })

  it('rounds rather than printing a fractional square foot', () => {
    expect(formatSqft(1_488.6)).toBe('1,489 sqft')
  })

  it('prints a range with one unit, not two', () => {
    expect(formatArea(1_489, 2_300)).toBe('1,489–2,300 sqft')
  })

  it('collapses a range that is not a range', () => {
    expect(formatArea(1_489, 1_489)).toBe('1,489 sqft')
  })
})

describe('formatPercent', () => {
  it('keeps two decimals where the design shows them', () => {
    expect(formatPercent(12.73)).toBe('12.73%')
  })

  it('trims a trailing zero', () => {
    expect(formatPercent(17.5)).toBe('17.5%')
    expect(formatPercent(20)).toBe('20%')
  })

  it('signs a gain only when asked', () => {
    expect(formatPercent(17.5, true)).toBe('+17.5%')
    expect(formatPercent(17.5)).toBe('17.5%')
  })

  it('never writes +0%', () => {
    expect(formatPercent(0, true)).toBe('0%')
  })

  it('leaves a loss with its own sign', () => {
    expect(formatPercent(-4.2, true)).toBe('-4.2%')
  })
})

describe('formatCompletion and formatMultiple', () => {
  it('reads completion as a whole percentage', () => {
    expect(formatCompletion(0.64)).toBe('64% completed')
  })

  it('uses a multiplication sign, not the letter x', () => {
    expect(formatMultiple(2.2)).toBe('2.2×')
    expect(formatMultiple(2)).toBe('2×')
  })
})
