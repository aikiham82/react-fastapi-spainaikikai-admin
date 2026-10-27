import type { CSSProperties, ReactNode } from 'react'
import { Check, Plus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatGradeEs } from '@/core/utils/grade'

const AVATAR_TINTS = [
  'bg-[#E7E0F5] text-[#4B3A80]',
  'bg-[#DDEEF0] text-[#1F5B66]',
  'bg-[#F8E3D3] text-[#8A4317]',
  'bg-[#E2F0DD] text-[#2F6427]',
  'bg-[#F3DDE6] text-[#84284E]',
]

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')

const tintIndexOf = (name: string): number =>
  [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TINTS.length

interface AvatarProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

export function Avatar({ name, size = 'sm', className }: AvatarProps) {
  const tint = tintIndexOf(name)
  return (
    <span
      role="img"
      aria-label={name}
      data-tint={tint}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold',
        size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm',
        AVATAR_TINTS[tint],
        className
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

interface AvatarStackProps {
  names: string[]
  max?: number
}

export function AvatarStack({ names, max = 3 }: AvatarStackProps) {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <span className="flex items-center">
      {shown.map((name, index) => (
        <Avatar key={`${index}-${name}`} name={name} className="-ml-2 ring-2 ring-card first:ml-0" />
      ))}
      {rest > 0 && (
        <span className="-ml-2 inline-grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card">
          +{rest}
        </span>
      )}
    </span>
  )
}

const TITLE_LABELS: Record<string, string> = {
  shidoin: 'Shidoin',
  fukushidoin: 'Fukushidoin',
}

interface BeltBadgeProps {
  grade: string | null | undefined
  title?: string | null
}

const beltKind = (grade: string): 'dan' | 'kyu' | 'none' => {
  if (/dan/i.test(grade)) return 'dan'
  if (/kyu/i.test(grade)) return 'kyu'
  return 'none'
}

const beltClasses = {
  dan: 'bg-foreground text-background',
  kyu: 'bg-card text-foreground ring-[1.5px] ring-inset ring-input',
  none: 'bg-muted text-muted-foreground',
  title: 'bg-primary-soft text-primary',
}

export function BeltBadge({ grade, title }: BeltBadgeProps) {
  const cleanGrade = grade ? formatGradeEs(grade.replace(/\s*-\s*instructor\s*$/i, '')) : ''
  const kind = cleanGrade ? beltKind(cleanGrade) : 'none'
  const titleLabel = title ? TITLE_LABELS[title.toLowerCase()] : undefined
  const badge = 'inline-flex h-6 items-center whitespace-nowrap rounded-[7px] px-2 text-xs font-bold'

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span data-belt={kind} className={cn(badge, beltClasses[kind])}>
        {cleanGrade || 'Sin grado'}
      </span>
      {titleLabel && (
        <span data-belt="title" className={cn(badge, beltClasses.title)}>
          {titleLabel}
        </span>
      )}
    </span>
  )
}

type Tone = 'ok' | 'warn' | 'bad' | 'brand' | 'neutral'

const toneColour: Record<Tone, string> = {
  ok: 'var(--success)',
  warn: 'var(--warning)',
  bad: 'var(--danger)',
  brand: 'var(--primary)',
  neutral: 'var(--muted-foreground)',
}

const percentOf = (value: number, max: number): number => (max > 0 ? Math.round((value / max) * 100) : 0)

interface ProgressProps {
  value: number
  max: number
  label: string
  tone?: Tone
}

export function ProgressRing({ value, max, label, tone = 'ok' }: ProgressProps) {
  const percent = percentOf(value, max)
  const style = {
    background: `conic-gradient(${toneColour[tone]} ${percent}%, var(--muted) 0)`,
  } as CSSProperties
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={style}
      className="grid size-[68px] shrink-0 place-items-center rounded-full"
    >
      <span className="grid size-[52px] place-items-center rounded-full bg-card text-[15px] font-bold tabular-nums">
        {percent}%
      </span>
    </span>
  )
}

export function ProgressBar({ value, max, label, tone = 'ok' }: ProgressProps) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="block h-2.5 overflow-hidden rounded-full bg-muted"
    >
      <span
        className="block h-full rounded-full"
        style={{ width: `${percentOf(value, max)}%`, background: toneColour[tone] }}
      />
    </span>
  )
}

const tileClasses: Record<Tone, string> = {
  ok: 'bg-success-soft text-success',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
  brand: 'bg-primary-soft text-primary',
  neutral: 'bg-muted text-muted-foreground',
}

interface IconTileProps {
  icon: LucideIcon
  tone?: Tone
  className?: string
}

export function IconTile({ icon: Icon, tone = 'neutral', className }: IconTileProps) {
  return (
    <span data-tone={tone} className={cn('grid size-11 shrink-0 place-items-center rounded-xl', tileClasses[tone], className)}>
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

interface TickChipProps {
  label: ReactNode
  price?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function TickChip({ label, price, checked, onCheckedChange, disabled }: TickChipProps) {
  const Icon = checked ? Check : Plus
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 pl-2.5 text-sm font-medium transition-[background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 pointer-coarse:min-h-11',
        checked
          ? 'bg-primary-soft text-primary ring-[1.5px] ring-inset ring-primary'
          : 'bg-card text-muted-foreground ring-[1.5px] ring-inset ring-border hover:text-foreground'
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{label}</span>
      {price && <span className="font-bold tabular-nums">{price}</span>}
    </button>
  )
}
