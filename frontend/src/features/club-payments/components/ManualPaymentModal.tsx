import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import {
  manualPaymentSchema,
  PAYMENT_METHOD_LABELS,
  type ManualPaymentFormData,
} from '../data/schemas/payment-admin.schema'
import { useRegisterManualPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'

interface Member {
  id: string
  name: string
  payment_types?: string[]
}

interface ManualPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  clubName: string
  paymentYear: number
  members: Member[]
  isLoadingMembers: boolean
}

interface MemberAssignment {
  member_id: string
  member_name: string
  payment_types: string[]
}

// Manual payment methods exclude redsys
const MANUAL_PAYMENT_METHODS = (
  ['cash', 'transfer', 'other'] as const
).map((key) => ({ value: key, label: PAYMENT_METHOD_LABELS[key] }))

const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [currentYear - 1, currentYear, currentYear + 1]

export function ManualPaymentModal({
  isOpen,
  onClose,
  clubId,
  clubName,
  paymentYear,
  members,
  isLoadingMembers,
}: ManualPaymentModalProps) {
  const [payerName, setPayerName] = useState('')
  const [selectedYear, setSelectedYear] = useState<number>(paymentYear)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [includeClubFee, setIncludeClubFee] = useState(false)
  const [memberAssignments, setMemberAssignments] = useState<MemberAssignment[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { registerManualPayment, isLoading, isSuccess } =
    useRegisterManualPaymentMutation(clubId, paymentYear)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPayerName('')
      setSelectedYear(paymentYear)
      setPaymentMethod('cash')
      setIncludeClubFee(false)
      setMemberAssignments([])
      setErrors({})
    }
  }, [isOpen, paymentYear])

  // Close on success
  useEffect(() => {
    if (isSuccess) {
      onClose()
    }
  }, [isSuccess, onClose])

  // Toggle a member selection
  const toggleMember = (member: Member) => {
    setMemberAssignments((prev) => {
      const exists = prev.find((a) => a.member_id === member.id)
      if (exists) {
        return prev.filter((a) => a.member_id !== member.id)
      }
      return [
        ...prev,
        { member_id: member.id, member_name: member.name, payment_types: [] },
      ]
    })
  }

  // Toggle a payment_type for a specific member
  const togglePaymentType = (memberId: string, paymentType: string) => {
    setMemberAssignments((prev) =>
      prev.map((a) => {
        if (a.member_id !== memberId) return a
        const hasType = a.payment_types.includes(paymentType)
        return {
          ...a,
          payment_types: hasType
            ? a.payment_types.filter((t) => t !== paymentType)
            : [...a.payment_types, paymentType],
        }
      })
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: ManualPaymentFormData = {
      payer_name: payerName,
      club_id: clubId,
      payment_year: selectedYear,
      payment_method: paymentMethod,
      member_assignments: memberAssignments,
      include_club_fee: includeClubFee,
    }

    const result = manualPaymentSchema.safeParse(payload)

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
    registerManualPayment(result.data)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Registrar pago manual — {clubName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid gap-4 py-2">
              {/* Payer name */}
              <div className="grid gap-1.5">
                <Label htmlFor="payer_name">Nombre del pagador</Label>
                <Input
                  id="payer_name"
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Nombre completo del pagador"
                />
                {errors.payer_name && (
                  <p className="text-sm text-destructive">{errors.payer_name}</p>
                )}
              </div>

              {/* Payment year */}
              <div className="grid gap-1.5">
                <Label htmlFor="payment_year">Año de pago</Label>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(val) => setSelectedYear(Number(val))}
                >
                  <SelectTrigger id="payment_year" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.payment_year && (
                  <p className="text-sm text-destructive">{errors.payment_year}</p>
                )}
              </div>

              {/* Payment method */}
              <div className="grid gap-1.5">
                <Label htmlFor="payment_method">Método de pago</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val) =>
                    setPaymentMethod(val as 'cash' | 'transfer' | 'other')
                  }
                >
                  <SelectTrigger id="payment_method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_PAYMENT_METHODS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.payment_method && (
                  <p className="text-sm text-destructive">{errors.payment_method}</p>
                )}
              </div>

              {/* Include club fee */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include_club_fee"
                  checked={includeClubFee}
                  onCheckedChange={(checked) => setIncludeClubFee(checked === true)}
                />
                <Label htmlFor="include_club_fee" className="cursor-pointer">
                  Incluir cuota de club
                </Label>
              </div>

              {/* Inline member selection — no nested Dialog (F§ risk #1) */}
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Asignación de miembros
                  {memberAssignments.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {memberAssignments.length} seleccionados
                    </Badge>
                  )}
                </Label>

                {isLoadingMembers ? (
                  <div className="border rounded-md p-4 text-sm text-muted-foreground">
                    Cargando miembros...
                  </div>
                ) : members.length === 0 ? (
                  <div className="border rounded-md p-4 text-sm text-muted-foreground">
                    No hay miembros disponibles para este club.
                  </div>
                ) : (
                  <div className="border rounded-md max-h-56 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {members.map((member) => {
                        const assignment = memberAssignments.find(
                          (a) => a.member_id === member.id
                        )
                        const isSelected = !!assignment

                        return (
                          <div key={member.id} data-member-id={member.id}>
                            {/* Member row */}
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
                              <Checkbox
                                id={`member-${member.id}`}
                                data-testid={`member-checkbox-${member.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleMember(member)}
                              />
                              <label
                                htmlFor={`member-${member.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {member.name}
                              </label>
                            </div>

                            {/* Payment types sub-list — visible when member is selected */}
                            {isSelected &&
                              member.payment_types &&
                              member.payment_types.length > 0 && (
                                <div className="ml-6 pl-2 border-l space-y-1 my-1">
                                  {member.payment_types.map((type) => {
                                    const hasType = assignment.payment_types.includes(type)
                                    return (
                                      <div
                                        key={type}
                                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30"
                                      >
                                        <Checkbox
                                          id={`type-${member.id}-${type}`}
                                          data-testid={`type-checkbox-${member.id}-${type}`}
                                          checked={hasType}
                                          onCheckedChange={() =>
                                            togglePaymentType(member.id, type)
                                          }
                                        />
                                        <label
                                          htmlFor={`type-${member.id}-${type}`}
                                          className="text-xs cursor-pointer"
                                        >
                                          {type}
                                        </label>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {errors.member_assignments && (
                  <p className="text-sm text-destructive">{errors.member_assignments}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
