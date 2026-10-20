import { describe, it, expect, vi } from 'vitest'
import { screen, within, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { MemberSelectionTable } from '../MemberSelectionTable'
import type { Member } from '@/features/members/data/schemas/member.schema'

const member = {
  id: 'member-1',
  first_name: 'Ana',
  last_name: 'Example',
  dni: '',
} as Member

const props = {
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  members: [member],
}

describe('MemberSelectionTable', () => {
  it('shows the assignments current when it opens, not the ones from its first render', () => {
    const { rerender } = renderWithProviders(
      <MemberSelectionTable {...props} isOpen={false} initialAssignments={[]} />
    )

    rerender(
      <MemberSelectionTable
        {...props}
        isOpen
        initialAssignments={[{ member_id: 'member-1', member_name: 'Ana Example', payment_types: ['dan'] }]}
      />
    )

    const row = screen.getByText('Ana Example').closest('tr') as HTMLElement
    const checked = within(row).getAllByRole('checkbox').filter((c) => c.getAttribute('data-state') === 'checked')
    expect(checked).toHaveLength(1)
    expect(screen.getByText('DAN: 1')).toBeInTheDocument()
  })

  it('disables and marks the concept a member already paid', () => {
    renderWithProviders(
      <MemberSelectionTable
        {...props}
        isOpen
        paidYear={2026}
        paidAssignments={[{ member_id: 'member-1', member_name: 'Ana Example', payment_types: ['seguro_accidentes'] }]}
      />
    )

    const row = screen.getByText('Ana Example').closest('tr') as HTMLElement
    expect(within(row).getByLabelText('Ya pagado en 2026')).toBeInTheDocument()
    expect(within(row).getAllByRole('checkbox')).toHaveLength(6)
  })

  it('select-all of a column skips members who already paid it', () => {
    const other = { ...member, id: 'member-2', first_name: 'Luis' } as Member
    renderWithProviders(
      <MemberSelectionTable
        {...props}
        members={[member, other]}
        isOpen
        paidYear={2026}
        paidAssignments={[{ member_id: 'member-1', member_name: 'Ana Example', payment_types: ['seguro_accidentes'] }]}
      />
    )

    fireEvent.click(screen.getByRole('columnheader', { name: 'Seg. Acc.' }))

    expect(screen.getByText('Seg. Acc.: 1')).toBeInTheDocument()
  })

  it('drops a concept already paid from the assignments it opens with', () => {
    renderWithProviders(
      <MemberSelectionTable
        {...props}
        isOpen
        paidYear={2026}
        paidAssignments={[{ member_id: 'member-1', member_name: 'Ana Example', payment_types: ['seguro_accidentes'] }]}
        initialAssignments={[{ member_id: 'member-1', member_name: 'Ana Example', payment_types: ['seguro_accidentes', 'kyu'] }]}
      />
    )

    expect(screen.getByText('Seg. Acc.: 0')).toBeInTheDocument()
    expect(screen.getByText('KYU: 1')).toBeInTheDocument()
  })

  it('explains the paid mark in a legend that needs no hover', () => {
    renderWithProviders(
      <MemberSelectionTable
        {...props}
        isOpen
        paidYear={2026}
        paidAssignments={[{ member_id: 'member-1', member_name: 'Ana Example', payment_types: ['seguro_accidentes'] }]}
      />
    )

    expect(screen.getByText('Ya pagado en 2026: no se puede volver a seleccionar')).toBeInTheDocument()
  })
})
