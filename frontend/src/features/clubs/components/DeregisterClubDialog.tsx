import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeregisterClubDialogProps {
  clubName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeregisterClubDialog = ({ clubName, open, onOpenChange, onConfirm }: DeregisterClubDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
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
          onClick={onConfirm}
        >
          Sí, dar de baja
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
