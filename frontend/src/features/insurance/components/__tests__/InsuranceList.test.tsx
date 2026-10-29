import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { InsuranceList } from '../InsuranceList'
import type { Insurance } from '../../data/schemas/insurance.schema'

const context = vi.hoisted(() => ({
  insuranceList: [] as Insurance[],
  setFilters: vi.fn(),
  deleteInsurance: vi.fn(),
  allowed: new Set<string>(),
  role: 'super_admin',
}))

vi.mock('../../hooks/useInsuranceContext', () => ({
  useInsuranceContext: () => ({
    insuranceList: context.insuranceList,
    isLoading: false,
    error: null,
    filters: {},
    setFilters: context.setFilters,
    total: context.insuranceList.length,
    limit: 0,
    offset: 0,
    deleteInsurance: context.deleteInsurance,
    selectInsurance: vi.fn(),
    setPagination: vi.fn(),
    createInsurance: vi.fn(),
    updateInsurance: vi.fn(),
  }),
}))

vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubsQuery: () => ({ data: [{ id: 'club-1', name: 'Example Club' }] }),
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canAccess: ({ action }: { action: string }) => context.allowed.has(action),
    isAssociationAdmin: () => context.role === 'super_admin',
  }),
}))

vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: () => ({ data: [] }),
}))

const insurance: Insurance = {
  id: 'insurance-1',
  member_id: 'member-1',
  member_name: 'Ana Example',
  insurance_type: 'accident',
  policy_number: 'POL-1',
  insurance_company: 'Aseguradora Example',
  coverage_amount: 100000,
  start_date: '2020-01-01T00:00:00',
  end_date: '2020-12-31T00:00:00',
  status: 'expired',
  created_at: '2020-01-01T00:00:00',
  updated_at: '2020-01-01T00:00:00',
}

const openFilters = () => userEvent.click(screen.getByRole('button', { name: /Filtros/ }))

