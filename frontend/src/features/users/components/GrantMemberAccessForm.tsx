import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGrantMemberAccessMutation } from '../hooks/mutations/useGrantMemberAccessMutation';

interface GrantMemberAccessFormProps {
  memberId: string;
  memberEmail?: string;
}

export const GrantMemberAccessForm = ({ memberId, memberEmail = '' }: GrantMemberAccessFormProps) => {
  const [email, setEmail] = useState(memberEmail);
  const [clubAdmin, setClubAdmin] = useState(false);
  const { mutate: grant, isPending, data: link } = useGrantMemberAccessMutation();

  const giveAccess = () => {
    if (!email.trim()) return;
    grant({ memberId, email: email.trim(), clubAdmin });
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

  if (link) {
    return (
      <div role="status" aria-live="polite" className="space-y-2">
        <p className="text-sm">
          Le hemos enviado un correo a {link.email} para que ponga su contraseña
        </p>
        <p className="text-xs text-muted-foreground">
          Si no le llega, mándale este enlace. Caduca en 24 horas.
        </p>
        <Button type="button" onClick={copyLink}>
          Copiar enlace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Este socio todavía no puede entrar en la web.</p>
      <div className="space-y-2">
        <Label htmlFor="grant_email">Correo con el que entrará</Label>
        <Input
          id="grant_email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              giveAccess();
            }
          }}
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="grant_club_admin"
          checked={clubAdmin}
          onCheckedChange={(checked) => setClubAdmin(checked === true)}
        />
        <Label htmlFor="grant_club_admin" className="font-normal">
          Puede gestionar el club (pagos, altas y consultas)
        </Label>
      </div>
      <Button type="button" disabled={isPending} onClick={giveAccess}>
        {isPending ? 'Dando acceso...' : 'Dar acceso a la web'}
      </Button>
    </div>
  );
};
