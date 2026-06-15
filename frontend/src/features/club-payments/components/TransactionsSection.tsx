import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  MEMBER_PAYMENT_TYPES,
  MEMBER_PAYMENT_STATUS,
} from '@/features/member-payments/data/schemas/member-payment.schema'

// NOTE ON REDSYS HANDLING:
// MemberPayment does NOT have a payment_method field — that field belongs to the
// parent Payment entity. Since we cannot determine at the line level whether a
// MemberPayment was processed via Redsys, edit/delete actions are shown uniformly
// for all rows. The backend enforces any business rules around Redsys payments.
// If in the future the backend exposes payment_method per line, this component
// should add requiresForce=true logic for Redsys COMPLETED rows.

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)

const getPaymentTypeLabel = (paymentType: string): string =>
  MEMBER_PAYMENT_TYPES[paymentType as keyof typeof MEMBER_PAYMENT_TYPES] ?? paymentType

const getStatusLabel = (status: string): string =>
  MEMBER_PAYMENT_STATUS[status as keyof typeof MEMBER_PAYMENT_STATUS] ?? status

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

  const { deleteMemberPayment, isLoading: isDeleting } = useDeleteMemberPaymentMutation(
    clubId,
    paymentYear
  )

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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Miembro</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Tipo</TableHead>
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
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(mp.amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusVariant(mp.status)}>
                    {getStatusLabel(mp.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar"
                      onClick={() => setEditingItem(mp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingItem(mp)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
          clubId={clubId}
          paymentYear={paymentYear}
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
