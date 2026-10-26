import {
  MEMBER_PAYMENT_STATUS,
  MEMBER_PAYMENT_TYPES,
} from '@/features/member-payments/data/schemas/member-payment.schema'

export { formatCurrency } from '@/core/utils/format'

export const getPaymentTypeLabel = (paymentType: string): string =>
  MEMBER_PAYMENT_TYPES[paymentType as keyof typeof MEMBER_PAYMENT_TYPES] ?? paymentType

export const getStatusLabel = (status: string): string =>
  MEMBER_PAYMENT_STATUS[status as keyof typeof MEMBER_PAYMENT_STATUS] ?? status
