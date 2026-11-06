import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, BeltBadge } from '@/components/ui/graphic'
import { formatCurrency } from '@/core/utils/format'
import { formatGradeNumber } from '@/core/utils/grade'
import { foldForSearch } from '@/core/utils/search'
import { cn } from '@/lib/utils'
import {
  EXAM_GRADE_NOTES,
  EXAM_KEYS,
  examGradeNumber,
  manualExamPaymentSchema,
  nextExamOf,
  type ExamKey,
} from '../data/schemas/exam-payment.schema'
import { PAYMENT_METHOD_LABELS, type OfflinePaymentMethod } from '../data/schemas/payment-admin.schema'
import { useExamPricesQuery } from '../hooks/queries/useExamPricesQuery'
import { useRegisterManualExamPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'

interface ExamMember {
  id: string
  name: string
  grade: string | null
}

interface ExamPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  clubName: string
  members: ExamMember[]
  isLoadingMembers: boolean
}

const OFFLINE_METHODS: OfflinePaymentMethod[] = ['transfer', 'cash', 'other']

const radioTile = (checked: boolean) =>
  cn(
    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ring-[1.5px] ring-inset transition-colors',
    checked ? 'bg-primary-soft text-primary ring-primary' : 'bg-card text-foreground ring-border hover:bg-muted/40'
  )

export function ExamPaymentModal({ isOpen, onClose, clubName, members, isLoadingMembers }: ExamPaymentModalProps) {
  const [search, setSearch] = useState('')
  const [member, setMember] = useState<ExamMember | null>(null)
  const [exam, setExam] = useState<ExamKey | null>(null)
  const [examDate, setExamDate] = useState('')
  const [venue, setVenue] = useState('')
  const [method, setMethod] = useState<OfflinePaymentMethod>('transfer')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: prices = [] } = useExamPricesQuery(isOpen)
  const { registerExamPayment, isLoading, isSuccess } = useRegisterManualExamPaymentMutation()

  const priceOf = useMemo(() => new Map(prices.map((p) => [p.key, p.price])), [prices])
  const price = exam ? priceOf.get(exam) : undefined
  const priceMissing = exam !== null && price === undefined

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setMember(null)
      setExam(null)
      setExamDate('')
      setVenue('')
      setMethod('transfer')
      setErrors({})
    }
  }, [isOpen])

  useEffect(() => {
    if (isSuccess) onClose()
  }, [isSuccess, onClose])

  const found = members.filter((m) => foldForSearch(m.name).includes(foldForSearch(search)))

  const chooseMember = (chosen: ExamMember) => {
    setMember(chosen)
    setExam(nextExamOf(chosen.grade))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const result = manualExamPaymentSchema.safeParse({
      member_id: member?.id ?? '',
      exam: exam ?? undefined,
      exam_date: examDate,
      venue,
      payer_name: clubName,
      payment_method: method,
    })
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return
    }
    setErrors({})
    registerExamPayment(result.data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagar examen</DialogTitle>
          <DialogDescription>{clubName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {member ? (
            <div className="flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-inset ring-border">
              <Avatar name={member.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">Grado actual</p>
              </div>
              <BeltBadge grade={member.grade} />
              <Button type="button" variant="ghost" size="sm" onClick={() => setMember(null)}>
                Cambiar
              </Button>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="exam-member-search">Buscar miembro</Label>
              <Input
                id="exam-member-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre del miembro"
              />
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {isLoadingMembers && <li className="p-2 text-sm text-muted-foreground">Cargando miembros...</li>}
                {found.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => chooseMember(candidate)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted/50"
                    >
                      <Avatar name={candidate.name} />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{candidate.name}</span>
                      <BeltBadge grade={candidate.grade} />
                    </button>
                  </li>
                ))}
              </ul>
              {errors.member_id && <p className="text-sm text-destructive">{errors.member_id}</p>}
            </div>
          )}

          {member && (
            <>
              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 text-sm font-medium">Grado al que se presenta</legend>
                <div role="radiogroup" aria-label="Grado al que se presenta" className="grid grid-cols-2 gap-2">
                  {EXAM_KEYS.map((key) => {
                    const keyPrice = priceOf.get(key)
                    const note = EXAM_GRADE_NOTES[key] ?? (key === nextExamOf(member.grade) ? 'siguiente grado' : '')
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={exam === key}
                        onClick={() => setExam(key)}
                        className={radioTile(exam === key)}
                      >
                        <span>
                          {formatGradeNumber(examGradeNumber(key), 'dan')}
                          {note && <span className="block text-xs text-muted-foreground">{note}</span>}
                        </span>
                        <span className="font-bold tabular-nums">
                          {keyPrice === undefined ? 'Sin precio' : formatCurrency(keyPrice)}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {errors.exam && <p className="text-sm text-destructive">{errors.exam}</p>}
                {priceMissing && (
                  <p className="text-sm text-destructive">Este examen no tiene precio. Avisa a Spain Aikikai.</p>
                )}
              </fieldset>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="exam-date">Fecha del examen</Label>
                  <Input id="exam-date" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
                  {errors.exam_date && <p className="text-sm text-destructive">{errors.exam_date}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="exam-venue">Lugar del examen</Label>
                  <Input id="exam-venue" value={venue} maxLength={200} onChange={(event) => setVenue(event.target.value)} />
                  {errors.venue && <p className="text-sm text-destructive">{errors.venue}</p>}
                </div>
              </div>

              <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 text-sm font-medium">Método de pago</legend>
                <div role="radiogroup" aria-label="Método de pago" className="flex gap-1 rounded-xl bg-muted p-1">
                  {OFFLINE_METHODS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={method === option}
                      onClick={() => setMethod(option)}
                      className={cn(
                        'flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors',
                        method === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      {PAYMENT_METHOD_LABELS[option]}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <DialogFooter className="pt-2 sm:items-center">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !member || priceMissing}>
              {isLoading ? 'Registrando...' : 'Registrar pago'}
            </Button>
            <p className="text-[15px] text-foreground sm:order-first sm:mr-auto">
              Total: <span className="text-lg font-semibold tabular-nums">{formatCurrency(price ?? 0)}</span>
            </p>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
