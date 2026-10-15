import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { InvoiceList } from '../InvoiceList'
import type { Invoice, InvoiceFilters } from '../../data/schemas/invoice.schema'

const context = vi.hoisted(() => ({
  invoices: [] as Invoice[],
  filters: {} as InvoiceFilters,
  setFilters: vi.fn(),
}))

vi.mock('../../hooks/useInvoiceContext', () => ({
  useInvoiceContext: () => ({
    invoices: context.invoices,
    isLoading: false,
    error: null,
    filters: context.filters,
    setFilters: context.setFilters,
    downloadPdf: vi.fn(),
    regeneratePdf: vi.fn(),
    isDownloading: false,
    isRegenerating: false,
  }),
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true }),
}))

const issuedClubInvoice: Invoice = {
  id: 'invoice-1',
  invoice_number: '2025-000002',
  payment_id: 'payment-1',
  member_id: 'club-1',
  club_id: 'club-1',
  license_id: null,
  customer_name: 'Example Club',
  customer_address: '',
  customer_tax_id: '',
  customer_email: null,
  line_items: [{ description: 'Licencia DAN', quantity: 3, unit_price: 20, tax_rate: 0 }],
  subtotal: 60,
  tax_amount: 0,
  total_amount: 60,
  status: 'issued',
  issue_date: '2026-10-15T07:57:17.442000',
  due_date: null,
  paid_date: null,
  pdf_path: null,
  notes: '',
  created_at: '2026-10-15T07:57:17.442000',
  updated_at: '2026-10-15T07:57:17.442000',
}

const chooseStatus = async (label: string) => {
  await userEvent.click(screen.getByRole('combobox'))
  await userEvent.click(await screen.findByRole('option', { name: label }))
}

describe('InvoiceList', () => {
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.scrollIntoView = () => {}
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    context.invoices = [issuedClubInvoice]
    context.filters = {}
  })

  it('renders an issued invoice without a PDF', () => {
    renderWithProviders(<InvoiceList />)

    expect(screen.getAllByText('2025-000002').length).toBeGreaterThan(0)
  })

  it('filters by issued when "Emitida" is chosen', async () => {
    renderWithProviders(<InvoiceList />)

    await chooseStatus('Emitida')

    expect(context.setFilters).toHaveBeenLastCalledWith({ status: 'issued' })
  })

  it('clears the status filter when "Todos" is chosen', async () => {
    context.filters = { status: 'issued' }
    renderWithProviders(<InvoiceList />)

    await chooseStatus('Todos')

    expect(context.setFilters).toHaveBeenLastCalledWith({ status: undefined })
  })

  it('keeps the status filter on screen when no invoice matches', () => {
    context.invoices = []

    renderWithProviders(<InvoiceList />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('offers only the statuses the backend knows', async () => {
    renderWithProviders(<InvoiceList />)

    await userEvent.click(screen.getByRole('combobox'))

    const options = (await screen.findAllByRole('option')).map((o) => o.textContent)
    expect(options).toEqual(['Todos', 'Borrador', 'Emitida', 'Pagada', 'Cancelada'])
  })
})
