import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatusTone = 'ok' | 'warn' | 'bad' | 'neutral'

const toneClasses: Record<StatusTone, string> = {
  ok: 'bg-success-soft text-success',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-muted-foreground',
}

interface StatusBadgeProps {
  tone: StatusTone
  children: ReactNode
  className?: string
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-2 pr-2.5 text-[13px] font-medium',
        "before:size-1.5 before:rounded-full before:bg-current before:content-['']",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
