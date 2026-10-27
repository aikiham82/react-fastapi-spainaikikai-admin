import { describe, it, expect } from 'vitest'
import { renewalAssignments, tickAllPending, type ChecklistRow } from '../payment-checklist'

const row = (overrides: Partial<ChecklistRow> = {}): ChecklistRow => ({
  memberId: 'm-1',
  memberName: 'Nuevo Ejemplo',
  grade: 'Sin licencia',
  licence: 'kyu',
  licenceChoices: ['kyu', 'kyu_infantil', 'dan'],
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

describe('renewalAssignments', () => {
  const rows = [row(), row({ memberId: 'm-2', memberName: 'Otro Ejemplo' })]

  it('ticks only the licence when renewing a licence', () => {
    expect(renewalAssignments(rows, 'm-1', 'licencia')).toEqual([
      { member_id: 'm-1', member_name: 'Nuevo Ejemplo', payment_types: ['kyu'] },
    ])
  })

  it('ticks only that insurance when renewing an insurance', () => {
    expect(renewalAssignments(rows, 'm-1', 'rc')[0].payment_types).toEqual(['seguro_rc'])
    expect(renewalAssignments(rows, 'm-1', 'accidentes')[0].payment_types).toEqual(['seguro_accidentes'])
  })

  it('ticks nothing when that item is already paid or the member is not in the list', () => {
    expect(renewalAssignments([row({ rcPaid: true })], 'm-1', 'rc')).toEqual([])
    expect(renewalAssignments(rows, 'm-9', 'licencia')).toEqual([])
  })
})

