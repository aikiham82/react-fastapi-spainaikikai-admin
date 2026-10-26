import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatDate } from '@/core/utils/format';
import type { Invoice } from '../data/schemas/invoice.schema';
import { INVOICE_STATUS_LABELS } from '../data/schemas/invoice.schema';
import { INVOICE_STATUS_EXPLANATIONS, INVOICE_STATUS_TONES } from './invoiceDisplay';

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
  onDownload: (invoice: Invoice) => void;
  isDownloading: boolean;
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 text-[15px] text-foreground">{children}</dd>
  </div>
);

export const InvoiceDetailDialog = ({ invoice, onClose, onDownload, isDownloading }: InvoiceDetailDialogProps) => (
  <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-[600px]">
      {invoice && (
        <>
          <DialogHeader>
            <DialogTitle>Factura {invoice.invoice_number}</DialogTitle>
            <DialogDescription className="sr-only">Datos de la factura</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <StatusBadge tone={INVOICE_STATUS_TONES[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</StatusBadge>
              <p className="text-sm text-muted-foreground">{INVOICE_STATUS_EXPLANATIONS[invoice.status]}</p>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {invoice.customer_name && <Field label="Cliente">{invoice.customer_name}</Field>}
              {invoice.customer_tax_id && <Field label="NIF/CIF">{invoice.customer_tax_id}</Field>}
              {invoice.customer_address && <Field label="Dirección">{invoice.customer_address}</Field>}
              {invoice.issue_date && <Field label="Fecha de emisión">{formatDate(invoice.issue_date)}</Field>}
              {invoice.due_date && <Field label="Fecha de vencimiento">{formatDate(invoice.due_date)}</Field>}
              {invoice.paid_date && <Field label="Fecha de pago">{formatDate(invoice.paid_date)}</Field>}
            </dl>

            {invoice.line_items.length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Conceptos</p>
                <ul className="border-y border-border">
                  {invoice.line_items.map((item, index) => (
                    <li key={index} className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0">
                      <span className="min-w-0 text-foreground">
                        {item.description}
                        <span className="text-muted-foreground"> x {item.quantity}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-foreground">{formatCurrency(item.unit_price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <dl className="ml-auto w-full max-w-60 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.tax_amount)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.total_amount)}</dd>
              </div>
            </dl>

            {invoice.notes && <Field label="Notas">{invoice.notes}</Field>}
          </div>

          <DialogFooter>
            <Button onClick={() => onDownload(invoice)} disabled={isDownloading}>
              Descargar PDF
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  </Dialog>
);
