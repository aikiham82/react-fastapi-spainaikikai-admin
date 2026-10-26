import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { InsuranceForm } from '../InsuranceForm'
import type { Insurance } from '../../data/schemas/insurance.schema'
import { usePermissions } from '@/core/hooks/usePermissions'

const createInsurance = vi.fn()
const updateInsurance = vi.fn()

vi.mock('../../hooks/useInsuranceContext', () => ({
  useInsuranceContext: () => ({ createInsurance, updateInsurance }),
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isAssociationAdmin: () => true })),
}))

const INSURANCE: Insurance = {
  id: 'insurance-ana',
  member_id: 'member-ana',
  member_name: 'Ana Example',
  insurance_type: 'civil_liability',
  policy_number: 'POL-1',
  insurance_company: 'Aseguradora Example',
  coverage_amount: 0,
  start_date: '2026-10-01T00:00:00',
  end_date: '2027-09-30T23:59:59',
  status: 'active',
  created_at: '2026-10-01T00:00:00',
  updated_at: '2026-10-01T00:00:00',
}

const MEMBERS = [{ id: 'member-ana', name: 'Ana Example' }]

const renderEditing = (insurance: Insurance = INSURANCE) =>
  renderWithProviders(<InsuranceForm open onOpenChange={vi.fn()} insurance={insurance} memberOptions={MEMBERS} />)

describe('InsuranceForm', () => {
  beforeEach(() => {
    createInsurance.mockClear()
    updateInsurance.mockClear()
    vi.mocked(usePermissions).mockReturnValue({ isAssociationAdmin: () => true } as ReturnType<typeof usePermissions>)
  })

  it('edits type company and policy', async () => {
    renderEditing()

    expect(screen.getByRole('combobox', { name: 'Tipo de seguro *' })).toHaveTextContent('Responsabilidad civil (RC)')
    await userEvent.click(screen.getByRole('combobox', { name: 'Tipo de seguro *' }))
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Accidentes' }))
    await userEvent.clear(screen.getByLabelText('Compañía de seguros *'))
    await userEvent.type(screen.getByLabelText('Compañía de seguros *'), 'Otra Example')
    await userEvent.clear(screen.getByLabelText('Número de póliza *'))
    await userEvent.type(screen.getByLabelText('Número de póliza *'), 'POL-2')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(updateInsurance).toHaveBeenCalledWith('insurance-ana', {
      insurance_type: 'accident',
      insurance_company: 'Otra Example',
      policy_number: 'POL-2',
      coverage_amount: 0,
      start_date: '2026-10-01',
      end_date: '2027-09-30',
    })
  })

  it('annuls and reactivates an insurance', async () => {
    const { rerender } = renderEditing()

    await userEvent.click(screen.getByRole('button', { name: 'Anular seguro' }))
    expect(updateInsurance).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Anular seguro' }))
    expect(updateInsurance).toHaveBeenLastCalledWith('insurance-ana', { annulled: true })

    rerender(<InsuranceForm open onOpenChange={vi.fn()} insurance={{ ...INSURANCE, status: 'cancelled' }} memberOptions={MEMBERS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Reactivar seguro' }))
    expect(updateInsurance).toHaveBeenLastCalledWith('insurance-ana', { annulled: false })
  })

  it('does not offer annulment to a club admin', () => {
    vi.mocked(usePermissions).mockReturnValue({ isAssociationAdmin: () => false } as ReturnType<typeof usePermissions>)
    renderEditing()

    expect(screen.queryByRole('button', { name: 'Anular seguro' })).not.toBeInTheDocument()
  })
})
