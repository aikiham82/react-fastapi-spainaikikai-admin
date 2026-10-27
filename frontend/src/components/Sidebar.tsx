import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/graphic';
import { roleLabels } from '@/core/utils/roleLabels';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { isActiveTab } from '@/components/navigation';
import { useNav } from '@/components/useNav';

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

const rowClasses =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors duration-150';

export const Sidebar = ({ className, onClose }: SidebarProps) => {
  const { userRole, userEmail, logout } = useAuthContext();
  const { groups, pathname, search } = useNav();

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  return (
    <div className={cn('flex h-full flex-col gap-6 bg-sidebar px-3 py-5', className)}>
      <div className="flex items-center gap-3 px-2">
        <img src="/logo.jpg" alt="" className="size-10 rounded-md mix-blend-multiply" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight text-foreground">Spain Aikikai</p>
          {userRole && <p className="text-[13px] text-muted-foreground">{roleLabels[userRole] ?? userRole}</p>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <nav key={group.id} aria-label={group.title} className="flex flex-col gap-0.5">
              <p className="flex items-center gap-2 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <Icon className="size-3.5" aria-hidden="true" />
                {group.title}
              </p>
              {group.tabs.map((tab) => {
                const isActive = isActiveTab(tab, group.tabs, pathname, search);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      rowClasses,
                      isActive
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {tab.title}
                  </Link>
                );
              })}
            </nav>
          );
        })}
      </div>

      <div className="flex flex-col gap-1 border-t border-sidebar-border pt-4">
        {userEmail && (
          <div className="flex min-w-0 items-center gap-2.5 px-3 pb-1">
            <Avatar name={userEmail.split('@')[0].replace(/[._-]+/g, ' ')} />
            <p className="truncate text-[13px] text-muted-foreground">{userEmail}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(rowClasses, 'text-sidebar-foreground hover:bg-muted hover:text-foreground')}
        >
          <LogOut className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};
