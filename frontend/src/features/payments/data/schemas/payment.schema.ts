export type PaymentType = 'license_fee' | 'accident_insurance' | 'rc_insurance' | 'annual_fee' | 'seminar_registration';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export interface Payment {
  id: string;
  member_id: string | null;
  member_name?: string;
  club_id: string | null;
  payment_type: PaymentType;
  amount: number;
  status: PaymentStatus;
  payment_date: string | null;
  transaction_id: string | null;
  redsys_response?: Record<string, unknown>;
  error_message: string | null;
  refund_amount: number | null;
  refund_date: string | null;
  related_entity_id: string | null;
  payment_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface InitiatePaymentRequest {
  member_id?: string;
  club_id?: string;
  payment_type: PaymentType;
  amount: number;
  related_entity_id?: string;
  description?: string;
  payment_year?: number;
}

export interface InitiatePaymentResponse {
  payment_id: string;
  order_id: string;
  payment_url: string;
  ds_signature_version: string;
  ds_merchant_parameters: string;
  ds_signature: string;
}

export interface RefundPaymentRequest {
  refund_amount?: number;
}

export interface PaymentFilters {
  member_id?: string;
  club_id?: string;
  payment_type?: PaymentType;
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
  payment_year?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentsListResponse {
  items: Payment[];
  total: number;
  offset: number;
  limit: number;
}

// Legacy types for backward compatibility
export interface CreatePaymentRequest {
  member_id: string;
  payment_type: PaymentType;
  amount: number;
  seminar_id?: string;
  payment_year?: number;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentStatus;
}

export interface CreatePaymentResponse {
  id: string;
  redsys_url?: string;
}

// Payment type labels in Spanish
export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  license_fee: 'Cuota de Licencia',
  accident_insurance: 'Seguro de Accidentes',
  rc_insurance: 'Seguro de Responsabilidad Civil',
  annual_fee: 'Cuota Anual',
  seminar_registration: 'Inscripcion a Seminario',
};

// Payment status labels in Spanish
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

// Payment status badge variants
export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  processing: 'default',
  completed: 'success',
  failed: 'destructive',
  refunded: 'default',
  cancelled: 'default',
};
