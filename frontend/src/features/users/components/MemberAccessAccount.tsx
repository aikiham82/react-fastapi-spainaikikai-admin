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

export const MemberAccessAccount = ({ memberId }: MemberAccessAccountProps) => {
  const { isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();

  const { data: account, isLoading, isError } = useUserByMemberQuery(memberId, isSuperAdmin);
  const { mutate: generateLink, isPending, data: link } = useGeneratePasswordResetLinkMutation();
  const { mutate: updateEmail, isPending: isSavingEmail } = useUpdateUserEmailMutation();

  const [editedEmail, setEditedEmail] = useState<string | null>(null);

  if (!isSuperAdmin) return null;

  const saveEmail = () => {
    if (!account || !editedEmail?.trim()) return;

    updateEmail({ userId: account.id, email: editedEmail.trim() });
    setEditedEmail(null);
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

  return (
    <div className="space-y-2 rounded-md border p-4">
      <Label>Cuenta de acceso</Label>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando cuenta...</p>}

      {isError && (
        <p className="text-sm text-muted-foreground">Este socio no tiene cuenta de acceso</p>
      )}

      {account && (
        <div className="space-y-3">
          {editedEmail === null ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">{account.email}</p>
              <p className="text-xs text-muted-foreground">
                Correo con el que entra en la aplicación. Puede no coincidir con el del socio ni con el del club.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="login_email">Correo de acceso</Label>
              <Input
                id="login_email"
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                placeholder="club@example.com"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {editedEmail === null ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditedEmail(account.email)}
              >
                Corregir correo de acceso
              </Button>
            ) : (
              <>
                <Button type="button" disabled={isSavingEmail} onClick={saveEmail}>
                  Guardar correo
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditedEmail(null)}>
                  Cancelar
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => generateLink(account.id)}
            >
              Generar enlace de acceso
            </Button>

            {link && (
              <Button type="button" variant="secondary" onClick={copyLink}>
                Copiar enlace
              </Button>
            )}
          </div>

          {link && (
            <div className="space-y-1">
              <p className="break-all text-xs text-muted-foreground">{link.url}</p>
              <p className="text-xs text-muted-foreground">El enlace caduca en 24 horas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
