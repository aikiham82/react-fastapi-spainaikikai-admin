import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { usePermissions } from '@/core/hooks/usePermissions'
import { defaultPaymentYear } from '@/core/utils/defaultPaymentYear'
import { useMemberPaymentHistoryQuery } from '@/features/member-payments/hooks/queries/useMemberPaymentQueries'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'
import { formatCurrency } from '@/core/utils/format'
import { getPaidLabel, getPaymentTypeLabel, getStatusLabel } from '../utils/payment-labels'
import { LineActions } from './LineActions'
import { useDeleteMemberPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'
import { MemberPaymentEditModal } from './MemberPaymentEditModal'
import { ManualPaymentModal } from './ManualPaymentModal'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import { useCanChangePaymentLine } from '../hooks/useCanChangePaymentLine'

interface MemberPaymentLinesProps {
  memberId: string
  memberName: string
  clubId: string
  clubName: string
}

const STATUS_TONES: Record<string, StatusTone> = { completed: 'ok', pending: 'warn', refunded: 'bad' }

const groupByYear = (lines: MemberPayment[]): [number, MemberPayment[]][] =>
  [...new Set(lines.map((line) => line.payment_year))]
    .sort((a, b) => b - a)
    .map((year) => [year, lines.filter((line) => line.payment_year === year)])

const paidTotal = (lines: MemberPayment[]): number =>
  lines.filter((line) => line.status === 'completed').reduce((sum, line) => sum + line.amount, 0)

interface PaymentLineItemProps {
  line: MemberPayment
  onEdit?: () => void
  onDelete?: () => void
}

function PaymentLineItem({ line, onEdit, onDelete }: PaymentLineItemProps) {
  const paidLabel = getPaidLabel(line)
  return (
    <li className="rounded-md border p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{getPaymentTypeLabel(line.payment_type)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatCurrency(line.amount)}</p>
          {paidLabel && <p className="text-sm text-muted-foreground">{paidLabel}</p>}
        </div>
        <StatusBadge tone={STATUS_TONES[line.status] ?? 'neutral'}>{getStatusLabel(line.status)}</StatusBadge>
      </div>
      {onEdit && onDelete && <LineActions onEdit={onEdit} onDelete={onDelete} />}
    </li>
  )
}

export function MemberPaymentLines({ memberId, memberName, clubId, clubName }: MemberPaymentLinesProps) {
  const { isAssociationAdmin, isClubAdmin } = usePermissions()
  const [editing, setEditing] = useState<MemberPayment | null>(null)
  const [deleting, setDeleting] = useState<MemberPayment | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const canEdit = isAssociationAdmin() || isClubAdmin()
  const canChangeLine = useCanChangePaymentLine()
  const { data } = useMemberPaymentHistoryQuery(memberId, 0)
  const { deleteMemberPayment, isLoading: isDeleting } = useDeleteMemberPaymentMutation()

  const lines = data?.payments ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium">Líneas de pago</h4>
        {canEdit && (
          <Button className="h-10 sm:h-8" disabled={!clubId} onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir pago
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este miembro no tiene pagos registrados.</p>
      ) : (
        <div className="space-y-4">
          {groupByYear(lines).map(([year, yearLines]) => (
            <div key={year} className="space-y-2">
              <h5 className="border-b pb-1 text-base font-semibold tabular-nums">
                {year} · {formatCurrency(paidTotal(yearLines))} pagado
              </h5>
              <ul className="space-y-2">
                {yearLines.map((line) => (
                  <PaymentLineItem
                    key={line.id}
                    line={line}
                    onEdit={canChangeLine(line) ? () => setEditing(line) : undefined}
                    onDelete={canChangeLine(line) ? () => setDeleting(line) : undefined}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
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
