import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavCounters } from '@/features/dashboard/hooks/useNavCounters'
import { groupCount, type NavGroup } from '@/components/navigation'
import { useNav } from '@/components/useNav'
import { useAuthContext } from '@/features/auth/hooks/useAuthContext'

interface RailProps {
  className?: string
  id?: string
}

const RailLink = ({ group, isActive, count }: { group: NavGroup; isActive: boolean; count?: number }) => {
  const Icon = group.icon
  return (
    <Link
      to={group.to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[11.5px] transition-colors duration-150',
        isActive ? 'bg-sidebar-accent font-semibold text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="size-[22px]" aria-hidden="true" />
      {group.title}
      {count !== undefined && (
        <span className="absolute right-2 top-1 min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-semibold leading-5 text-primary-foreground tabular-nums">
          {count}
        </span>
      )}
    </Link>
  )
}

export const Rail = ({ className, id }: RailProps) => {
  const { groups, active } = useNav()
  const { logout } = useAuthContext()
  const counters = useNavCounters()
  const render = (group: NavGroup) => (
    <RailLink key={group.id} group={group} isActive={active?.id === group.id} count={groupCount(group, counters)} />
  )

  return (
    <nav
      id={id}
      aria-label="Secciones"
      className={cn('flex h-full w-[88px] flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-4', className)}
    >
      <img src="/logo.jpg" alt="" className="mb-3 size-10 rounded-md mix-blend-multiply" />
      {groups.filter((group) => !group.footer).map(render)}
      <div className="mt-auto flex flex-col items-center gap-1">
        {groups.filter((group) => group.footer).map(render)}
        <button
          type="button"
          onClick={logout}
          aria-label="Cerrar sesión"
          className="flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[11.5px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-[22px]" aria-hidden="true" />
          Salir
        </button>
      </div>
    </nav>
  )
}
