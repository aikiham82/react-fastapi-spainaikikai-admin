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
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      // Marked stale without refetching: a refetch now would swap the success
      // message and its copyable link for the account view.
      queryClient.invalidateQueries({ queryKey: ['user-by-member', memberId], refetchType: 'none' });
    },
    onError: (error: Error & { detail?: unknown; status?: number }) => {
      toast.error(errorMessage(error, 'No se pudo dar acceso a la web'));
    },
  });
};
