import { z } from 'zod';

// Pricing constants matching backend
export const ANNUAL_PAYMENT_PRICES = {
  club_fee: 100.0,
  kyu: 15.0,
  kyu_infantil: 5.0,
  dan: 20.0,
  fukushidoin_shidoin: 70.0,
  seguro_accidentes: 15.0,
  seguro_rc: 35.0,
} as const;

// Maximum quantity limits
export const QUANTITY_LIMITS = {
  max_per_item: 200,
} as const;

// Price labels for display
export const ANNUAL_PAYMENT_LABELS = {
  club_fee: 'Cuota de Club',
  kyu: 'Licencia KYU (adulto)',
  kyu_infantil: 'Licencia KYU Infantil (≤14 años)',
  dan: 'Licencia DAN',
  fukushidoin_shidoin: 'FUKUSHIDOIN/SHIDOIN (incluye RC + DAN)',
  seguro_accidentes: 'Seguro de Accidentes',
  seguro_rc: 'Seguro RC',
} as const;

export type AnnualPaymentItemType = keyof typeof ANNUAL_PAYMENT_PRICES;

export interface AnnualPaymentLineItem {
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InitiateAnnualPaymentRequest {
  payer_name: string;
  club_id: string;
  payment_year: number;
  include_club_fee: boolean;
  kyu_count: number;
  kyu_infantil_count: number;
  dan_count: number;
  fukushidoin_shidoin_count: number;
  seguro_accidentes_count: number;
  seguro_rc_count: number;
}

export interface InitiateAnnualPaymentResponse {
  payment_id: string;
  order_id: string;
  total_amount: number;
  line_items: AnnualPaymentLineItem[];
  payment_url: string;
  ds_signature_version: string;
  ds_merchant_parameters: string;
  ds_signature: string;
}

export interface AnnualPaymentFormData {
  payer_name: string;
  club_id: string;
  payment_year: number;
  include_club_fee: boolean;
  kyu_count: number;
  kyu_infantil_count: number;
  dan_count: number;
  fukushidoin_shidoin_count: number;
  seguro_accidentes_count: number;
  seguro_rc_count: number;
}

export interface PaymentTotals {
  subtotals: {
    club_fee: number;
    kyu: number;
    kyu_infantil: number;
    dan: number;
    fukushidoin_shidoin: number;
    seguro_accidentes: number;
    seguro_rc: number;
  };
  total: number;
}

// Zod validation schema
const currentYear = new Date().getFullYear();

const maxQtyError = `Máximo ${QUANTITY_LIMITS.max_per_item} por tipo`;

export const annualPaymentFormSchema = z.object({
  payer_name: z.string().min(1, 'El nombre del pagador es obligatorio'),
  club_id: z.string().min(1, 'El club es obligatorio'),
  payment_year: z.number()
    .min(currentYear - 1, `El año debe ser al menos ${currentYear - 1}`)
    .max(currentYear + 1, `El año debe ser como máximo ${currentYear + 1}`),
  include_club_fee: z.boolean(),
  kyu_count: z.number().min(0).max(QUANTITY_LIMITS.max_per_item, maxQtyError),
  kyu_infantil_count: z.number().min(0).max(QUANTITY_LIMITS.max_per_item, maxQtyError),
  dan_count: z.number().min(0).max(QUANTITY_LIMITS.max_per_item, maxQtyError),
  fukushidoin_shidoin_count: z.number().min(0).max(QUANTITY_LIMITS.max_per_item, maxQtyError),
  seguro_accidentes_count: z.number().min(0).max(QUANTITY_LIMITS.max_per_item, maxQtyError),
  seguro_rc_count: z.number().min(0).max(QUANTITY_LIMITS.max_per_item, maxQtyError),
}).refine(
  (data) => {
    // At least one item must be selected
    return (
      data.include_club_fee ||
      data.kyu_count > 0 ||
      data.kyu_infantil_count > 0 ||
      data.dan_count > 0 ||
      data.fukushidoin_shidoin_count > 0 ||
      data.seguro_accidentes_count > 0 ||
      data.seguro_rc_count > 0
    );
  },
  {
    message: 'Debe seleccionar al menos un concepto de pago',
    path: ['_form'], // Form-level error
  }
);

export type AnnualPaymentFormSchema = z.infer<typeof annualPaymentFormSchema>;

// Helper function to calculate totals
export function calculateTotals(formData: AnnualPaymentFormData): PaymentTotals {
  const subtotals = {
    club_fee: formData.include_club_fee ? ANNUAL_PAYMENT_PRICES.club_fee : 0,
    kyu: formData.kyu_count * ANNUAL_PAYMENT_PRICES.kyu,
    kyu_infantil: formData.kyu_infantil_count * ANNUAL_PAYMENT_PRICES.kyu_infantil,
    dan: formData.dan_count * ANNUAL_PAYMENT_PRICES.dan,
    fukushidoin_shidoin: formData.fukushidoin_shidoin_count * ANNUAL_PAYMENT_PRICES.fukushidoin_shidoin,
    seguro_accidentes: formData.seguro_accidentes_count * ANNUAL_PAYMENT_PRICES.seguro_accidentes,
    seguro_rc: formData.seguro_rc_count * ANNUAL_PAYMENT_PRICES.seguro_rc,
  };

  const total = Object.values(subtotals).reduce((sum, value) => sum + value, 0);

  return { subtotals, total };
}

// Default form values
export const defaultFormValues: AnnualPaymentFormData = {
  payer_name: '',
  club_id: '',
  payment_year: currentYear,
  include_club_fee: false,
  kyu_count: 0,
  kyu_infantil_count: 0,
  dan_count: 0,
  fukushidoin_shidoin_count: 0,
  seguro_accidentes_count: 0,
  seguro_rc_count: 0,
};
