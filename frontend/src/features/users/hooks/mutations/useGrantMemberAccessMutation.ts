import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { grantMemberAccess } from '../../data/services/user.service';
import { errorMessage } from '../../data/errorMessage';

interface GrantMemberAccessInput {
  memberId: string;
  email: string;
  clubAdmin: boolean;
}

export const useGrantMemberAccessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, email, clubAdmin }: GrantMemberAccessInput) =>
      grantMemberAccess(memberId, email, clubAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] });
      // Marked stale without refetching: a refetch now would swap the success
      // message and its copyable link for the account view. Every member is
      // marked because the account may have been handed over from another one.
      queryClient.invalidateQueries({ queryKey: ['user-by-member'], refetchType: 'none' });
    },
    onError: (error: Error & { detail?: unknown; status?: number }) => {
      toast.error(errorMessage(error, 'No se pudo dar acceso a la web'));
    },
  });
};
