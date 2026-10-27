import type { StatusTone } from '@/components/ui/status-badge';
import type { InvoiceStatus } from '../data/schemas/invoice.schema';

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, StatusTone> = {
  draft: 'neutral',
  issued: 'warn',
  paid: 'ok',
  cancelled: 'bad',
};

export const INVOICE_STATUS_EXPLANATIONS: Record<InvoiceStatus, string> = {
  draft: 'Todavía no se ha emitido.',
  issued: 'Factura generada y enviada.',
  paid: 'El cobro está registrado.',
  cancelled: 'La factura ya no es válida.',
};
