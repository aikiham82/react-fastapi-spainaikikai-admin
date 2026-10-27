import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { getPageTitle } from '@/components/navigation';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { userRole } = useAuthContext();
  const location = useLocation();
  const title = getPageTitle(location.pathname, userRole);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6 lg:h-16 lg:px-10">
      <Button
        variant="outline"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="lg:hidden"
      >
        <Menu className="size-5" />
        <span className="hidden sm:inline">Menú</span>
      </Button>
      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground lg:text-xl">{title}</h1>
    </header>
  );
};
