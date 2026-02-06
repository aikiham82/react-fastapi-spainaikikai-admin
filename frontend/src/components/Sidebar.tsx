import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Building2,
  Users,
  IdCard,
  Calendar,
  Shield,
  FileSpreadsheet,
  Settings,
  LogOut,
  DollarSign,
  FileText,
  Receipt,
} from 'lucide-react';

import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { usePermissions } from '@/core/hooks/usePermissions';
import type { LucideIcon } from 'lucide-react';

const roleTranslations: Record<string, string> = {
  'super_admin': 'Administrador',
  'club_admin': 'Admin de Club',
};

interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  resource: string;
}

const navItems: NavItem[] = [
  { title: 'Panel Principal', path: '/', icon: Home, resource: 'clubs' },
  { title: 'Clubs', path: '/clubs', icon: Building2, resource: 'clubs' },
  { title: 'Miembros', path: '/members', icon: Users, resource: 'members' },
  { title: 'Licencias', path: '/licenses', icon: IdCard, resource: 'licenses' },
  { title: 'Facturas', path: '/invoices', icon: FileText, resource: 'invoices' },
  { title: 'Pagos Anuales', path: '/annual-payments', icon: Receipt, resource: 'payments' },
  { title: 'Seminarios', path: '/seminars', icon: Calendar, resource: 'seminars' },
  { title: 'Seguros', path: '/insurance', icon: Shield, resource: 'insurance' },
  { title: 'Importar/Exportar', path: '/import-export', icon: FileSpreadsheet, resource: 'import_export' },
  { title: 'Precios', path: '/price-configurations', icon: DollarSign, resource: 'price_configurations' },
  { title: 'Configuracion', path: '/settings', icon: Settings, resource: 'clubs' },
];

interface SidebarProps {
  className?: string;
  id?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className, id, isMobile, onClose }) => {
  const location = useLocation();
  const { userRole, logout } = useAuthContext();
  const { canAccess } = usePermissions();

  const handleLogout = () => {
    logout();
    if (isMobile && onClose) {
      onClose();
    }
  };

  const filteredNavItems = navItems.filter((item) =>
    canAccess({ resource: item.resource, action: 'read' })
  );

  return (
    <div id={id} className={cn('flex flex-col h-full bg-slate-900 text-slate-100', className)}>
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-white leading-none">Aikido Admin</h1>
        {userRole && (
          <p className="text-[11px] font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">
            {roleTranslations[userRole] || userRole.replace('_', ' ')}
          </p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={isMobile ? onClose : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                  <span className="font-medium text-sm">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};
