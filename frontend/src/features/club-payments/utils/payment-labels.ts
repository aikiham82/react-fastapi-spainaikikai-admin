import {
  MEMBER_PAYMENT_STATUS,
  MEMBER_PAYMENT_TYPES,
} from '@/features/member-payments/data/schemas/member-payment.schema'
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../data/schemas/payment-admin.schema'
import { formatDate } from '@/core/utils/format'


export const getPaymentTypeLabel = (paymentType: string): string =>
  MEMBER_PAYMENT_TYPES[paymentType as keyof typeof MEMBER_PAYMENT_TYPES] ?? paymentType

export const getStatusLabel = (status: string): string =>
  MEMBER_PAYMENT_STATUS[status as keyof typeof MEMBER_PAYMENT_STATUS] ?? status

export const getPaidLabel = (paidAt?: string | null, method?: string | null): string =>
  paidAt
    ? [`Pagado el ${formatDate(paidAt)}`, method && (PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method)]
        .filter(Boolean)
        .join(' · ')
    : 'Sin fecha de pago'
