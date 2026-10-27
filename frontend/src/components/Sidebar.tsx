import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/graphic';
import { useNavCounters } from '@/features/dashboard/hooks/useNavCounters';
import { roleLabels } from '@/core/utils/roleLabels';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { usePermissions } from '@/core/hooks/usePermissions';
import { getNavSections, isActivePath } from '@/components/navigation';


interface SidebarProps {
  className?: string;
  id?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

const rowClasses =
  'flex min-h-[42px] w-full items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors duration-150 pointer-coarse:min-h-11';

export const Sidebar: React.FC<SidebarProps> = ({ className, id, isMobile, onClose }) => {
  const location = useLocation();
  const { userRole, userEmail, logout } = useAuthContext();
  const { canAccess } = usePermissions();
  const counters = useNavCounters();

  const sections = getNavSections(userRole, (resource) => canAccess({ resource, action: 'read' }));
  const closeOnMobile = isMobile ? onClose : undefined;

  const handleLogout = () => {
    logout();
    closeOnMobile?.();
  };

  return (
    <div
      id={id}
      className={cn('flex h-full flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-5', className)}
    >
      <div className="flex items-center gap-3 px-2">
        <img src="/logo.jpg" alt="" className="size-10 rounded-md mix-blend-multiply" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight text-foreground">Spain Aikikai</p>
          {userRole && <p className="text-[13px] text-muted-foreground">{roleLabels[userRole] ?? userRole}</p>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {sections.map((section) => (
          <nav key={section.id} aria-labelledby={`nav-${section.id}`} className="flex flex-col gap-0.5">
            <p id={`nav-${section.id}`} className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = isActivePath(item.path, location.pathname);
              const Icon = item.icon;
              const count = counters[item.path];
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeOnMobile}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    rowClasses,
                    isActive
                      ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                  {item.title}
                  {count !== undefined && (
                    <span className="ml-auto rounded-full bg-danger-soft px-2 text-xs font-semibold text-danger tabular-nums">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        ))}
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
