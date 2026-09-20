import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useUserByMemberQuery } from '../hooks/queries/useUserByMemberQuery';
import { useGeneratePasswordResetLinkMutation } from '../hooks/mutations/useGeneratePasswordResetLinkMutation';
import { useUpdateUserEmailMutation } from '../hooks/mutations/useUpdateUserEmailMutation';

interface MemberAccessAccountProps {
  memberId: string;
}

const formatExpiry = (isoDate: string): string => {
  // The API serialises naive UTC datetimes, which JS would otherwise read as
  // local time and show an expiry hours earlier than the real one.
  const hasOffset = /([Z+]|-\d{2}:\d{2})$/.test(isoDate);
  const date = new Date(hasOffset ? isoDate : `${isoDate}Z`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MemberAccessAccount = ({ memberId }: MemberAccessAccountProps) => {
  const { isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();

  const { data: account, isLoading, isError, error } = useUserByMemberQuery(memberId, isSuperAdmin);
  const {
    mutate: generateLink,
    isPending: isGenerating,
    data: link,
    reset: forgetLink,
  } = useGeneratePasswordResetLinkMutation();
  const { mutate: updateEmail, isPending: isSavingEmail } = useUpdateUserEmailMutation();

  const [editedEmail, setEditedEmail] = useState<string | null>(null);

  if (!isSuperAdmin) return null;

  const isEditing = editedEmail !== null;

  const saveEmail = () => {
    if (!account || !editedEmail?.trim()) return;

    updateEmail(
      { userId: account.id, email: editedEmail.trim() },
      {
        onSuccess: () => {
          setEditedEmail(null);

          // Correcting the email invalidates the account's tokens server side,
          // so any link already on screen is dead and must not be offered.
          if (link) {
            forgetLink();
            toast.info('El enlace anterior ha dejado de funcionar');
          }
        },
      }
    );
  };

  const copyLink = async () => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const expiry = link ? formatExpiry(link.expires_at) : '';

  const errorMessage = (error as { status?: number } | null)?.status === 404
    ? 'Este socio no tiene cuenta de acceso'
    : 'No se pudo consultar la cuenta de acceso';

  return (
    <section
      aria-labelledby="access-account-heading"
      className="space-y-3 rounded-lg border bg-muted/50 p-4"
    >
      <h3 id="access-account-heading" className="text-sm font-medium">
        Cuenta de acceso
      </h3>

      {isLoading && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Cargando cuenta...
        </p>
      )}

      {isError && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {errorMessage}
        </p>
      )}

      {account && (
        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="login_email">Correo de acceso</Label>
              <Input
                id="login_email"
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEmail();
                  }
                }}
                placeholder="club@example.com"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">{account.email}</p>
              <p className="text-xs text-muted-foreground">
                Es el correo con el que este club inicia sesión. Puede ser distinto del correo del socio.
              </p>
            </div>
          )}

          {isEditing ? (
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button type="button" disabled={isSavingEmail} onClick={saveEmail}>
                {isSavingEmail ? 'Guardando...' : 'Guardar correo'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditedEmail(null)}>
                Descartar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {link && (
                  <Button type="button" onClick={copyLink}>
                    Copiar enlace
                  </Button>
                )}

                <Button
                  type="button"
                  variant={link ? 'ghost' : 'default'}
                  disabled={isGenerating}
                  onClick={() => generateLink(account.id)}
                >
                  {isGenerating
                    ? 'Generando...'
                    : link
                      ? 'Generar un enlace nuevo'
                      : 'Generar enlace para cambiar la contraseña'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="sm:ml-auto"
                  onClick={() => setEditedEmail(account.email)}
                >
                  Corregir correo de acceso
                </Button>
              </div>

              {!link && (
                <p className="text-xs text-muted-foreground">
                  El enlace caduca 24 horas después de generarlo.
                </p>
              )}
            </div>
          )}

          {link && !isEditing && !isGenerating && (
            <div role="status" aria-live="polite" className="space-y-1">
              <Input
                readOnly
                value={link.url}
                onFocus={(e) => e.target.select()}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {expiry
                  ? `Enlace para ${link.email}. Caduca el ${expiry}.`
                  : `Enlace para ${link.email}.`}
              </p>
              <p className="text-xs text-muted-foreground">
                Al generar uno nuevo, el anterior deja de funcionar.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
