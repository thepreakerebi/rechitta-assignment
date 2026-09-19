import { describe, expect, it } from 'vitest'
import { NAME_MAX, firstInvalid, isBookable, validateBooking } from '~/utils/booking'

const draft = (over: Partial<Parameters<typeof validateBooking>[0]> = {}) => ({
  name: 'Aryaman Shah',
  email: 'aryaman@example.com',
  slot: '2026-09-21T07:00:00.000Z',
  ...over,
})

describe('validateBooking', () => {
  it('passes a complete booking', () => {
    expect(validateBooking(draft())).toEqual({})
    expect(isBookable(draft())).toBe(true)
  })

  it('names every field that is wrong, not just the first', () => {
    const errors = validateBooking({ name: '', email: 'nope', slot: '' })
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'slot'])
  })

  it('trims before judging, so spaces are not a name', () => {
    expect(validateBooking(draft({ name: '   ' }))).toHaveProperty('name')
    expect(validateBooking(draft({ name: '  Jo  ' })).name).toBeUndefined()
  })

  it('rejects a name longer than the server will store', () => {
    expect(validateBooking(draft({ name: 'x'.repeat(NAME_MAX + 1) }))).toHaveProperty('name')
    expect(validateBooking(draft({ name: 'x'.repeat(NAME_MAX) })).name).toBeUndefined()
  })

  it.each([
    'no-at-sign.com',
    'missing@domain',
    'two words@example.com',
    '@example.com',
    'trailing@example.',
  ])('rejects %s', (email) => {
    expect(validateBooking(draft({ email }))).toHaveProperty('email')
  })

  it.each([
    'aryaman@example.com',
    'first.last+tag@sub.example.co.uk',
    'x@y.io',
  ])('accepts %s, because a stricter rule starts rejecting real addresses', (email) => {
    expect(validateBooking(draft({ email })).email).toBeUndefined()
  })

  it('asks for a time when none is chosen', () => {
    expect(validateBooking(draft({ slot: '' })).slot).toBe('Choose a time from the list.')
  })

  it('uses the server’s own wording, so one mistake is never described twice', () => {
    expect(validateBooking(draft({ name: '' })).name).toBe('Tell us who to expect.')
    expect(validateBooking(draft({ email: 'x' })).email).toBe('That email address does not look right.')
  })
})

describe('firstInvalid', () => {
  it('follows the order the fields are read in, not the order they were typed', () => {
    expect(firstInvalid(validateBooking({ name: '', email: 'x', slot: '' }))).toBe('slot')
    expect(firstInvalid(validateBooking(draft({ name: '', email: 'x' })))).toBe('name')
    expect(firstInvalid(validateBooking(draft({ email: 'x' })))).toBe('email')
  })

  it('is null when nothing is wrong', () => {
    expect(firstInvalid({})).toBeNull()
  })
})
