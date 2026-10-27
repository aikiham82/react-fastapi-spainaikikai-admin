import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { getPageTitle } from '@/components/navigation';

export const Header: React.FC = () => {
  const { userRole } = useAuthContext();
  const location = useLocation();
  const title = getPageTitle(location.pathname, userRole);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6 lg:h-16 lg:px-10">
      <img src="/logo.jpg" alt="" className="size-8 rounded-md mix-blend-multiply lg:hidden" />
      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight text-foreground lg:text-xl">{title}</h1>
    </header>
  );
};
