import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavCounters } from '@/features/dashboard/hooks/useNavCounters'
import { MOBILE_GROUP_IDS, groupCount } from '@/components/navigation'
import { useNav } from '@/components/useNav'

interface BottomNavProps {
  onMore: () => void
  className?: string
}

const tabClasses =
  'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-150'

export const BottomNav = ({ onMore, className }: BottomNavProps) => {
  const { groups, active } = useNav()
  const counters = useNavCounters()

  return (
    <nav
      aria-label="Navegación principal"
      className={cn('flex shrink-0 border-t border-border bg-card px-1 pb-[max(env(safe-area-inset-bottom),6px)]', className)}
    >
      {groups
        .filter((group) => MOBILE_GROUP_IDS.includes(group.id))
        .map((group) => {
          const isActive = active?.id === group.id
          const count = groupCount(group, counters)
          const Icon = group.icon
          return (
            <Link
              key={group.id}
              to={group.to}
              aria-current={isActive ? 'page' : undefined}
              className={cn(tabClasses, isActive ? 'font-semibold text-primary' : 'text-muted-foreground')}
            >
              <Icon className="size-[22px]" aria-hidden="true" />
              {group.title}
              {count !== undefined && (
                <span className="absolute left-1/2 top-1.5 ml-1.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10.5px] font-semibold leading-[18px] text-primary-foreground tabular-nums">
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      <button
        type="button"
        onClick={onMore}
        className={cn(tabClasses, active && !MOBILE_GROUP_IDS.includes(active.id) ? 'font-semibold text-primary' : 'text-muted-foreground')}
      >
        <Menu className="size-[22px]" aria-hidden="true" />
        Más
      </button>
    </nav>
  )
}
