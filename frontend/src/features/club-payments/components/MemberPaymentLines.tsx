import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/core/hooks/usePermissions'
import { defaultPaymentYear } from '@/core/utils/defaultPaymentYear'
import { useMemberPaymentHistoryQuery } from '@/features/member-payments/hooks/queries/useMemberPaymentQueries'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'
import { formatCurrency } from '@/core/utils/format'
import { getPaymentTypeLabel, getStatusLabel } from '../utils/payment-labels'
import { LineActions } from './LineActions'
import { useDeleteMemberPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'
import { MemberPaymentEditModal } from './MemberPaymentEditModal'
import { ManualPaymentModal } from './ManualPaymentModal'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'

interface MemberPaymentLinesProps {
  memberId: string
  memberName: string
  clubId: string
  clubName: string
}

export function MemberPaymentLines({ memberId, memberName, clubId, clubName }: MemberPaymentLinesProps) {
  const { isAssociationAdmin } = usePermissions()
  const [editing, setEditing] = useState<MemberPayment | null>(null)
  const [deleting, setDeleting] = useState<MemberPayment | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const { data } = useMemberPaymentHistoryQuery(memberId, 0, isAssociationAdmin())
  const { deleteMemberPayment, isLoading: isDeleting } = useDeleteMemberPaymentMutation()

  if (!isAssociationAdmin()) return null

  const lines = data?.payments ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">Líneas de pago</h4>
        <Button className="h-10 sm:h-8" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Añadir pago
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este miembro no tiene pagos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{line.payment_year} · {getPaymentTypeLabel(line.payment_type)}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatCurrency(line.amount)}</p>
                </div>
                <Badge variant="secondary" className={line.status === 'completed' ? 'bg-green-100 text-green-800' : undefined}>
                  {getStatusLabel(line.status)}
                </Badge>
              </div>
              <LineActions onEdit={() => setEditing(line)} onDelete={() => setDeleting(line)} />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <MemberPaymentEditModal isOpen onClose={() => setEditing(null)} memberPayment={editing} />
      )}

      <ConfirmDeleteDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMemberPayment(deleting.id)
          setDeleting(null)
        }}
        isLoading={isDeleting}
        title="Eliminar línea de pago"
        description={deleting
          ? `${deleting.payment_year} · ${getPaymentTypeLabel(deleting.payment_type)} · ${formatCurrency(deleting.amount)}. Esta acción no se puede deshacer.`
          : ''}
      />

      <ManualPaymentModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        clubId={clubId}
        clubName={clubName}
        paymentYear={defaultPaymentYear(new Date())}
        members={[{ id: memberId, name: memberName }]}
        isLoadingMembers={false}
      />
    </section>
  )
}
