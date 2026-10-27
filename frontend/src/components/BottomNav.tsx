import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { usePermissions } from '@/core/hooks/usePermissions';
import { getMobileTabs, isActivePath } from '@/components/navigation';

interface BottomNavProps {
  onMore: () => void;
  className?: string;
}

const tabClasses =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-150';

export const BottomNav: React.FC<BottomNavProps> = ({ onMore, className }) => {
  const location = useLocation();
  const { userRole } = useAuthContext();
  const { canAccess } = usePermissions();
  const tabs = getMobileTabs(userRole, (resource) => canAccess({ resource, action: 'read' }));

  return (
    <nav
      aria-label="Navegación principal"
      className={cn('flex shrink-0 border-t border-border bg-card px-1 pb-[max(env(safe-area-inset-bottom),6px)]', className)}
    >
      {tabs.map(({ title, path, icon: Icon }) => {
        const isActive = isActivePath(path, location.pathname);
        return (
          <Link
            key={path}
            to={path}
            aria-current={isActive ? 'page' : undefined}
            className={cn(tabClasses, isActive ? 'font-semibold text-primary' : 'text-muted-foreground')}
          >
            <Icon className="size-[22px]" aria-hidden="true" />
            {title}
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={cn(tabClasses, 'text-muted-foreground')}>
        <Menu className="size-[22px]" aria-hidden="true" />
        Más
      </button>
    </nav>
  );
};
