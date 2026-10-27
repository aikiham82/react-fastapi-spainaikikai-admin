import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { userEvent } from '@/test-utils'
import { LicenseList } from '../LicenseList'
import type { License } from '../../data/schemas/license.schema'

const context = vi.hoisted(() => ({
  licenses: [] as License[],
  canCreate: true,
  canUpdate: true,
}))

vi.mock('../../hooks/useLicenseContext', () => ({
  useLicenseContext: () => ({
    licenses: context.licenses,
    isLoading: false,
    error: null,
    filters: {},
    setFilters: vi.fn(),
    total: context.licenses.length,
    limit: 0,
    offset: 0,
    deleteLicense: vi.fn(),
    selectLicense: vi.fn(),
    setPagination: vi.fn(),
  }),
}))

vi.mock('../../../members/hooks/useMemberContext', () => ({
  useMemberContext: () => ({ members: [] }),
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canAccess: ({ action }: { action: string }) => (action === 'update' ? context.canUpdate : context.canCreate),
  }),
}))

const daysFromNow = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 19)
}

const makeLicense = (id: string, member: string, expiryDays: number, status: License['status']): License => ({
  id,
  license_number: `LIC-${id}`,
  member_id: `member-${id}`,
  member_name: member,
  issue_date: '2025-01-15T00:00:00',
  expiry_date: daysFromNow(expiryDays),
  status,
  dan_grade: 1,
  technical_grade: 'dan',
  instructor_category: 'none',
  age_category: 'adulto',
  created_at: '2025-01-15T00:00:00',
  updated_at: '2025-01-15T00:00:00',
})

const renderList = (url = '/licenses') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <LicenseList />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const tableMembers = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent)

describe('LicenseList', () => {
  beforeEach(() => {
    context.canCreate = true
    context.canUpdate = true
    context.licenses = [
      makeLicense('1', 'Bea Active', 200, 'active'),
      makeLicense('2', 'Carlos Soon', 10, 'active'),
      makeLicense('3', 'Dora Expired', -40, 'expired'),
    ]
  })

  it('orders expired and expiring licences first', () => {
    renderList()

    const names = tableMembers().map((cell) => ['Dora Expired', 'Carlos Soon', 'Bea Active'].find((n) => cell?.includes(n)))
    expect(names).toEqual(['Dora Expired', 'Carlos Soon', 'Bea Active'])
  })

  it('shows a word for every status', () => {
    renderList()

    expect(screen.getAllByText('Caducada').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Caduca pronto').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Activa').length).toBeGreaterThan(0)
  })

  it('preselects Caducadas from ?estado=caducadas', () => {
    renderList('/licenses?estado=caducadas')

    expect(screen.getByRole('radio', { name: /Caducadas/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByText(/Dora Expired/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Bea Active/)).not.toBeInTheDocument()
  })

  it('preselects Caducan pronto from ?estado=caducan-pronto', () => {
    renderList('/licenses?estado=caducan-pronto')

    expect(screen.getByRole('radio', { name: /Caducan pronto/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText(/Dora Expired/)).not.toBeInTheDocument()
  })

  it('counts each chip', () => {
    renderList()

    expect(screen.getByRole('radio', { name: /Caducadas/ })).toHaveTextContent('1')
    expect(screen.getByRole('radio', { name: /Caducan pronto/ })).toHaveTextContent('1')
  })

  it('offers an explicit Editar action in the detail dialog', async () => {
    renderList()

    await userEvent.click(screen.getAllByRole('button', { name: /LIC-1/ })[0])

    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('does not offer Editar to a read-only role', async () => {
    context.canCreate = false
    context.canUpdate = false
    renderList()

    await userEvent.click(screen.getAllByRole('button', { name: /LIC-1/ })[0])

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('shows the club admin hint instead of a create button', () => {
    context.canCreate = false
    context.canUpdate = false
    renderList()

    expect(screen.getByText('Las licencias se crean al registrar el pago de la temporada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a pagar' })).toHaveAttribute('href', '/payments')
    expect(screen.queryByRole('button', { name: /Nueva licencia/i })).not.toBeInTheDocument()
  })

  it('explains an empty chip and lets the user clear it', async () => {
    context.licenses = [makeLicense('1', 'Bea Active', 200, 'active')]
    renderList('/licenses?estado=caducadas')

    expect(screen.getByText('No hay licencias caducadas')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(screen.getAllByText(/Bea Active/).length).toBeGreaterThan(0)
  })

  it('offers Renovar in one tap only on expired and expiring licences', () => {
    renderList()

    const renew = screen.getAllByRole('link', { name: /^Renovar / })
    expect(renew.map((link) => link.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Renovar \d{4} Carlos Soon$/), expect.stringMatching(/^Renovar \d{4} Dora Expired$/)]),
    )
    expect(screen.queryByRole('link', { name: /Bea Active/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^Renovar \d{4} Dora Expired$/ })[0]).toHaveAttribute('href', expect.stringMatching(/^\/payments\?renovar=member-3&que=licencia&anio=\d{4}$/))
  })

  it("a deregistered member's expired licence reads De baja without Renovar", () => {
    context.licenses = [{ ...makeLicense('4', 'Elena Gone', -300, 'expired'), member_status: 'inactive' }]
    renderList()

    expect(screen.getAllByText('De baja').length).toBeGreaterThan(0)
    expect(screen.queryByText('Caducada')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Renovar / })).not.toBeInTheDocument()
  })

  it('chips do not count deregistered members', () => {
    context.licenses = [
      ...context.licenses,
      { ...makeLicense('4', 'Elena Gone', -300, 'expired'), member_status: 'inactive' },
      { ...makeLicense('5', 'Fede Gone', 10, 'active'), member_status: 'inactive' },
    ]
    renderList()

    expect(screen.getByRole('radio', { name: /Caducadas/ })).toHaveTextContent('1')
    expect(screen.getByRole('radio', { name: /Caducan pronto/ })).toHaveTextContent('1')
  })

  it('does not offer Renovar to whoever cannot pay', () => {
    context.canCreate = false
    renderList()

    expect(screen.queryByRole('link', { name: /^Renovar / })).not.toBeInTheDocument()
  })
})
