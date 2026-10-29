import {
  MEMBER_PAYMENT_STATUS,
  MEMBER_PAYMENT_TYPES,
  type MemberPayment,
} from '@/features/member-payments/data/schemas/member-payment.schema'
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../data/schemas/payment-admin.schema'
import { formatDate, parseUtcDateTime } from '@/core/utils/format'


const PAYMENT_TYPES = {
  ...MEMBER_PAYMENT_TYPES,
  annual_quota: 'Pago anual',
  seminar_oficialidad: 'Oficialidad de seminario',
  license: 'Licencia',
  seminar: 'Seminario',
  accident_insurance: 'Seguro de accidentes',
  civil_liability_insurance: 'Seguro RC',
}

export const getPaymentTypeLabel = (paymentType: string): string =>
  PAYMENT_TYPES[paymentType as keyof typeof PAYMENT_TYPES] ?? paymentType

export const getStatusLabel = (status: string): string =>
  MEMBER_PAYMENT_STATUS[status as keyof typeof MEMBER_PAYMENT_STATUS] ?? status

export interface PaidParts {
  date: string | null
  method: string | null
}

export const getPaidParts = ({ status, paid_at, payment_method }: MemberPayment): PaidParts | null => {
  if (status !== 'completed') return null
  const paidAt = parseUtcDateTime(paid_at)
  if (!paidAt) return { date: null, method: null }
  const method = payment_method ? (PAYMENT_METHOD_LABELS[payment_method as PaymentMethod] ?? payment_method) : null
  return { date: formatDate(paidAt), method }
}

export const getPaidLabel = (line: MemberPayment): string | null => {
  const parts = getPaidParts(line)
  if (!parts) return null
  if (!parts.date) return 'Sin fecha de pago'
  return [`Pagado\u00a0el\u00a0${parts.date}`, parts.method].filter(Boolean).join('\u00a0· ')
}
