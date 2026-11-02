import { describe, expect, it } from 'vitest'
import { INVALID_DATA_MESSAGE, readableDetail } from '../readableDetail'

describe('readableDetail', () => {
  it('turns the field list of a validation error into a message a toast can show', () => {
    const detail = [{ type: 'less_than_equal', loc: ['body', 'amount'], msg: 'Input should be less than or equal to 1000000' }]

    expect(readableDetail(detail)).toBe(INVALID_DATA_MESSAGE)
  })

  it('keeps a message written by the API', () => {
    expect(readableDetail('Ya existe un pago para este año')).toBe('Ya existe un pago para este año')
  })

  it('leaves a missing detail missing', () => {
    expect(readableDetail(undefined)).toBeUndefined()
  })
})
