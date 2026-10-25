import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { revokeMemberAccess } from '../../data/services/user.service';
import { errorMessage } from '../../data/errorMessage';

export const useRevokeMemberAccessMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => revokeMemberAccess(memberId),
    onSuccess: (_, memberId) => {
      queryClient.invalidateQueries({ queryKey: ['user-by-member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Acceso quitado');
    },
    onError: (error: Error & { detail?: unknown; status?: number }) => {
      toast.error(errorMessage(error, 'No se pudo quitar el acceso'));
    },
  });
};
