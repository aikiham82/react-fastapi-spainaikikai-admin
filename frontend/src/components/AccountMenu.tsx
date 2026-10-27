import { LogOut } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar } from '@/components/ui/graphic'
import { ClubMark } from '@/components/ClubMark'
import { useIdentity } from '@/components/useIdentity'
import { useAuthContext } from '@/features/auth/hooks/useAuthContext'

const RoleChip = ({ label }: { label: string }) => (
  <span className="inline-flex w-fit rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
    {label}
  </span>
)

export const AccountMenu = () => {
  const { logout } = useAuthContext()
  const { name, email, clubName, roleLabel } = useIdentity()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Tu cuenta: ${name}`}
          className="flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[11.5px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
        >
          <Avatar name={name} />
          <span className="max-w-full truncate px-1">{name.split(' ')[0]}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={8} className="flex w-72 flex-col gap-3.5 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-foreground">{name}</p>
            <p className="truncate text-[13px] text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 border-t border-border pt-3.5">
          {clubName ? (
            <>
              <ClubMark clubName={clubName} size="sm" />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">{clubName}</p>
                {roleLabel && <RoleChip label={roleLabel} />}
              </div>
            </>
          ) : (
            roleLabel && <RoleChip label={roleLabel} />
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 items-center gap-2.5 rounded-lg border-t border-border px-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-muted"
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
          Cerrar sesión
        </button>
      </PopoverContent>
    </Popover>
  )
}
