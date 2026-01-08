export interface Payment {
  id: string;
  member_id: string;
  member_name?: string;
  club_id: string;
  payment_type: 'license' | 'accident_insurance' | 'rc_insurance' | 'annual_fee' | 'seminar';
  amount: number;
  payment_date: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method?: 'card' | 'bank_transfer' | 'cash';
  redsys_transaction_id?: string;
  seminar_id?: string;
  seminar_title?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRequest {
  member_id: string;
  payment_type: PaymentType;
  amount: number;
  seminar_id?: string;
}

export interface UpdatePaymentStatusRequest {
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export interface PaymentFilters {
  member_id?: string;
  club_id?: string;
  payment_type?: PaymentType;
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface PaymentsListResponse {
  items: Payment[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreatePaymentResponse {
  id: string;
  redsys_url?: string;
}
