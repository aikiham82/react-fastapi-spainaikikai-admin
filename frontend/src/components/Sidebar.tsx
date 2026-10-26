import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { usePermissions } from '@/core/hooks/usePermissions';
import { getNavSections, isActivePath } from '@/components/navigation';

const roleLabels: Record<string, string> = {
  super_admin: 'Administrador',
  club_admin: 'Responsable de club',
};

interface SidebarProps {
  className?: string;
  id?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

const rowClasses =
  'flex min-h-10 w-full items-center rounded-md px-3 text-[15px] transition-colors duration-150 pointer-coarse:min-h-11';

export const Sidebar: React.FC<SidebarProps> = ({ className, id, isMobile, onClose }) => {
  const location = useLocation();
  const { userRole, userEmail, logout } = useAuthContext();
  const { canAccess } = usePermissions();

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
            <p id={`nav-${section.id}`} className="px-3 pb-1 text-[13px] font-medium text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = isActivePath(item.path, location.pathname);
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
                  {item.title}
                </Link>
              );
            })}
          </nav>
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-sidebar-border px-1 pt-4">
        {userEmail && <p className="truncate px-2 text-[13px] text-muted-foreground">{userEmail}</p>}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(rowClasses, 'text-sidebar-foreground hover:bg-muted hover:text-foreground')}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};
