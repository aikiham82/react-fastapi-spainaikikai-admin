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
    paid_at: '2026-03-03T23:30:00', payment_method: 'cash',
    created_at: '2026-03-12T10:00:00', updated_at: '2026-03-12T10:00:00',
  },
  {
    id: 'mp-insurance', payment_id: 'pay-2', member_id: 'member-ana', club_id: 'club-dojo', payment_year: 2027,
    payment_type: 'seguro_accidentes', concept: 'seguro_accidentes - 2027', amount: 20, status: 'completed',
    created_at: '2026-10-21T10:00:00', updated_at: '2026-10-21T10:00:00',
  },
  {
    id: 'mp-pending', payment_id: 'pay-3', member_id: 'member-ana', club_id: 'club-dojo', payment_year: 2025,
    payment_type: 'licencia_kyu', concept: 'licencia_kyu - 2025', amount: 15, status: 'pending',
    paid_at: '2025-05-01T10:00:00', payment_method: 'redsys',
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

    await userEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])

    expect(screen.getByRole('dialog')).toHaveTextContent('Editando mp-insurance')
  })

  it('groups the lines by year, newest first, with the year total', () => {
    renderLines()

    const years = screen.getAllByRole('heading', { level: 5 }).map((h) => h.textContent?.replace(/\s/g, ' '))
    expect(years).toEqual(['2027 · 20,00 €', '2026 · 15,00 €', '2025 · 0,00 €'])
  })

  it('each line says when and how it was paid', () => {
    renderLines()

    expect(screen.getByText('Pagado el 04/03/2026 · Efectivo')).toBeInTheDocument()
    expect(screen.getByText('Sin fecha de pago')).toBeInTheDocument()
    expect(screen.queryByText(/01\/05\/2025/)).not.toBeInTheDocument()
  })

  it('a super admin deletes a payment line from the member', async () => {
    renderLines()

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[1])
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(deleteMemberPayment).toHaveBeenCalledWith('mp-licence')
  })

  it('a super admin adds a payment for that member', async () => {
    renderLines()

    await userEvent.click(screen.getByRole('button', { name: 'Añadir pago' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Pago manual club-dojo member-ana')
  })

  it('a payment cannot be added until the member club is known', () => {
    renderWithProviders(<MemberPaymentLines memberId={MEMBER.id} memberName={MEMBER.name} clubId="" clubName="" />)

    expect(screen.getByRole('button', { name: 'Añadir pago' })).toBeDisabled()
  })

  it('a club admin sees the payments read only', () => {
    vi.mocked(usePermissions).mockReturnValue({ isAssociationAdmin: () => false } as ReturnType<typeof usePermissions>)
    renderLines()

    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Añadir pago' })).not.toBeInTheDocument()
    expect(useMemberPaymentHistoryQuery).toHaveBeenLastCalledWith(MEMBER.id, 0, false)
  })
})
