import type { ReactNode } from 'react'

interface DetailFieldProps {
  label: string
  children: ReactNode
}

export function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-foreground">{children}</dd>
    </div>
  )
}
