import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MemberPaymentLines } from '../MemberPaymentLines'
import { usePermissions } from '@/core/hooks/usePermissions'
import { useMemberPaymentHistoryQuery } from '@/features/member-payments/hooks/queries/useMemberPaymentQueries'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'

const deleteMemberPayment = vi.fn()

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isAssociationAdmin: () => true })),
}))

const LINES: MemberPayment[] = [
  {
    id: 'mp-licence', payment_id: 'pay-1', member_id: 'member-ana', club_id: 'club-dojo', payment_year: 2026,
    payment_type: 'licencia_kyu', concept: 'licencia_kyu - 2026', amount: 15, status: 'completed',
    created_at: '2026-03-12T10:00:00', updated_at: '2026-03-12T10:00:00',
  },
  {
    id: 'mp-insurance', payment_id: 'pay-2', member_id: 'member-ana', club_id: 'club-dojo', payment_year: 2027,
    payment_type: 'seguro_accidentes', concept: 'seguro_accidentes - 2027', amount: 20, status: 'completed',
    created_at: '2026-10-21T10:00:00', updated_at: '2026-10-21T10:00:00',
  },
]

vi.mock('@/features/member-payments/hooks/queries/useMemberPaymentQueries', () => ({
  useMemberPaymentHistoryQuery: vi.fn(() => ({ data: { payments: LINES, total_count: 2 }, isLoading: false, error: null })),
}))

vi.mock('../../hooks/mutations/usePaymentAdminMutations', () => ({
  useDeleteMemberPaymentMutation: () => ({ deleteMemberPayment, isLoading: false }),
}))

vi.mock('../MemberPaymentEditModal', () => ({
  MemberPaymentEditModal: ({ memberPayment }: { memberPayment: MemberPayment }) => (
    <div role="dialog">Editando {memberPayment.id}</div>
  ),
}))

vi.mock('../ManualPaymentModal', () => ({
  ManualPaymentModal: ({ isOpen, members, clubId }: { isOpen: boolean; members: { id: string }[]; clubId: string }) =>
    isOpen ? <div role="dialog">Pago manual {clubId} {members.map((m) => m.id).join(',')}</div> : null,
}))

const MEMBER = { id: 'member-ana', name: 'Ana Example', clubId: 'club-dojo', clubName: 'Dojo Example' }

const renderLines = () =>
  renderWithProviders(
    <MemberPaymentLines memberId={MEMBER.id} memberName={MEMBER.name} clubId={MEMBER.clubId} clubName={MEMBER.clubName} />,
  )

describe('MemberPaymentLines', () => {
  beforeEach(() => {
    deleteMemberPayment.mockClear()
    vi.mocked(usePermissions).mockReturnValue({ isAssociationAdmin: () => true } as ReturnType<typeof usePermissions>)
  })

  it('a super admin edits a payment line from the member', async () => {
    renderLines()

    expect(screen.getByText('2027 · Seguro de Accidentes')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1])

    expect(screen.getByRole('dialog')).toHaveTextContent('Editando mp-insurance')
  })

  it('a super admin deletes a payment line from the member', async () => {
    renderLines()

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0])
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(deleteMemberPayment).toHaveBeenCalledWith('mp-licence')
  })

  it('a super admin adds a payment for that member', async () => {
    renderLines()

    await userEvent.click(screen.getByRole('button', { name: 'Añadir pago' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Pago manual club-dojo member-ana')
  })

  it('a club admin sees the payments read only', () => {
    vi.mocked(usePermissions).mockReturnValue({ isAssociationAdmin: () => false } as ReturnType<typeof usePermissions>)
    renderLines()

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir pago' })).not.toBeInTheDocument()
    expect(useMemberPaymentHistoryQuery).toHaveBeenLastCalledWith(MEMBER.id, 0, false)
  })
})
