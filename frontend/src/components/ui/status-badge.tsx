import type { ReactNode } from 'react'
import { CircleCheck, CircleDashed, CircleX, Clock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusTone = 'ok' | 'warn' | 'bad' | 'neutral'

const toneClasses: Record<StatusTone, string> = {
  ok: 'bg-success-soft text-success',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-muted-foreground',
}

const toneIcons: Record<StatusTone, LucideIcon> = {
  ok: CircleCheck,
  warn: Clock,
  bad: CircleX,
  neutral: CircleDashed,
}

interface StatusBadgeProps {
  tone: StatusTone
  children: ReactNode
  className?: string
  icon?: LucideIcon
}

export function StatusBadge({ tone, children, className, icon }: StatusBadgeProps) {
  const Icon = icon ?? toneIcons[tone]
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex h-[26px] w-fit items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-[12.5px] font-semibold',
        toneClasses[tone],
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}
