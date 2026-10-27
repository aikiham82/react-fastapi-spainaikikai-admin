import { useState } from 'react';
import { CircleCheck, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { roleLabels } from '@/core/utils/roleLabels';
import { toast } from 'sonner';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, IconTile } from '@/components/ui/graphic';
import { StatusBadge } from '@/components/ui/status-badge';
import { UpdateOwnEmailDialog } from '@/features/auth/components/UpdateOwnEmailDialog';
import { useRequestPasswordResetMutation } from '@/features/password-reset/hooks/mutations/useRequestPasswordReset.mutation';

const cardClass = 'space-y-4 rounded-[18px] bg-card p-5 shadow-card';
const headingClass = 'text-sm font-semibold text-muted-foreground';

export const SettingsPage = () => {
  const { currentUser, userEmail, userRole } = useAuthContext();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { requestResetAsync, isLoading } = useRequestPasswordResetMutation();

  const email = currentUser?.email ?? userEmail ?? null;
  const roleLabel = userRole ? (roleLabels[userRole] ?? userRole) : 'No disponible';

  const sendLink = async () => {
    if (!email) return;
    try {
      const result = await requestResetAsync({ identifier: email });
      if (result?.success === false) {
        toast.error('No se pudo enviar el enlace. Inténtalo de nuevo.');
        return;
      }
      setSentTo(email);
    } catch {
      toast.error('No se pudo enviar el enlace. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <section aria-labelledby="settings-account" className={cardClass}>
        <h2 id="settings-account" className={headingClass}>
          Mi cuenta
        </h2>
        <div className="flex items-center gap-3">
          <Avatar name={email ?? '?'} size="md" className="size-12 text-base" />
          <div className="min-w-0 space-y-1">
            <p className="break-all text-[15px] font-semibold text-foreground">{email ?? 'No disponible'}</p>
            <StatusBadge tone="neutral" icon={ShieldCheck}>
              {roleLabel}
            </StatusBadge>
          </div>
        </div>
        <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setIsEditingEmail(true)}>
          <Mail className="size-4" aria-hidden="true" />
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

      <section aria-labelledby="settings-password" className={cardClass}>
        <h2 id="settings-password" className={headingClass}>
          Contraseña
        </h2>
        <div className="flex items-center gap-3">
          <IconTile icon={KeyRound} tone="brand" />
          <p className="text-[15px] text-foreground">Te enviaremos un enlace por correo.</p>
        </div>
        <Button className="min-h-11 w-full sm:w-auto" onClick={sendLink} disabled={isLoading || !email}>
          {isLoading ? 'Enviando...' : 'Enviarme un enlace para cambiarla'}
        </Button>
        {sentTo && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm font-medium text-success">
            <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
            <span>{`Te hemos enviado un enlace a ${sentTo}.`}</span>
          </p>
        )}
      </section>
    </div>
  );
};
