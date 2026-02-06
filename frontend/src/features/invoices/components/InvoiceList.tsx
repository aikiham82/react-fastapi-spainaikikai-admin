import { useState } from 'react';
import { useInvoiceContext } from '../hooks/useInvoiceContext';
import { FileText, Search, Download, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usePermissions } from '@/core/hooks/usePermissions';
import type { Invoice, InvoiceStatus } from '../data/schemas/invoice.schema';
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_VARIANTS,
  formatCurrency,
  formatDate,
} from '../data/schemas/invoice.schema';

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
    isRegenerating,
  } = useInvoiceContext();
  const { canAccess } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterStatus = (value: string) => {
    setStatusFilter(value);
    setFilters({ ...filters, status: value as InvoiceStatus || undefined });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Note: Backend filtering by member_id would need to be implemented
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error al cargar las facturas</p>
        <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay facturas</h3>
        <p className="text-gray-600 mb-4">
          {statusFilter ? 'No se encontraron facturas con ese estado' : 'No hay facturas registradas'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por numero de factura o cliente..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={handleFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{invoice.invoice_number}</h3>
                <p className="text-sm text-gray-600">{invoice.customer_name || '-'}</p>
                <p className="text-sm text-gray-600">{formatDate(invoice.issue_date)}</p>
              </div>
              <Badge variant={INVOICE_STATUS_VARIANTS[invoice.status]}>
                {INVOICE_STATUS_LABELS[invoice.status]}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium text-gray-900 tabular-nums">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <InvoiceDetailDialog invoice={invoice} />
              {invoice.pdf_path && (
                <Button variant="ghost" size="icon" onClick={() => downloadPdf(invoice.id, invoice.invoice_number)} disabled={isDownloading} aria-label="Descargar PDF">
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {canAccess({ resource: 'invoices', action: 'update' }) && (
                <Button variant="ghost" size="icon" onClick={() => regeneratePdf(invoice.id)} disabled={isRegenerating} aria-label="Regenerar PDF">
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">N Factura</th>
                <th className="text-left p-4 font-medium text-gray-900">Cliente</th>
                <th className="text-left p-4 font-medium text-gray-900">Fecha Emision</th>
                <th className="text-right p-4 font-medium text-gray-900">Subtotal</th>
                <th className="text-right p-4 font-medium text-gray-900">IVA</th>
                <th className="text-right p-4 font-medium text-gray-900">Total</th>
                <th className="text-center p-4 font-medium text-gray-900">Estado</th>
                <th className="text-right p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onDownload={downloadPdf}
                  onRegenerate={regeneratePdf}
                  isDownloading={isDownloading}
                  isRegenerating={isRegenerating}
                  canUpdate={canAccess({ resource: 'invoices', action: 'update' })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface InvoiceRowProps {
  invoice: Invoice;
  onDownload: (invoiceId: string, invoiceNumber: string) => void;
  onRegenerate: (invoiceId: string) => void;
  isDownloading: boolean;
  isRegenerating: boolean;
  canUpdate: boolean;
}

const InvoiceRow = ({
  invoice,
  onDownload,
  onRegenerate,
  isDownloading,
  isRegenerating,
  canUpdate,
}: InvoiceRowProps) => {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-4">
        <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
      </td>
      <td className="p-4">
        <p className="text-gray-700">{invoice.customer_name || '-'}</p>
        {invoice.customer_tax_id && (
          <p className="text-sm text-gray-500">{invoice.customer_tax_id}</p>
        )}
      </td>
      <td className="p-4 text-gray-600">{formatDate(invoice.issue_date)}</td>
      <td className="p-4 text-right text-gray-600 tabular-nums">{formatCurrency(invoice.subtotal)}</td>
      <td className="p-4 text-right text-gray-600 tabular-nums">{formatCurrency(invoice.tax_amount)}</td>
      <td className="p-4 text-right font-medium text-gray-900 tabular-nums">
        {formatCurrency(invoice.total_amount)}
      </td>
      <td className="p-4 text-center">
        <Badge variant={INVOICE_STATUS_VARIANTS[invoice.status]}>
          {INVOICE_STATUS_LABELS[invoice.status]}
        </Badge>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <InvoiceDetailDialog invoice={invoice} />

          {invoice.pdf_path && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDownload(invoice.id, invoice.invoice_number)}
              disabled={isDownloading}
              aria-label="Descargar PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}

          {canUpdate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRegenerate(invoice.id)}
              disabled={isRegenerating}
              aria-label="Regenerar PDF"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};

const InvoiceDetailDialog = ({ invoice }: { invoice: Invoice }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ver detalles">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Factura {invoice.invoice_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Cliente</p>
              <p className="text-sm text-gray-600">{invoice.customer_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">NIF/CIF</p>
              <p className="text-sm text-gray-600">{invoice.customer_tax_id || '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">Direccion</p>
            <p className="text-sm text-gray-600">{invoice.customer_address || '-'}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Fecha Emision</p>
              <p className="text-sm text-gray-600">{formatDate(invoice.issue_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Fecha Vencimiento</p>
              <p className="text-sm text-gray-600">{formatDate(invoice.due_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Fecha Pago</p>
              <p className="text-sm text-gray-600">{formatDate(invoice.paid_date)}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Lineas de Factura</p>
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">Descripcion</th>
                    <th className="text-right p-2">Cant.</th>
                    <th className="text-right p-2">Precio</th>
                    <th className="text-right p-2">IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="p-2 text-right">{item.tax_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-48 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA:</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <p className="text-sm font-medium text-gray-900">Notas</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
