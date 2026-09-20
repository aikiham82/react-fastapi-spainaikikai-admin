import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useUserByMemberQuery } from '../hooks/queries/useUserByMemberQuery';
import { useGeneratePasswordResetLinkMutation } from '../hooks/mutations/useGeneratePasswordResetLinkMutation';

interface MemberAccessAccountProps {
  memberId: string;
}

export const MemberAccessAccount = ({ memberId }: MemberAccessAccountProps) => {
  const { isAssociationAdmin } = usePermissions();
  const isSuperAdmin = isAssociationAdmin();

  const { data: account, isLoading, isError } = useUserByMemberQuery(memberId, isSuperAdmin);
  const { mutate: generateLink, isPending, data: link } = useGeneratePasswordResetLinkMutation();

  if (!isSuperAdmin) return null;

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
          <div className="space-y-1">
            <p className="text-sm font-medium">{account.email}</p>
            <p className="text-xs text-muted-foreground">
              Correo con el que entra en la aplicación. Puede no coincidir con el del socio ni con el del club.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
