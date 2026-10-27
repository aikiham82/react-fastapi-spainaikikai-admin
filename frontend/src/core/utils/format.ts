const EMPTY = '-'

type DateInput = string | Date | null | undefined

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
})

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

const parse = (value: string): Date => {
  const dateOnly = DATE_ONLY.exec(value)
  return dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)
}

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i
const EXTRA_FRACTION = /(\.\d{3})\d+/

export const parseUtcDateTime = (value: string | null | undefined): Date | null => {
  if (!value) return null
  const date = DATE_ONLY.test(value) || HAS_OFFSET.test(value)
    ? parse(value)
    : new Date(`${value.replace(EXTRA_FRACTION, '$1')}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value: number): string => String(value).padStart(2, '0')

export const toDateTimeLocalInput = (value: string | null | undefined): string => {
  const date = parseUtcDateTime(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toValidDate = (value: DateInput): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : parse(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value: DateInput): string => {
  const date = toValidDate(value)
  return date ? dateFormatter.format(date) : EMPTY
}

const twoDigits = (value: number): string => String(value).padStart(2, '0')

export const formatDayMonth = (value: DateInput): string => {
  const date = toValidDate(value)
  return date ? `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}` : EMPTY
}

export const formatDateTime = (value: DateInput): string => {
  const date = toValidDate(value)
  return date ? dateTimeFormatter.format(date) : EMPTY
}

export const formatCurrency = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? EMPTY : currencyFormatter.format(amount)
