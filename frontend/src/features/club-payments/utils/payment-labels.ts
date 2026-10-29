import {
  MEMBER_PAYMENT_STATUS,
  MEMBER_PAYMENT_TYPES,
  type MemberPayment,
} from '@/features/member-payments/data/schemas/member-payment.schema'
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../data/schemas/payment-admin.schema'
import { formatDate, parseUtcDateTime } from '@/core/utils/format'


export const getPaymentTypeLabel = (paymentType: string): string =>
  MEMBER_PAYMENT_TYPES[paymentType as keyof typeof MEMBER_PAYMENT_TYPES] ?? paymentType

export const getStatusLabel = (status: string): string =>
  MEMBER_PAYMENT_STATUS[status as keyof typeof MEMBER_PAYMENT_STATUS] ?? status

export const getPaidLabel = ({ status, paid_at, payment_method }: MemberPayment): string | null => {
  if (status !== 'completed') return null
  const paidAt = parseUtcDateTime(paid_at)
  if (!paidAt) return 'Sin fecha de pago'
  const method = payment_method && (PAYMENT_METHOD_LABELS[payment_method as PaymentMethod] ?? payment_method)
  return [`Pagado el ${formatDate(paidAt)}`, method].filter(Boolean).join(' · ')
}
