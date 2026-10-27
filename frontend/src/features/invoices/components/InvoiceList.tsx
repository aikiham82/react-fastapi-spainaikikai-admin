import { useMemo, useState } from 'react';
import { Download, ReceiptText } from 'lucide-react';
import { useDebounce } from '@/core/hooks/useDebounce';
import { IconTile } from '@/components/ui/graphic';
import { useInvoiceContext } from '../hooks/useInvoiceContext';
import { Button } from '@/components/ui/button';
import { ChipGroup, EmptyState, ListToolbar, RowActions, ListLoading, ListError } from '@/components/ui/list-controls';
import { StatusBadge } from '@/components/ui/status-badge';
import { usePermissions } from '@/core/hooks/usePermissions';
import { formatCurrency, formatDate } from '@/core/utils/format';
import type { Invoice, InvoiceStatus } from '../data/schemas/invoice.schema';
import { INVOICE_STATUS_LABELS } from '../data/schemas/invoice.schema';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';
import { INVOICE_STATUS_ICONS, INVOICE_STATUS_TONES } from './invoiceDisplay';

import { foldForSearch } from '@/core/utils/search';

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
    return <ListLoading />;
  }

  if (error) {
    return <ListError title="Error al cargar las facturas" description={error.message} />;
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
        <ul className="space-y-3">
          {visibleInvoices.map((invoice) => (
            <li
              key={invoice.id}
              data-testid="invoice-row"
              onClick={() => setInvoiceForDetail(invoice)}
              className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-[18px] bg-card p-3 shadow-card transition-shadow hover:shadow-md sm:flex-nowrap sm:p-4"
            >
              <IconTile icon={ReceiptText} tone="brand" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="block max-w-full truncate text-left text-[15px] font-semibold text-foreground"
                  onClick={() => setInvoiceForDetail(invoice)}
                >
                  {invoice.customer_name || invoice.invoice_number}
                </button>
                <p className="text-sm text-muted-foreground">
                  <span className="block sm:inline">{invoice.invoice_number}</span>
                  <span className="hidden sm:inline" aria-hidden="true">
                    {' · '}
                  </span>
                  <span className="block sm:inline">{formatDate(invoice.issue_date)}</span>
                </p>
              </div>
              <span className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(invoice.total_amount)}</span>
              <div
                className="flex w-full items-center gap-1 pl-14 sm:w-auto sm:pl-0"
                onClick={(event) => event.stopPropagation()}
              >
                <StatusBadge
                  tone={INVOICE_STATUS_TONES[invoice.status]}
                  icon={INVOICE_STATUS_ICONS[invoice.status]}
                  className="mr-auto sm:mr-2"
                >
                  {INVOICE_STATUS_LABELS[invoice.status]}
                </StatusBadge>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Descargar PDF"
                  className="pointer-coarse:h-11"
                  onClick={() => downloadPdf(invoice.id, invoice.invoice_number)}
                  disabled={isDownloading}
                >
                  <Download className="size-4" aria-hidden="true" />
                  PDF
                </Button>
                {canUpdate && <RowActions label={invoice.invoice_number} actions={rowActions(invoice)} />}
              </div>
            </li>
          ))}
        </ul>
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
