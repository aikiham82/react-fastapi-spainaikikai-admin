import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { isActiveTab } from '@/components/navigation'
import { useNav } from '@/components/useNav'

export const Header = () => {
  const { active, pathname, search } = useNav()
  const tabs = active && active.tabs.length > 1 ? active.tabs : []

  return (
    <header className="shrink-0 border-b border-border bg-card px-4 sm:px-6 lg:px-10">
      <div className="flex h-14 items-center gap-3 lg:h-16">
        <img src="/logo.jpg" alt="" className="size-8 rounded-md mix-blend-multiply lg:hidden" />
        <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground lg:text-xl">
          {active?.title ?? 'Spain Aikikai'}
        </h1>
      </div>
      {active && tabs.length > 0 && (
        <nav aria-label={`Pantallas de ${active.title}`} className="-mx-1 flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => {
            const isActive = isActiveTab(tab, tabs, pathname, search)
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-[14.5px] transition-colors duration-150',
                  isActive ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.title}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
