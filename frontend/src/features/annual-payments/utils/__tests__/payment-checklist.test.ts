import { describe, it, expect } from 'vitest'
import { tickAllPending, type ChecklistRow } from '../payment-checklist'

const row = (overrides: Partial<ChecklistRow> = {}): ChecklistRow => ({
  memberId: 'm-1',
  memberName: 'Nuevo Ejemplo',
  grade: 'Sin licencia',
  licence: 'kyu',
  licenceChoosable: true,
  offersRc: true,
  licencePaid: false,
  accidentPaid: false,
  rcPaid: false,
  isUpToDate: false,
  ...overrides,
})

describe('tickAllPending', () => {
  it('keeps the chosen licence when ticking everything pending', () => {
    const current = [{ member_id: 'm-1', member_name: 'Nuevo Ejemplo', payment_types: ['dan'] }]

    const [assignment] = tickAllPending([row()], current)

    expect(assignment.payment_types).toEqual(['dan', 'seguro_accidentes', 'seguro_rc'])
  })

  it('falls back to the default licence when nothing was chosen', () => {
    const [assignment] = tickAllPending([row()], [])

    expect(assignment.payment_types).toEqual(['kyu', 'seguro_accidentes', 'seguro_rc'])
  })
})
