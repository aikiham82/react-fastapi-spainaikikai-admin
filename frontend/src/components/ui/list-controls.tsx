import type { ReactNode } from 'react'
import { MoreHorizontal, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ListToolbarProps {
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
  filters?: ReactNode
  activeFilters?: number
  onClearFilters?: () => void
  action?: ReactNode
}

const filtersLabel = (count: number) =>
  count === 0 ? 'Filtros' : `Filtros (${count} ${count === 1 ? 'activo' : 'activos'})`

export function ListToolbar({ search, filters, activeFilters = 0, onClearFilters, action }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={search.placeholder}
            placeholder={search.placeholder}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="h-11 bg-card pl-9 text-base sm:text-sm"
          />
        </div>
      )}

      {filters && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11" aria-label={filtersLabel(activeFilters)}>
              <SlidersHorizontal className="size-4" />
              Filtros
              {activeFilters > 0 && (
                <span className="rounded-full bg-foreground px-1.5 text-xs font-medium text-background tabular-nums">
                  {activeFilters}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-4">
            {filters}
            {onClearFilters && (
              <Button variant="ghost" className="self-start" onClick={onClearFilters} disabled={activeFilters === 0}>
                Quitar filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>
      )}

      {action && <div className="flex w-full shrink-0 gap-2 sm:ml-auto sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">{action}</div>}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  onClear?: () => void
  action?: ReactNode
}

export function EmptyState({ title, description, onClear, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 border-y border-border px-1 py-8">
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
      {onClear && (
        <Button variant="outline" onClick={onClear}>
          Quitar filtros
        </Button>
      )}
      {action}
    </div>
  )
}

export function ListLoading({ label = 'Cargando' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col border-t border-border">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="border-b border-border py-4">
          <Skeleton className="h-5 w-2/3 max-w-sm" />
        </div>
      ))}
    </div>
  )
}

interface ListErrorProps {
  title: string
  description?: string
  onRetry?: () => void
}

export function ListError({ title, description, onRetry }: ListErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 py-12">
      <p className="font-medium text-danger">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

interface ChipOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface ChipGroupProps<T extends string> {
  label: string
  value: T
  onChange: (value: T) => void
  options: ChipOption<T>[]
}

export function ChipGroup<T extends string>({ label, value, onChange, options }: ChipGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors pointer-coarse:min-h-11',
              selected
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="tabular-nums opacity-80">{option.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

interface RowAction {
  label: string
  onSelect: () => void
  destructive?: boolean
}

interface RowActionsProps {
  label: string
  actions: RowAction[]
}

export function RowActions({ label, actions }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${label}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onSelect={action.onSelect}
            className={cn('min-h-10 text-[15px]', action.destructive && 'text-danger focus:text-danger')}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
