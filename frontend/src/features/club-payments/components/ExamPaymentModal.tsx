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
  examPaymentSchema,
  nextExamOf,
  type ExamKey,
} from '../data/schemas/exam-payment.schema'
import { OFFLINE_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type OfflinePaymentMethod } from '../data/schemas/payment-admin.schema'
import { useExamPricesQuery } from '../hooks/queries/useExamPricesQuery'
import { useInitiateExamPaymentMutation, useRegisterManualExamPaymentMutation } from '../hooks/mutations/usePaymentAdminMutations'

export interface ExamMember {
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
  forMember?: ExamMember
}

const radioTile = (checked: boolean) =>
  cn(
    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ring-[1.5px] ring-inset transition-colors',
    checked ? 'bg-primary-soft text-primary ring-primary' : 'bg-card text-foreground ring-border hover:bg-muted/40'
  )

export function ExamPaymentModal({ isOpen, onClose, clubName, members, isLoadingMembers, forMember }: ExamPaymentModalProps) {
  const ownExam = forMember !== undefined
  const [search, setSearch] = useState('')
  const [member, setMember] = useState<ExamMember | null>(null)
  const [exam, setExam] = useState<ExamKey | null>(null)
  const [examDate, setExamDate] = useState('')
  const [venue, setVenue] = useState('')
  const [method, setMethod] = useState<OfflinePaymentMethod>('transfer')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: prices = [], isError: pricesFailed, refetch: retryPrices } = useExamPricesQuery(isOpen)
  const { registerExamPayment, isLoading: isRegistering } = useRegisterManualExamPaymentMutation()
  const { payExamByCard, isLoading: isGoingToBank } = useInitiateExamPaymentMutation()
  const isLoading = isRegistering || isGoingToBank

  const priceOf = useMemo(() => new Map(prices.map((p) => [p.key, p.price])), [prices])
  const price = exam ? priceOf.get(exam) : undefined
  const priceMissing = !pricesFailed && exam !== null && price === undefined

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setMember(forMember ?? null)
      setExam(forMember ? nextExamOf(forMember.grade) : null)
      setExamDate('')
      setVenue('')
      setMethod('transfer')
      setErrors({})
    }
  }, [isOpen, forMember])

  const found = members.filter((m) => foldForSearch(m.name).includes(foldForSearch(search)))

  const chooseMember = (chosen: ExamMember) => {
    setMember(chosen)
    setExam(nextExamOf(chosen.grade))
  }

  const validExam = () => {
    const result = examPaymentSchema.safeParse({
      member_id: member?.id ?? '',
      exam: exam ?? undefined,
      exam_date: examDate,
      venue,
      payer_name: clubName,
    })
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])))
      return null
    }
    setErrors({})
    return result.data
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const data = validExam()
    if (data) registerExamPayment({ ...data, payment_method: method }, { onSuccess: onClose })
  }

  const handlePayByCard = () => {
    const data = validExam()
    if (data) payExamByCard(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagar examen</DialogTitle>
          <DialogDescription>{clubName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-4">
          {member ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl p-2.5 ring-1 ring-inset ring-border">
              <Avatar name={member.name} />
              <p className="min-w-0 flex-1 basis-40 text-sm font-medium text-foreground">{member.name}</p>
              <div className="ml-auto flex items-center gap-2">
                <BeltBadge grade={member.grade} />
                {!ownExam && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setMember(null)}>
                    Cambiar
                  </Button>
                )}
              </div>
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
              <fieldset className="grid min-w-0 gap-1.5">
                <legend className="mb-1.5 text-sm font-medium">Grado al que se presenta</legend>
                {pricesFailed ? (
                  <div role="alert" className="flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-inset ring-border">
                    <p className="text-sm text-destructive">No se han podido cargar los precios.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => retryPrices()}>
                      Reintentar
                    </Button>
                  </div>
                ) : (
                <div role="radiogroup" aria-label="Grado al que se presenta" className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
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
                          <span className="whitespace-nowrap">{formatGradeNumber(examGradeNumber(key), 'dan')}</span>
                          {note && <span className="block text-xs text-muted-foreground">{note}</span>}
                        </span>
                        <span className="font-bold tabular-nums">
                          {keyPrice === undefined ? 'Sin precio' : formatCurrency(keyPrice)}
                        </span>
                      </button>
                    )
                  })}
                </div>
                )}
                {errors.exam && <p className="text-sm text-destructive">{errors.exam}</p>}
                {priceMissing && (
                  <p className="text-sm text-destructive">Este examen no tiene precio. Avisa a Spain Aikikai.</p>
                )}
              </fieldset>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="exam-date">Fecha del examen</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={examDate}
                    aria-invalid={!!errors.exam_date}
                    aria-describedby={errors.exam_date ? 'exam-date-error' : undefined}
                    onChange={(event) => setExamDate(event.target.value)}
                  />
                  {errors.exam_date && <p id="exam-date-error" className="text-sm text-destructive">{errors.exam_date}</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="exam-venue">Lugar del examen</Label>
                  <Input
                    id="exam-venue"
                    value={venue}
                    maxLength={200}
                    aria-invalid={!!errors.venue}
                    aria-describedby={errors.venue ? 'exam-venue-error' : undefined}
                    onChange={(event) => setVenue(event.target.value)}
                  />
                  {errors.venue && <p id="exam-venue-error" className="text-sm text-destructive">{errors.venue}</p>}
                </div>
              </div>

              {!ownExam && (
              <fieldset className="grid min-w-0 gap-1.5">
                <legend className="mb-1.5 text-sm font-medium">Si ya está pagado, ¿cómo?</legend>
                <div role="radiogroup" aria-label="Método de pago" className="flex gap-1 rounded-xl bg-muted p-1">
                  {OFFLINE_PAYMENT_METHODS.map((option) => (
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
              )}
              <p className="text-xs text-muted-foreground">Pagar el examen no cambia el grado del miembro.</p>
            </>
          )}

          <DialogFooter className="pt-2 sm:items-center">
            {!ownExam && (
              <Button type="submit" variant="outline" disabled={isLoading || !member || priceMissing || pricesFailed}>
                {isRegistering ? 'Registrando...' : 'Registrar pago'}
              </Button>
            )}
            <Button type="button" onClick={handlePayByCard} disabled={isLoading || !member || priceMissing || pricesFailed}>
              {isGoingToBank ? 'Abriendo el banco...' : 'Pagar con tarjeta'}
            </Button>
            {price !== undefined && (
              <p className="text-[15px] text-foreground sm:order-first sm:mr-auto">
                Total: <span className="text-lg font-semibold tabular-nums">{formatCurrency(price)}</span>
              </p>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
