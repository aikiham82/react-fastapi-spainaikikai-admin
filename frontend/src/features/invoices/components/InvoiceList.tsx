import { useMemo, useState } from 'react';
import { useDebounce } from '@/core/hooks/useDebounce';
import { useInvoiceContext } from '../hooks/useInvoiceContext';
import { Button } from '@/components/ui/button';
import { ChipGroup, EmptyState, ListToolbar, RowActions } from '@/components/ui/list-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { formatCurrency, formatDate } from '@/core/utils/format';
import type { Invoice, InvoiceStatus } from '../data/schemas/invoice.schema';
import { INVOICE_STATUS_LABELS } from '../data/schemas/invoice.schema';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';
import { INVOICE_STATUS_TONES } from './invoiceDisplay';

const ALL_STATUSES = 'all';

const STATUS_OPTIONS = [
  { value: ALL_STATUSES, label: 'Todas' },
  ...Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const emptyListMessage = (searchHidAll: boolean, statusFilter: string): string => {
  if (searchHidAll) return 'No se encontraron facturas para tu búsqueda';
  if (statusFilter === ALL_STATUSES) return 'No hay facturas registradas';
  return 'No se encontraron facturas con ese estado';
};

const foldForSearch = (text: string): string =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export const InvoiceList = () => {
  const {
    invoices,
    isLoading,
    error,
    filters,
    setFilters,
    downloadPdf,
    regeneratePdf,
    isDownloading,
  } = useInvoiceContext();
  const { canAccess } = usePermissions();
  const canUpdate = canAccess({ resource: 'invoices', action: 'update' });
  const statusFilter = filters.status ?? ALL_STATUSES;
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceForDetail, setInvoiceForDetail] = useState<Invoice | null>(null);
  const debouncedSearch = useDebounce(foldForSearch(searchTerm.trim()));

  const visibleInvoices = useMemo(
    () =>
      debouncedSearch
        ? invoices.filter((invoice) =>
            foldForSearch(`${invoice.invoice_number} ${invoice.customer_name ?? ''}`).includes(debouncedSearch)
          )
        : invoices,
    [invoices, debouncedSearch]
  );

  const handleFilterStatus = (value: string) => {
    setFilters({ ...filters, status: value === ALL_STATUSES ? undefined : (value as InvoiceStatus) });
  };

  const clearFilters = () => {
    setSearchTerm('');
    if (filters.status) setFilters({ ...filters, status: undefined });
  };

  const downloadFromDetail = (invoice: Invoice) => downloadPdf(invoice.id, invoice.invoice_number);

  const rowActions = (invoice: Invoice) => [
    { label: 'Ver factura', onSelect: () => setInvoiceForDetail(invoice) },
    ...(canUpdate ? [{ label: 'Regenerar PDF', onSelect: () => regeneratePdf(invoice.id) }] : []),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-danger">Error al cargar las facturas</p>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const canClear = invoices.length > 0 || statusFilter !== ALL_STATUSES;

  return (
    <div className="space-y-4">
      <ListToolbar search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Buscar factura o cliente' }} />
      <ChipGroup label="Estado" value={statusFilter} onChange={handleFilterStatus} options={STATUS_OPTIONS} />

      {visibleInvoices.length === 0 ? (
        <EmptyState
          title={invoices.length > 0 ? 'Sin resultados' : 'No hay facturas'}
          description={emptyListMessage(invoices.length > 0, statusFilter)}
          onClear={canClear ? clearFilters : undefined}
        />
      ) : (
        <>
          <ul className="md:hidden">
            {visibleInvoices.map((invoice) => (
              <li
                key={invoice.id}
                onClick={() => setInvoiceForDetail(invoice)}
                className="cursor-pointer space-y-2 border-b border-border py-3 first:border-t"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="text-left text-[15px] font-medium text-foreground"
                      onClick={() => setInvoiceForDetail(invoice)}
                    >
                      {invoice.customer_name || invoice.invoice_number}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {invoice.invoice_number} · {formatDate(invoice.issue_date)}
                    </p>
                  </div>
                  <StatusBadge tone={INVOICE_STATUS_TONES[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</StatusBadge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium tabular-nums text-foreground">{formatCurrency(invoice.total_amount)}</span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="pointer-coarse:h-11"
                      onClick={() => downloadPdf(invoice.id, invoice.invoice_number)}
                      disabled={isDownloading}
                    >
                      Descargar PDF
                    </Button>
                    {canUpdate && <RowActions label={invoice.invoice_number} actions={rowActions(invoice)} />}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium">Emisión</th>
                <th className="py-2 pr-3 text-right font-medium">Total</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => setInvoiceForDetail(invoice)}
                  className="cursor-pointer border-b border-border hover:bg-muted/50"
                >
                  <td className="py-3 pr-3">
                    <button type="button" className="text-left font-medium text-foreground" onClick={() => setInvoiceForDetail(invoice)}>
                      {invoice.customer_name || invoice.invoice_number}
                    </button>
                    <p className="text-muted-foreground">{invoice.invoice_number}</p>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3 text-muted-foreground">{formatDate(invoice.issue_date)}</td>
                  <td className="whitespace-nowrap py-3 pr-3 text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge tone={INVOICE_STATUS_TONES[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</StatusBadge>
                  </td>
                  <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Descargar PDF"
                        onClick={() => downloadPdf(invoice.id, invoice.invoice_number)}
                        disabled={isDownloading}
                      >
                        PDF
                      </Button>
                      {canUpdate && <RowActions label={invoice.invoice_number} actions={rowActions(invoice)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <InvoiceDetailDialog
        invoice={invoiceForDetail}
        onClose={() => setInvoiceForDetail(null)}
        onDownload={downloadFromDetail}
        isDownloading={isDownloading}
      />
    </div>
  );
};
