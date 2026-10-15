import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
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
})
