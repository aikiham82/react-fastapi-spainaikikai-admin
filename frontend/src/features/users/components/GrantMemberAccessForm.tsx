import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGrantMemberAccessMutation } from '../hooks/mutations/useGrantMemberAccessMutation';

interface GrantMemberAccessFormProps {
  memberId: string;
  memberEmail?: string;
}

export const GrantMemberAccessForm = ({ memberId, memberEmail = '' }: GrantMemberAccessFormProps) => {
  const [email, setEmail] = useState(memberEmail);
  const { mutate: grant, isPending, data: link } = useGrantMemberAccessMutation();

  const giveAccess = () => {
    if (!email.trim()) return;
    grant({ memberId, email: email.trim(), clubAdmin: true });
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
        <p className="text-sm break-all">
          Le hemos enviado un correo a {link.email} para que ponga su contraseña y entre al panel.
        </p>
        <p className="text-xs text-muted-foreground">
          Si no le llega, mándale este enlace. Caduca en 24 horas.
        </p>
        <Button type="button" variant="outline" onClick={copyLink}>
          Copiar enlace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Este socio no gestiona el club.</p>
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
      <Button type="button" variant="outline" disabled={isPending} onClick={giveAccess}>
        {isPending ? 'Haciendo responsable...' : 'Hacer responsable del club'}
      </Button>
    </div>
  );
};
