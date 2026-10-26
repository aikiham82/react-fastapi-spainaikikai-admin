import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { Button } from '@/components/ui/button';
import { UpdateOwnEmailDialog } from '@/features/auth/components/UpdateOwnEmailDialog';
import { useRequestPasswordResetMutation } from '@/features/password-reset/hooks/mutations/useRequestPasswordReset.mutation';

const roleTranslations: Record<string, string> = {
  super_admin: 'Administrador de la federación',
  club_admin: 'Administrador de club',
};

export const SettingsPage = () => {
  const { currentUser, userEmail, userRole } = useAuthContext();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { requestResetAsync, isLoading } = useRequestPasswordResetMutation();

  const email = currentUser?.email ?? userEmail ?? null;

  const sendLink = async () => {
    if (!email) return;
    try {
      await requestResetAsync({ identifier: email });
      setSentTo(email);
    } catch {
      toast.error('No se pudo enviar el enlace. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="max-w-2xl divide-y divide-border">
      <section className="space-y-4 pb-8">
        <h2 className="text-lg font-semibold text-foreground">Mi cuenta</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Correo de acceso</dt>
            <dd className="break-all text-foreground">{email ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Rol</dt>
            <dd className="text-foreground">
              {userRole ? (roleTranslations[userRole] ?? userRole) : 'No disponible'}
            </dd>
          </div>
        </dl>
        <Button variant="outline" onClick={() => setIsEditingEmail(true)}>
          Cambiar mi correo
        </Button>
        {currentUser && (
          <UpdateOwnEmailDialog
            open={isEditingEmail}
            onOpenChange={setIsEditingEmail}
            currentEmail={currentUser.email}
          />
        )}
      </section>

      <section className="space-y-4 pt-8">
        <h2 className="text-lg font-semibold text-foreground">Contraseña</h2>
        <p className="text-sm text-muted-foreground">
          Te enviaremos un correo con un enlace para que elijas una contraseña nueva.
        </p>
        <Button variant="outline" onClick={sendLink} disabled={isLoading || !email}>
          {isLoading ? 'Enviando...' : 'Enviarme un enlace para cambiarla'}
        </Button>
        {sentTo && (
          <p role="status" className="text-sm text-success">
            Te hemos enviado un enlace a {sentTo}.
          </p>
        )}
      </section>
    </div>
  );
};
