import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { transferClubAccount } from '../../data/services/user.service';
import { errorMessage } from '../../data/errorMessage';

interface TransferClubAccountInput {
  clubId: string;
  memberId: string;
  memberName: string;
}

export const useTransferClubAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clubId, memberId }: TransferClubAccountInput) => transferClubAccount(clubId, memberId),
    onSuccess: (_, { memberId, memberName }) => {
      queryClient.invalidateQueries({ queryKey: ['user-by-member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['club-accounts'] });
      toast.success(`Cuenta del club pasada a ${memberName}`);
    },
    onError: (error: Error & { detail?: unknown; status?: number }) => {
      toast.error(errorMessage(error, 'No se pudo pasar la cuenta del club'));
    },
  });
};
