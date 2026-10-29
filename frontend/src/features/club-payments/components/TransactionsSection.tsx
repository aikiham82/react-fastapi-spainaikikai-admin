import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClubMemberPaymentsQuery } from '../hooks/queries/useClubPaymentsQueries'
import { useDeleteMemberPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'
import { MemberPaymentEditModal } from './MemberPaymentEditModal'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'
import { formatCurrency } from '@/core/utils/format'
import { getPaidLabel, getPaymentTypeLabel, getStatusLabel } from '../utils/payment-labels'
import { LineActions } from './LineActions'
import { useCanChangePaymentLine } from '../hooks/useCanChangePaymentLine'

const getStatusVariant = (
  status: string
): 'default' | 'destructive' | 'secondary' | 'outline' => {
  if (status === 'completed') return 'default'
  if (status === 'refunded') return 'secondary'
  return 'destructive'
}

interface TransactionsSectionProps {
  clubId: string
  paymentYear: number
}

export function TransactionsSection({ clubId, paymentYear }: TransactionsSectionProps) {
  const [editingItem, setEditingItem] = useState<MemberPayment | null>(null)
  const [deletingItem, setDeletingItem] = useState<MemberPayment | null>(null)

  const { data: memberPayments, isLoading } = useClubMemberPaymentsQuery(clubId, paymentYear)

  const { deleteMemberPayment, isLoading: isDeleting } = useDeleteMemberPaymentMutation()
  const canChangeLine = useCanChangePaymentLine()

  const handleConfirmDelete = () => {
    if (deletingItem) {
      deleteMemberPayment(deletingItem.id)
      setDeletingItem(null)
    }
  }

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  // ─── Empty state ────────────────────────────────────────────────────────
  if (!memberPayments || memberPayments.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground text-sm">Sin transacciones</p>
      </div>
    )
  }

  // ─── Data table ─────────────────────────────────────────────────────────
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {memberPayments.map((mp) => (
          <li key={mp.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{mp.member_name || mp.member_id}</p>
                <p className="text-sm text-muted-foreground">{getPaymentTypeLabel(mp.payment_type)}</p>
                {getPaidLabel(mp) && <p className="text-sm text-muted-foreground">{getPaidLabel(mp)}</p>}
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm font-medium tabular-nums">{formatCurrency(mp.amount)}</p>
                <Badge variant={getStatusVariant(mp.status)}>{getStatusLabel(mp.status)}</Badge>
              </div>
            </div>
            {canChangeLine(mp) && <LineActions onEdit={() => setEditingItem(mp)} onDelete={() => setDeletingItem(mp)} />}
          </li>
        ))}
      </ul>

      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Miembro</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberPayments.map((mp) => (
              <TableRow key={mp.id}>
                <TableCell className="font-medium">
                  {mp.member_name || mp.member_id}
                </TableCell>
                <TableCell>{mp.concept}</TableCell>
                <TableCell>{getPaymentTypeLabel(mp.payment_type)}</TableCell>
                <TableCell className="text-muted-foreground">{getPaidLabel(mp)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(mp.amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusVariant(mp.status)}>
                    {getStatusLabel(mp.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {canChangeLine(mp) && (
                    <LineActions
                      onEdit={() => setEditingItem(mp)}
                      onDelete={() => setDeletingItem(mp)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit modal — rendered outside the table to avoid DOM nesting issues */}
      {editingItem && (
        <MemberPaymentEditModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          memberPayment={editingItem}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDeleteDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Eliminar línea de pago"
        description="¿Estás seguro de que quieres eliminar esta línea de pago? Esta acción no se puede deshacer."
        requiresForce={false}
      />
    </>
  )
}
