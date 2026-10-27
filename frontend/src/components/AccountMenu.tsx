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
  const { name, firstName, email, clubName, clubLogoUrl, roleLabel } = useIdentity()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Tu cuenta: ${name}`}
          className="flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[11.5px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
        >
          <Avatar name={name} />
          <span title={firstName} className="max-w-full truncate px-1">{firstName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={20}
        aria-label="Tu cuenta"
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          ;(event.currentTarget as HTMLElement).focus()
        }}
        className="flex w-72 flex-col gap-3.5 p-4 outline-none"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} size="md" />
          <div className="min-w-0">
            <p className="break-words text-[15px] font-semibold text-foreground">{name}</p>
            <p className="break-all text-[13px] text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 border-t border-border pt-3.5">
          {clubName && <ClubMark clubName={clubName} logoUrl={clubLogoUrl} size="sm" />}
          <div className="flex min-w-0 flex-col gap-1">
            {clubName && <p className="text-sm font-semibold text-foreground">{clubName}</p>}
            {roleLabel && <RoleChip label={roleLabel} />}
          </div>
        </div>
        <div className="border-t border-border pt-2">
          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-muted"
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
