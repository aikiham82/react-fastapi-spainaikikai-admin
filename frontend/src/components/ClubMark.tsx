import { useState } from 'react'
import { initialsOf } from '@/components/ui/graphic'
import { resolveApiUrl } from '@/core/data/apiClient'
import { cn } from '@/lib/utils'

interface ClubMarkProps {
  clubName: string | null
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const GENERIC_WORDS = new Set([
  'asociación', 'asociacion', 'club', 'deportiva', 'deportivo', 'cultural', 'escuela',
  'aikido', 'aikikai', 'dojo', 'de', 'del', 'la', 'el', 'los', 'las', 'y',
])

const clubInitials = (name: string): string => {
  const distinctive = name.split(/\s+/).filter((word) => word && !GENERIC_WORDS.has(word.toLowerCase()))
  return initialsOf(distinctive.length > 0 ? distinctive.join(' ') : name)
}

const BOX = {
  sm: 'size-9 rounded-[10px] text-[13px]',
  md: 'size-11 rounded-xl text-[15px]',
  lg: 'size-16 rounded-2xl text-xl',
}

export const ClubMark = ({ clubName, logoUrl, size = 'md' }: ClubMarkProps) => {
  const box = BOX[size]
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (!clubName) {
    return <img src="/logo.jpg" alt="" className={cn('shrink-0 mix-blend-multiply', box)} />
  }
  if (logoUrl && logoUrl !== failedUrl) {
    return (
      <img
        src={resolveApiUrl(logoUrl)}
        alt={clubName}
        onError={() => setFailedUrl(logoUrl)}
        className={cn('shrink-0 border border-border bg-card object-cover', box)}
      />
    )
  }
  return (
    <span
      role="img"
      aria-label={clubName}
      className={cn('grid shrink-0 place-items-center bg-primary font-bold tracking-wide text-primary-foreground', box)}
    >
      {clubInitials(clubName)}
    </span>
  )
}
