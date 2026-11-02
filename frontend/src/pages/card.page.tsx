import { Loader2, LogOut } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { InstallAppButton } from '@/features/auth/components/InstallAppButton';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { MemberCard } from '@/features/licenses/components/MemberCard';
import { useMemberLicensesQuery } from '@/features/licenses/hooks/queries/useLicenseQueries';

const Loading = () => (
  <div className="flex justify-center py-16">
    <Loader2 className="size-8 animate-spin text-primary" aria-label="Cargando carné" />
  </div>
);

const Message = ({ title, children }: { title: string; children?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-3 rounded-[18px] bg-card p-8 text-center shadow-card">
    <p className="text-lg font-semibold text-foreground">{title}</p>
    {children}
  </div>
);

const LoadFailed = ({ onRetry }: { onRetry: () => void }) => (
  <Message title="No se pudo cargar tu carné">
    <Button variant="outline" onClick={onRetry}>Reintentar</Button>
  </Message>
);

const CardContent = ({ memberId }: { memberId: string | undefined }) => {
  const { data, isLoading, refetch } = useMemberLicensesQuery(memberId);

  if (!memberId) return <Message title="Sin miembro asociado" />;
  if (isLoading) return <Loading />;
  if (!data) return <LoadFailed onRetry={() => refetch()} />;
  return <MemberCard licenses={data} />;
};

export default function CardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, userLoadFailed, retryLoadingUser, userRole, logout } = useAuthContext();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const userContent = userLoadFailed ? <LoadFailed onRetry={retryLoadingUser} /> : <Loading />;

  return (
    <div className="h-dvh overflow-y-auto bg-background">
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
        <header className="flex items-center gap-3">
          <img src="/logo.jpg" alt="" className="size-12 mix-blend-multiply" />
          <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-foreground">Tu carné</h1>
          <Button variant="ghost" className="min-h-11" onClick={signOut}>
            <LogOut className="mr-2 size-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </header>

        {currentUser ? <CardContent memberId={currentUser.member_id} /> : userContent}

        {userRole && (
          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link to="/">Volver al panel</Link>
          </Button>
        )}

        <InstallAppButton />
      </main>
    </div>
  );
}
