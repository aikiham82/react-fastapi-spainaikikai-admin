import { describe, expect, it } from 'vitest'
import { formatGradeEs, formatGradeNumber } from '../grade'

describe('formatGradeEs', () => {
  it.each([
    ['4th Dan', '4.º Dan'],
    ['1st Kyu', '1.er Kyu'],
    ['2nd Kyu', '2.º Kyu'],
    ['3rd Dan', '3.er Dan'],
    ['10th Kyu', '10.º Kyu'],
    ['3er Kyu', '3.er Kyu'],
    ['2do Dan', '2.º Dan'],
    ['4º Dan', '4.º Dan'],
    ['1st kyu', '1.er Kyu'],
  ])('turns %s into %s', (input, expected) => {
    expect(formatGradeEs(input)).toBe(expected)
  })

  it('keeps unknown strings as they are', () => {
    expect(formatGradeEs('Shidoin')).toBe('Shidoin')
    expect(formatGradeEs('Sin grado')).toBe('Sin grado')
  })

  it('returns an empty string for empty values', () => {
    expect(formatGradeEs(null)).toBe('')
    expect(formatGradeEs(undefined)).toBe('')
  })
})

describe('formatGradeNumber', () => {
  it('uses Spanish ordinals for numbers', () => {
    expect(formatGradeNumber(1, 'Kyu')).toBe('1.er Kyu')
    expect(formatGradeNumber(4, 'Dan')).toBe('4.º Dan')
  })
})
