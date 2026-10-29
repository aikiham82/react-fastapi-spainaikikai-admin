import { usePermissions } from '@/core/hooks/usePermissions'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'

export const useCanChangePaymentLine = (): ((line: MemberPayment) => boolean) => {
  const { isAssociationAdmin, isClubAdmin } = usePermissions()
  return (line) => isAssociationAdmin() || (isClubAdmin() && !line.received_by_card)
}
