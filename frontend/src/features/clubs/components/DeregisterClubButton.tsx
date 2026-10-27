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
import { useDeregisterClubMutation } from '../hooks/mutations/useClubMutations';

interface DeregisterClubButtonProps {
  clubId: string;
  clubName: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
}

export const DeregisterClubButton = ({
  clubId,
  clubName,
  label = 'Dar de baja el club',
  ariaLabel,
  className = 'h-auto min-h-9 w-full whitespace-normal sm:w-auto',
}: DeregisterClubButtonProps) => {
  const { mutate: deregister, isPending } = useDeregisterClubMutation();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className={className} disabled={isPending} aria-label={ariaLabel}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dar de baja el club</AlertDialogTitle>
          <AlertDialogDescription>
            {clubName} y todos sus socios pasarán a baja y nadie del club podrá entrar en la web ni en la app.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => deregister(clubId)}
          >
            Sí, dar de baja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
