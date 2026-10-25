import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { memberPaymentUpdateSchema } from '../data/schemas/payment-admin.schema'
import { useUpdateMemberPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'
import {
  MEMBER_PAYMENT_TYPES,
  MEMBER_PAYMENT_STATUS,
  type MemberPayment,
} from '@/features/member-payments/data/schemas/member-payment.schema'

interface MemberPaymentEditModalProps {
  isOpen: boolean
  onClose: () => void
  memberPayment: MemberPayment
}

interface FormState {
  payment_type: string
  concept: string
  amount: string
  status: string
  payment_year: string
}

const formStateOf = (memberPayment: MemberPayment): FormState => ({
  payment_type: memberPayment.payment_type,
  concept: memberPayment.concept,
  amount: String(memberPayment.amount),
  status: memberPayment.status,
  payment_year: String(memberPayment.payment_year),
})

export function MemberPaymentEditModal({
  isOpen,
  onClose,
  memberPayment,
}: MemberPaymentEditModalProps) {
  const [formData, setFormData] = useState<FormState>(() => formStateOf(memberPayment))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { updateMemberPayment, isLoading, isSuccess } =
    useUpdateMemberPaymentMutation()

  // Reset form when the target memberPayment changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(formStateOf(memberPayment))
      setErrors({})
    }
  }, [isOpen, memberPayment])

  // Close modal on successful update
  useEffect(() => {
    if (isSuccess) {
      onClose()
    }
  }, [isSuccess, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedAmount = Number(formData.amount)
    const parsedYear = Number(formData.payment_year)

    const payload = {
      payment_type: formData.payment_type || undefined,
      concept: formData.concept || undefined,
      amount: isNaN(parsedAmount) ? undefined : parsedAmount,
      status: formData.status || undefined,
      payment_year: isNaN(parsedYear) ? undefined : parsedYear,
    }

    const result = memberPaymentUpdateSchema.safeParse(payload)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        if (field) {
          fieldErrors[field] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    updateMemberPayment({ id: memberPayment.id, data: result.data })
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar línea de pago</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para editar una línea de pago
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Payment type */}
          <div className="grid gap-1.5">
            <Label htmlFor="payment_type">Tipo de pago</Label>
            <Select
              value={formData.payment_type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, payment_type: value }))
              }
            >
              <SelectTrigger id="payment_type" className="w-full">
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEMBER_PAYMENT_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_type && (
              <p className="text-sm text-destructive">{errors.payment_type}</p>
            )}
          </div>

          {/* Concept */}
          <div className="grid gap-1.5">
            <Label htmlFor="concept">Concepto</Label>
            <Input
              id="concept"
              type="text"
              value={formData.concept}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, concept: e.target.value }))
              }
            />
            {errors.concept && (
              <p className="text-sm text-destructive">{errors.concept}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="payment_year">Año</Label>
            <Input
              id="payment_year"
              type="number"
              inputMode="numeric"
              value={formData.payment_year}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, payment_year: e.target.value }))
              }
            />
            {errors.payment_year && (
              <p className="text-sm text-destructive">{errors.payment_year}</p>
            )}
          </div>

          {/* Amount */}
          <div className="grid gap-1.5">
            <Label htmlFor="amount">Importe (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
          </div>

          {/* Status */}
          <div className="grid gap-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEMBER_PAYMENT_STATUS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