describe('InsuranceList', () => {
  beforeEach(() => {
    context.insuranceList = [insurance]
    context.allowed = new Set(['read', 'create', 'update', 'delete'])
    context.setFilters.mockClear()
    context.role = 'super_admin'
    context.deleteInsurance.mockClear()
  })

  it("shows the member's DNI on the card and in the table", () => {
    context.insuranceList = [{ ...insurance, member_dni: '12345678Z' }]
    renderWithProviders(<InsuranceList />)

    expect(screen.getAllByText(/DNI 12345678Z/)).toHaveLength(2)
  })

  it('shows no DNI label when the member has none', () => {
    renderWithProviders(<InsuranceList />)

    expect(screen.queryByText(/DNI/)).not.toBeInTheDocument()
  })

  it('labels the insurance filters', async () => {
    renderWithProviders(<InsuranceList />)

    await openFilters()

    expect(screen.getByRole('combobox', { name: 'Tipo de seguro' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Estado' })).toBeInTheDocument()
  })

  it('names the insurance types in plain words', async () => {
    renderWithProviders(<InsuranceList />)
    await openFilters()

    await userEvent.click(screen.getByRole('combobox', { name: 'Tipo de seguro' }))

    const options = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(options).toEqual(['Todos', 'Accidentes', 'Responsabilidad civil (RC)'])
  })

  it('shows amounts as euros and status as a word', () => {
    renderWithProviders(<InsuranceList />)

    expect(screen.getAllByText(/100\.000,00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Caducado').length).toBeGreaterThan(0)
  })

  it('hides edit and delete when the role cannot use them', async () => {
    context.allowed = new Set(['read', 'create'])
    renderWithProviders(<InsuranceList />)

    expect(screen.queryByRole('button', { name: /Acciones de/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByText('Ana Example')[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('lets a club admin edit but not delete', async () => {
    context.allowed = new Set(['read', 'create', 'update'])
    renderWithProviders(<InsuranceList />)

    await userEvent.click(screen.getAllByRole('button', { name: /Acciones de/ })[0])

    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Eliminar' })).not.toBeInTheDocument()
  })

  it('asks for confirmation before deleting', async () => {
    renderWithProviders(<InsuranceList />)

    await userEvent.click(screen.getAllByRole('button', { name: /Acciones de/ })[0])
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))

    expect(context.deleteInsurance).not.toHaveBeenCalled()
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }))
    expect(context.deleteInsurance).toHaveBeenCalledWith('insurance-1')
  })

  it('opens the detail when tapping the row', async () => {
    renderWithProviders(<InsuranceList />)

    await userEvent.click(screen.getAllByText('Ana Example')[0])

    expect(await screen.findByRole('dialog')).toHaveTextContent('Aseguradora Example')
  })

  it("finds an insurance by its member's DNI", async () => {
    context.insuranceList = [
      { ...insurance, member_dni: '12345678Z' },
      { ...insurance, id: 'insurance-2', member_id: 'member-2', member_name: 'Bea Example', member_dni: '87654321X' },
    ]
    renderWithProviders(<InsuranceList />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Nombre, DNI o póliza' }), '12345678z')

    expect(screen.getAllByText('Ana Example').length).toBeGreaterThan(0)
    expect(screen.queryByText('Bea Example')).not.toBeInTheDocument()
  })

  it('counts only the insurances the search leaves in the footer', async () => {
    context.insuranceList = [
      { ...insurance, member_dni: '12345678Z' },
      { ...insurance, id: 'insurance-2', member_id: 'member-2', member_name: 'Bea Example', member_dni: '87654321X' },
    ]
    renderWithProviders(<InsuranceList />)
    expect(screen.getByText('2 seguros')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Nombre, DNI o póliza' }), '12345678z')

    expect(screen.getByText(/^1 seguro/)).toBeInTheDocument()
    expect(screen.queryByText('2 seguros')).not.toBeInTheDocument()
  })

  it('offers to clear filters when the search matches nothing', async () => {
    renderWithProviders(<InsuranceList />)

    await userEvent.type(screen.getByRole('searchbox'), 'zzz')

    expect(await screen.findByRole('button', { name: 'Quitar filtros' })).toBeInTheDocument()
  })

  it('offers Renovar in one tap on an expired insurance, not on one in force', () => {
    context.insuranceList = [
      insurance,
      { ...insurance, id: 'insurance-2', member_id: 'member-2', member_name: 'Bea Example', status: 'active', end_date: '2099-12-31T00:00:00' },
    ]
    renderWithProviders(<InsuranceList />)

    expect(screen.getAllByRole('link', { name: /^Renovar \S+ Ana Example$/ })[0]).toHaveAttribute('href', expect.stringMatching(/^\/payments\?renovar=member-1&que=accidentes&anio=\d{4}$/))
    expect(screen.queryByRole('link', { name: /Bea Example/ })).not.toBeInTheDocument()
  })

  it('does not offer Renovar to whoever cannot pay', () => {
    context.allowed = new Set(['read'])
    renderWithProviders(<InsuranceList />)

    expect(screen.queryByRole('link', { name: /^Renovar / })).not.toBeInTheDocument()
  })

  it('offers Renovar on an insurance whose end date has passed even if it is still marked active', () => {
    context.insuranceList = [{ ...insurance, status: 'active', insurance_type: 'civil_liability' }]
    renderWithProviders(<InsuranceList />)

    expect(screen.getAllByRole('link', { name: /^Renovar \S+ Ana Example$/ })[0]).toHaveAttribute('href', expect.stringMatching(/^\/payments\?renovar=member-1&que=rc&anio=\d{4}$/))
  })

  it('offers a Club filter to the super admin', async () => {
    renderWithProviders(<InsuranceList />)

    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))

    expect(screen.getByText('Club', { selector: 'label' })).toBeInTheDocument()
  })

  it('does not offer a Club filter to a club admin', async () => {
    context.role = 'club_admin'
    renderWithProviders(<InsuranceList />)

    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))

    expect(screen.queryByText('Club', { selector: 'label' })).not.toBeInTheDocument()
  })

  it('filters insurances by the chosen club', async () => {
    renderWithProviders(<InsuranceList />)

    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Club' }))
    await userEvent.click(screen.getByRole('option', { name: 'Example Club' }))

    expect(context.setFilters.mock.calls.at(-1)?.[0]).toMatchObject({ club_id: 'club-1', offset: 0 })
  })

  it('clears the club with Quitar filtros', async () => {
    renderWithProviders(<InsuranceList />)

    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Club' }))
    await userEvent.click(screen.getByRole('option', { name: 'Example Club' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Quitar filtros' })[0])

    expect(context.setFilters.mock.calls.at(-1)?.[0]).toMatchObject({ club_id: undefined })
  })
})
