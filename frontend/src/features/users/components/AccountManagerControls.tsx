import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ClubRole } from '@/features/auth/data/auth.schema';
import { useSetMemberClubRoleMutation } from '../hooks/mutations/useSetMemberClubRoleMutation';
import { useRevokeMemberAccessMutation } from '../hooks/mutations/useRevokeMemberAccessMutation';

interface AccountManagerControlsProps {
  memberId: string;
  memberName: string;
  clubRole?: ClubRole;
}

export const AccountManagerControls = ({ memberId, memberName, clubRole = 'member' }: AccountManagerControlsProps) => {
  const [managesClub, setManagesClub] = useState(clubRole === 'admin');
  const { mutate: setRole, isPending: isSavingRole } = useSetMemberClubRoleMutation();
  const { mutate: revoke, isPending: isRevoking } = useRevokeMemberAccessMutation();

  const changeRole = (checked: boolean) => {
    setManagesClub(checked);
    setRole(
      { memberId, clubRole: checked ? 'admin' : 'member' },
      { onError: () => setManagesClub(!checked) }
    );
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="manages_club" className="font-normal">
          Puede gestionar el club (pagos, altas y consultas)
        </Label>
        <Switch id="manages_club" checked={managesClub} disabled={isSavingRole} onCheckedChange={changeRole} />
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={isRevoking}>
            Quitar acceso
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar acceso</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Quitar el acceso a {memberName}? No podrá entrar en la web.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => revoke(memberId)}>Sí, quitar acceso</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
