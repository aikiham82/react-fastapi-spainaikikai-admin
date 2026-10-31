import { describe, it, expect } from 'vitest'
import type { Member } from '@/features/members/data/schemas/member.schema'
import { buildChecklistRows, renewalAssignments, tickAllPending, type ChecklistRow } from '../payment-checklist'

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

describe('buildChecklistRows licence', () => {
  const today = new Date('2026-10-31')
  const holder = (grade: string, technical_grade: string, birth_date?: string): Member =>
    ({
      id: 'm-1',
      first_name: 'Nuevo',
      last_name: 'Ejemplo',
      birth_date,
      club_id: 'club-1',
      status: 'active',
      license_summary: { grade, technical_grade, instructor_category: 'none', status: 'active', expiration_date: null },
    }) as Member
  const rowOf = (member: Member) => buildChecklistRows([member], [], today)[0]

  it('a child holding a Kyu licence defaults to Kyu infantil', () => {
    expect(rowOf(holder('5º Kyu', 'kyu', '2017-12-20')).licence).toBe('kyu_infantil')
  })

  it('a Kyu holder aged 15 or more defaults to Kyu', () => {
    expect(rowOf(holder('Kyu Infantil', 'kyu', '2011-01-01')).licence).toBe('kyu')
  })

  it('a Kyu holder without birth date falls back to the grade text', () => {
    expect(rowOf(holder('Kyu Infantil', 'kyu')).licence).toBe('kyu_infantil')
    expect(rowOf(holder('3er Kyu', 'kyu')).licence).toBe('kyu')
  })

  it('a child holding a Kyu licence can choose Kyu infantil or Dan, an adult Kyu or Dan', () => {
    expect(rowOf(holder('5º Kyu', 'kyu', '2017-12-20')).licenceChoices).toEqual(['kyu_infantil', 'dan'])
    expect(rowOf(holder('5º Kyu', 'kyu', '1990-01-01')).licenceChoices).toEqual(['kyu', 'dan'])
  })

  it('a Dan holder keeps no choice', () => {
    const row = rowOf(holder('1er Dan', 'dan', '2015-01-01'))
    expect(row.licence).toBe('dan')
    expect(row.licenceChoices).toEqual([])
  })
})

