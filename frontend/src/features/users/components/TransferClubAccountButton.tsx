import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTransferClubAccountMutation } from '../hooks/mutations/useTransferClubAccountMutation';

interface TransferClubAccountButtonProps {
  clubId: string;
  accountId: string;
  memberId: string;
  memberName: string;
  label?: string;
}

export const TransferClubAccountButton = ({
  clubId,
  accountId,
  memberId,
  memberName,
  label = 'Pasar la cuenta del club a esta persona',
}: TransferClubAccountButtonProps) => {
  const { mutate: transfer, isPending } = useTransferClubAccountMutation();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="h-auto min-h-9 whitespace-normal" disabled={isPending}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pasar la cuenta del club</AlertDialogTitle>
          <AlertDialogDescription>
            La cuenta del club pasará a ser de {memberName}. Seguirá entrando con el mismo correo y contraseña y será
            administrador del club.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => transfer({ clubId, accountId, memberId, memberName })}>
            Sí, pasar la cuenta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
