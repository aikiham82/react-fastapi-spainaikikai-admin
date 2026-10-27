import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { InvoiceList } from '../InvoiceList'
import type { Invoice, InvoiceFilters } from '../../data/schemas/invoice.schema'

const context = vi.hoisted(() => ({
  invoices: [] as Invoice[],
  filters: {} as InvoiceFilters,
  setFilters: vi.fn(),
  downloadPdf: vi.fn(),
}))

vi.mock('../../hooks/useInvoiceContext', () => ({
  useInvoiceContext: () => ({
    invoices: context.invoices,
    isLoading: false,
    error: null,
    filters: context.filters,
    setFilters: context.setFilters,
    downloadPdf: context.downloadPdf,
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
  notes: '',
  created_at: '2026-10-15T07:57:17.442000',
  updated_at: '2026-10-15T07:57:17.442000',
}

const chooseStatus = (label: string) => userEvent.click(screen.getByRole('radio', { name: new RegExp(`^${label}`) }))

describe('InvoiceList', () => {
  beforeEach(() => {
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

    await chooseStatus('Todas')

    expect(context.setFilters).toHaveBeenLastCalledWith({ status: undefined })
  })

  it('keeps the status filter on screen when no invoice matches', () => {
    context.invoices = []

    renderWithProviders(<InvoiceList />)

    expect(screen.getByRole('radiogroup', { name: 'Estado' })).toBeInTheDocument()
  })

  it('offers the download for an invoice whose PDF is generated on request', () => {
    renderWithProviders(<InvoiceList />)

    expect(screen.getAllByRole('button', { name: 'Descargar PDF' }).length).toBeGreaterThan(0)
  })

  describe('search', () => {
    const accentedClubInvoice: Invoice = {
      ...issuedClubInvoice,
      id: 'invoice-2',
      invoice_number: '2026-000007',
      customer_name: 'Aikido Almería Example',
    }

    const visibleNumbers = () =>
      [...new Set(screen.queryAllByText(/^20\d\d-\d{6}$/).map((el) => el.textContent))]

    beforeEach(() => {
      context.invoices = [issuedClubInvoice, accentedClubInvoice]
    })

    it('finds an invoice by its number', async () => {
      renderWithProviders(<InvoiceList />)

      await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar factura o cliente' }), '2025-000002')

      await waitFor(() => expect(visibleNumbers()).toEqual(['2025-000002']))
    })

    it('finds an invoice by client name typed without accents', async () => {
      renderWithProviders(<InvoiceList />)

      await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar factura o cliente' }), 'ALMERIA')

      await waitFor(() => expect(visibleNumbers()).toEqual(['2026-000007']))
    })

    it('clears a search that hid every invoice', async () => {
      renderWithProviders(<InvoiceList />)

      await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar factura o cliente' }), 'zaragoza')
      await userEvent.click(await screen.findByRole('button', { name: 'Quitar filtros' }))

      expect(screen.getByRole('searchbox', { name: 'Buscar factura o cliente' })).toHaveValue('')
      await waitFor(() => expect(visibleNumbers()).toEqual(['2025-000002', '2026-000007']))
    })

    it('says so when nothing matches, keeping the filters on screen', async () => {
      renderWithProviders(<InvoiceList />)

      await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar factura o cliente' }), 'zaragoza')

      expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
      expect(screen.getByText('No se encontraron facturas para tu búsqueda')).toBeInTheDocument()
      expect(screen.getByRole('radiogroup', { name: 'Estado' })).toBeInTheDocument()
    })
  })

  it('offers only the statuses the backend knows', () => {
    renderWithProviders(<InvoiceList />)

    const radios = screen.getAllByRole('radio').map((r) => r.textContent)
    expect(radios).toEqual(['Todas', 'Borrador', 'Emitida', 'Pagada', 'Cancelada'])
  })

  describe('detail', () => {
    const openDetail = async () => {
      await userEvent.click(screen.getAllByText('Example Club')[0])
      return within(await screen.findByRole('dialog'))
    }

    it('offers Descargar PDF in the invoice detail', async () => {
      renderWithProviders(<InvoiceList />)

      const dialog = await openDetail()
      await userEvent.click(dialog.getByRole('button', { name: 'Descargar PDF' }))

      expect(context.downloadPdf).toHaveBeenCalledWith('invoice-1', '2025-000002')
    })

    it('hides empty invoice fields', async () => {
      renderWithProviders(<InvoiceList />)

      const dialog = await openDetail()

      expect(dialog.queryByText('NIF/CIF')).not.toBeInTheDocument()
      expect(dialog.queryByText('Dirección')).not.toBeInTheDocument()
      expect(dialog.queryByText('Fecha de vencimiento')).not.toBeInTheDocument()
      expect(dialog.queryByText('Fecha de pago')).not.toBeInTheDocument()
      expect(dialog.queryByText('Notas')).not.toBeInTheDocument()
      expect(dialog.queryByText('-')).not.toBeInTheDocument()
      expect(dialog.getByText('Fecha de emisión')).toBeInTheDocument()
    })

    it('explains what the status means', async () => {
      renderWithProviders(<InvoiceList />)

      const dialog = await openDetail()

      expect(dialog.getByText('Factura generada y enviada.')).toBeInTheDocument()
    })
  })
})
