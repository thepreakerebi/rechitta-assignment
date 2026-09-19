import type { Money } from '#shared/types/domain'

/**
 * Formatting lives at the edge. The domain carries integer fils and raw
 * numbers; these turn them into the strings the design asks for, and nothing
 * upstream has to know what a reader sees.
 */

const FILS_PER_DIRHAM = 100
const MILLION = 1_000_000
const THOUSAND = 1_000

/** Drops trailing zeros without leaving a dangling decimal point. */
const trim = (value: string) => value.replace(/\.?0+$/, '')

export const filsToDirhams = (fils: Money): number => fils / FILS_PER_DIRHAM

/**
 * The compact form the design uses throughout: `AED 2.016M`, `AED 1.68M`.
 *
 * Three decimal places rather than the usual one, because 2.016M and 2.0M are
 * a sixteen-thousand-dirham difference and the design prints the former.
 */
export const formatAed = (fils: Money): string => {
  const dirhams = filsToDirhams(fils)

  if (Math.abs(dirhams) >= MILLION) {
    return `AED ${trim((dirhams / MILLION).toFixed(3))}M`
  }

  if (Math.abs(dirhams) >= THOUSAND) {
    return `AED ${trim((dirhams / THOUSAND).toFixed(1))}K`
  }

  return `AED ${new Intl.NumberFormat('en-AE').format(dirhams)}`
}

/** The unabbreviated form, for places where the exact figure matters. */
export const formatAedExact = (fils: Money): string =>
  `AED ${new Intl.NumberFormat('en-AE', { maximumFractionDigits: 2 }).format(filsToDirhams(fils))}`

export const formatSqft = (squareFeet: number): string =>
  `${new Intl.NumberFormat('en-AE').format(Math.round(squareFeet))} sqft`

export const formatArea = (from: number, to: number): string =>
  from === to
    ? formatSqft(from)
    : `${new Intl.NumberFormat('en-AE').format(from)}–${formatSqft(to)}`

/** `signed` is for figures like appreciation, where the + carries meaning. */
export const formatPercent = (value: number, signed = false): string => {
  const body = `${trim(value.toFixed(2))}%`
  return signed && value > 0 ? `+${body}` : body
}

export const formatCompletion = (fraction: number): string =>
  `${Math.round(fraction * 100)}% completed`

export const formatMultiple = (value: number): string => `${trim(value.toFixed(1))}×`
