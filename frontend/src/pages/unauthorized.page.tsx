import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthContext();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Acceso No Autorizado
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No tienes permisos para acceder al panel de administración.
          </p>
          <div className="mt-6 space-y-3">
            {isAuthenticated ? (
              <Button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full"
              >
                Cerrar Sesión
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
