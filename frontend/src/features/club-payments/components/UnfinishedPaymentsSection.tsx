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
import { formatCurrency, formatDate } from '@/core/utils/format'
import { useClubUnfinishedPaymentsQuery } from '../hooks/queries/useClubPaymentsQueries'
import { useConfirmPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'
import {
  OFFLINE_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type OfflinePaymentMethod,
  type Payment,
} from '../data/schemas/payment-admin.schema'
import { getPaymentTypeLabel } from '../utils/payment-labels'

interface UnfinishedPaymentsSectionProps {
  clubId: string
  paymentYear: number
}

const conceptOf = (payment: Payment): string =>
  `${getPaymentTypeLabel(payment.payment_type)} ${payment.payment_year}`

const detailsOf = (payment: Payment): string =>
  [
    payment.created_at && `Iniciado el ${formatDate(payment.created_at)}`,
    payment.payer_name,
    formatCurrency(payment.amount),
  ]
    .filter(Boolean)
    .join(' · ')

const whatConfirmingDoes = (payment: Payment): string =>
  payment.payment_type === 'annual_quota'
    ? 'Se darán de alta las licencias y seguros pagados y se enviará la factura al club.'
    : 'Se marcará como pagado y se enviará la factura al club.'

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
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-card p-3 shadow-card"
          >
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
              <p className="break-words text-[15px] font-semibold text-foreground">{conceptOf(payment)}</p>
              <p className="break-words text-sm text-muted-foreground">{detailsOf(payment)}</p>
            </div>
            <Button size="sm" className="ml-auto" onClick={() => setConfirming(payment)}>
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
              {confirming && `${conceptOf(confirming)} · ${formatCurrency(confirming.amount)}. ${whatConfirmingDoes(confirming)}`}
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
