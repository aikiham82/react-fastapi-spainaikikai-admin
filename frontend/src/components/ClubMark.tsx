import { initialsOf } from '@/components/ui/graphic'
import { cn } from '@/lib/utils'

interface ClubMarkProps {
  clubName: string | null
  size?: 'sm' | 'md'
}

export const ClubMark = ({ clubName, size = 'md' }: ClubMarkProps) => {
  const box = size === 'sm' ? 'size-9 rounded-[10px] text-[13px]' : 'size-11 rounded-xl text-[15px]'
  if (!clubName) {
    return <img src="/logo.jpg" alt="" className={cn('shrink-0 mix-blend-multiply', box)} />
  }
  return (
    <span
      role="img"
      aria-label={clubName}
      className={cn('grid shrink-0 place-items-center bg-primary font-bold tracking-wide text-primary-foreground', box)}
    >
      {initialsOf(clubName)}
    </span>
  )
}
