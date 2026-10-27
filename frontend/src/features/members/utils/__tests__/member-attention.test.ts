import { describe, it, expect } from 'vitest'
import type { Member } from '../../data/schemas/member.schema'
import { countMemberChips, matchesMemberChip } from '../member-attention'

const daysFromNow = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 19)
}

const insured = { has_accident: true, accident_status: 'active', has_rc: true, rc_status: 'active' }

const license = (days: number) => ({
  grade: null,
  technical_grade: null,
  instructor_category: null,
  status: 'active',
  expiration_date: daysFromNow(days),
})

const member = (overrides: Partial<Member>): Member =>
  ({ id: 'm', first_name: 'Ana', last_name: 'Example', ...overrides }) as Member

describe('member attention chips', () => {
  const expired = member({ license_summary: license(-5), insurance_summary: insured })
  const expiring = member({ license_summary: license(10), insurance_summary: insured })
  const fine = member({ license_summary: license(200), insurance_summary: insured })
  const uninsured = member({ insurance_summary: { ...insured, has_rc: false, rc_status: null } })
  const noSummary = member({})

  it('matches each chip', () => {
    expect(matchesMemberChip(expired, 'expired')).toBe(true)
    expect(matchesMemberChip(expiring, 'expiring')).toBe(true)
    expect(matchesMemberChip(fine, 'expired')).toBe(false)
    expect(matchesMemberChip(fine, 'uninsured')).toBe(false)
    expect(matchesMemberChip(uninsured, 'uninsured')).toBe(true)
    expect(matchesMemberChip(noSummary, 'uninsured')).toBe(true)
    expect(matchesMemberChip(noSummary, 'all')).toBe(true)
  })

  it('counts every chip', () => {
    expect(countMemberChips([expired, expiring, fine, uninsured, noSummary])).toEqual({
      all: 5,
      expired: 1,
      expiring: 1,
      uninsured: 2,
    })
  })
})
