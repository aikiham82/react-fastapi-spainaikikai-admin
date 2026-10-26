import { describe, it, expect } from 'vitest'
import { foldForSearch } from '../search'

describe('foldForSearch', () => {
  it('lowercases and removes accents', () => {
    expect(foldForSearch('José Ángel Muñoz')).toBe('jose angel munoz')
  })

  it('leaves plain text untouched', () => {
    expect(foldForSearch('abc 123')).toBe('abc 123')
  })
})
