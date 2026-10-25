import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/core/hooks/usePermissions'
import { defaultPaymentYear } from '@/core/utils/defaultPaymentYear'
import { useMemberPaymentHistoryQuery } from '@/features/member-payments/hooks/queries/useMemberPaymentQueries'
import {
  MEMBER_PAYMENT_STATUS,
  MEMBER_PAYMENT_TYPES,
  type MemberPayment,
} from '@/features/member-payments/data/schemas/member-payment.schema'
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)

const typeLabel = (paymentType: string) =>
  MEMBER_PAYMENT_TYPES[paymentType as keyof typeof MEMBER_PAYMENT_TYPES] ?? paymentType

const statusLabel = (status: string) =>
  MEMBER_PAYMENT_STATUS[status as keyof typeof MEMBER_PAYMENT_STATUS] ?? status

export function MemberPaymentLines({ memberId, memberName, clubId, clubName }: MemberPaymentLinesProps) {
  const { isAssociationAdmin } = usePermissions()
  const [editing, setEditing] = useState<MemberPayment | null>(null)
  const [deleting, setDeleting] = useState<MemberPayment | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const { data } = useMemberPaymentHistoryQuery(memberId)
  const { deleteMemberPayment, isLoading: isDeleting } = useDeleteMemberPaymentMutation()

  if (!isAssociationAdmin()) return null

  const lines = data?.payments ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">Líneas de pago</h4>
        <Button size="sm" onClick={() => setIsAdding(true)}>
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
                  <p className="text-sm font-medium">{line.payment_year} · {typeLabel(line.payment_type)}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{formatCurrency(line.amount)}</p>
                </div>
                <Badge variant={line.status === 'completed' ? 'default' : 'secondary'}>
                  {statusLabel(line.status)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(line)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(line)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              </div>
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
        description="¿Seguro que quieres eliminar esta línea de pago? Esta acción no se puede deshacer."
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
