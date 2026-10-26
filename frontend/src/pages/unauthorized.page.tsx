import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { AuthHeading, AuthLayout } from '@/features/auth/components/AuthLayout';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthContext();

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <AuthHeading title="No tienes permiso para ver esta página">
          Tu cuenta todavía no tiene acceso a la gestión. Pide acceso a tu club o a la Federación.
        </AuthHeading>
        {isAuthenticated ? (
          <Button size="lg" className="w-full" onClick={signOut}>
            Cerrar sesión
          </Button>
        ) : (
          <Button size="lg" className="w-full" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}
