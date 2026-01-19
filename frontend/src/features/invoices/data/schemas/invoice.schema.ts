export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled' | 'void';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  payment_id: string;
  member_id: string;
  club_id: string | null;
  license_id: string | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_tax_id: string | null;
  customer_email: string | null;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  pdf_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  member_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

// Invoice status labels in Spanish
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  void: 'Anulada',
};

// Invoice status badge variants
export const INVOICE_STATUS_VARIANTS: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  issued: 'warning',
  paid: 'success',
  cancelled: 'destructive',
  void: 'destructive',
};

// Format currency in EUR
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

// Format date in Spanish format
export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateStr));
};
