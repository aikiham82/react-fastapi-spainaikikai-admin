import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateOwnEmailMutation } from '../hooks/mutations/useUpdateOwnEmail.mutation';

interface UpdateOwnEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

export const UpdateOwnEmailDialog = ({
  open,
  onOpenChange,
  currentEmail,
}: UpdateOwnEmailDialogProps) => {
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const { mutate: updateOwnEmail, isPending } = useUpdateOwnEmailMutation();

  useEffect(() => {
    if (open) {
      setEmail(currentEmail);
      setCurrentPassword('');
    }
  }, [open, currentEmail]);

  const isComplete = Boolean(email.trim()) && Boolean(currentPassword);

  const save = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isComplete) return;

    updateOwnEmail(
      { email: email.trim(), current_password: currentPassword },
      {
        onSuccess: () => {
          toast.success('Correo de acceso actualizado');
          setCurrentPassword('');
          onOpenChange(false);
        },
        onError: (error: Error & { status?: number }) => {
          if (error.status === 409) {
            toast.error('Ese correo ya pertenece a otra cuenta');
            return;
          }
          if (error.status === 400) {
            toast.error('La contraseña actual no es correcta');
            return;
          }
          toast.error('No se pudo actualizar el correo de acceso');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Cambiar correo de acceso</DialogTitle>
          <DialogDescription>
            Es el correo con el que entras en la aplicación. A partir de ahora
            entrarás con el nuevo.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={save}>
          <div className="space-y-2">
            <Label htmlFor="own_email">Correo de acceso</Label>
            <Input
              id="own_email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_password">Contraseña actual</Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Tu contraseña de siempre"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !isComplete}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
