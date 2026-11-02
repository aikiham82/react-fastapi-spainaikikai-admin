import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { InsuranceTiles } from '../MemberBadges'

const toneOf = (name: RegExp) => screen.getByRole('img', { name }).getAttribute('data-tone')

describe('InsuranceTiles', () => {
  it('shows a missing insurance as a fact, not as a debt', () => {
    renderWithProviders(<InsuranceTiles />)

    expect(toneOf(/Seguro de accidentes: sin seguro/)).toBe('neutral')
    expect(toneOf(/Seguro de responsabilidad civil: sin seguro/)).toBe('neutral')
  })

  it('keeps an insurance in force as paid', () => {
    renderWithProviders(
      <InsuranceTiles
        insuranceSummary={{ has_accident: true, accident_status: 'active', has_rc: false, rc_status: null }}
      />,
    )

    expect(toneOf(/Seguro de accidentes: al día/)).toBe('ok')
  })

  it('keeps an expired insurance apart from a missing one', () => {
    renderWithProviders(
      <InsuranceTiles
        insuranceSummary={{ has_accident: true, accident_status: 'expired', has_rc: false, rc_status: null }}
      />,
    )

    expect(toneOf(/Seguro de accidentes/)).not.toBe('neutral')
  })
})
