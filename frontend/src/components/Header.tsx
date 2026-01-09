import { Menu, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/':
    case '/home':
      return 'Dashboard';
    case '/clubs':
      return 'Clubs';
    case '/members':
      return 'Miembros';
    case '/licenses':
      return 'Licencias';
    case '/payments':
      return 'Pagos';
    case '/seminars':
      return 'Seminarios';
    case '/insurance':
      return 'Seguros';
    case '/import-export':
      return 'Importar/Exportar';
    case '/settings':
      return 'Configuración';
    default:
      return 'Dashboard';
  }
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { userEmail } = useAuthContext();
  const location = useLocation();
  const title = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {userEmail}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
