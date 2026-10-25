import { describe, it, expect } from 'vitest'
import { updateToast } from '../updateToast'

const LICENCE = { updated: 'Licencia actualizada exitosamente', annulled: 'Licencia anulada', reactivated: 'Licencia reactivada' }

describe('updateToast', () => {
  it('toasts an annulment and a reactivation', () => {
    expect(updateToast({ annulled: true }, LICENCE)).toBe('Licencia anulada')
    expect(updateToast({ annulled: false }, LICENCE)).toBe('Licencia reactivada')
  })

  it('toasts a plain edit as an update', () => {
    expect(updateToast({}, LICENCE)).toBe('Licencia actualizada exitosamente')
  })
})
