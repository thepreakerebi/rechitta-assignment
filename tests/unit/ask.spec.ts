import { describe, expect, it } from 'vitest'
import { spokenForm } from '~/utils/ask'

describe('spokenForm', () => {
  it('drops the comp’s trailing ellipsis, which is typography rather than words', () => {
    expect(spokenForm('Is there a 2-bed available…')).toBe('Is there a 2-bed available')
    expect(spokenForm('How does the payment plan work…')).toBe('How does the payment plan work')
  })

  it('drops three full stops as well, because not every ellipsis is the character', () => {
    expect(spokenForm('Show me the floor plan...')).toBe('Show me the floor plan')
  })

  it('leaves a question that ends in a question mark alone', () => {
    expect(spokenForm('What’s the price history?')).toBe('What’s the price history?')
  })

  it('does not eat a full stop that ends a sentence', () => {
    expect(spokenForm('Show me the floor plan.')).toBe('Show me the floor plan.')
  })
})
