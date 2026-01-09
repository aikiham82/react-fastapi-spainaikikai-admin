import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { SkipLink } from '@/components/ui/SkipLink';

export const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SkipLink targetId="main-content">Saltar al contenido principal</SkipLink>
      <SkipLink targetId="sidebar">Saltar a navegación</SkipLink>

      <Sidebar className="hidden lg:flex lg:w-64 flex-shrink-0" id="sidebar" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

          <main className="flex-1 overflow-y-auto p-6" id="main-content" tabIndex={-1}>
            <ProtectedRoute><Outlet /></ProtectedRoute>
          </main>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar isMobile onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};
