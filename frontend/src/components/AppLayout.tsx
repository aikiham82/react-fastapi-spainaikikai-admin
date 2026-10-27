import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/Sidebar';
import { Rail } from '@/components/Rail';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { SkipLink } from '@/components/ui/SkipLink';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, userRole, isLoading } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="flex h-dvh bg-background">
      <SkipLink targetId="main-content">Saltar al contenido principal</SkipLink>
      <SkipLink targetId="sidebar">Saltar a navegación</SkipLink>

      <Rail className="hidden shrink-0 lg:flex" id="sidebar" />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 md:py-8 lg:px-10" id="main-content" tabIndex={-1}>
            <ProtectedRoute><Outlet /></ProtectedRoute>
          </main>

        <BottomNav className="lg:hidden" onMore={() => setMobileMenuOpen(true)} />
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[min(18rem,85vw)] p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SheetDescription className="sr-only">Menú de navegación principal</SheetDescription>
          <Sidebar onClose={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
};
