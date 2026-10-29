import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatCurrency, formatDate } from '@/core/utils/format'
import { useClubUnfinishedPaymentsQuery } from '../hooks/queries/useClubPaymentsQueries'
import { useConfirmPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'
import {
  OFFLINE_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  type OfflinePaymentMethod,
  type Payment,
} from '../data/schemas/payment-admin.schema'

interface UnfinishedPaymentsSectionProps {
  clubId: string
  paymentYear: number
}

const conceptOf = (payment: Payment): string =>
  `${PAYMENT_TYPE_LABELS[payment.payment_type] ?? payment.payment_type} ${payment.payment_year}`

export function UnfinishedPaymentsSection({ clubId, paymentYear }: UnfinishedPaymentsSectionProps) {
  const { data: payments = [] } = useClubUnfinishedPaymentsQuery(clubId, paymentYear)
  const { confirmPayment, isLoading } = useConfirmPaymentMutation()
  const [confirming, setConfirming] = useState<Payment | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<OfflinePaymentMethod>('transfer')

  if (payments.length === 0) return null

  const close = () => {
    setConfirming(null)
    setPaymentMethod('transfer')
  }

  const confirm = () => {
    if (!confirming) return
    confirmPayment({ id: confirming.id, paymentMethod }, { onSuccess: close })
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">Pagos sin terminar</h3>
        <p className="text-sm text-muted-foreground">
          Pagos que el club empezó y no llegaron a cobrarse. Si el dinero ha llegado por otra vía, confírmalo.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-wrap items-center gap-3 rounded-[18px] bg-card p-3 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground">{conceptOf(payment)}</p>
              <p className="text-sm text-muted-foreground">
                Iniciado el {formatDate(payment.created_at)} · {formatCurrency(payment.amount)}
              </p>
            </div>
            <StatusBadge tone="warn">Sin cobrar</StatusBadge>
            <Button size="sm" onClick={() => setConfirming(payment)}>
              Confirmar cobro
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={!!confirming} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cobro</DialogTitle>
            <DialogDescription>
              {confirming && `${conceptOf(confirming)} · ${formatCurrency(confirming.amount)}. `}
              Se crearán las licencias y seguros pagados, se emitirá la factura y se enviará al club.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm_payment_method">Cómo se ha cobrado</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as OfflinePaymentMethod)}
            >
              <SelectTrigger id="confirm_payment_method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFLINE_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={confirm} disabled={isLoading}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
