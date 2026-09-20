import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateUserEmail } from '../../data/services/user.service';
import { errorMessage } from '../../data/errorMessage';

export const useUpdateUserEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, email }: { userId: string; email: string }) =>
      updateUserEmail(userId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-by-member'] });
      toast.success('Correo de acceso actualizado');
    },
    onError: (error: Error & { detail?: unknown; status?: number }) => {
      const message = error.status === 409
        ? 'Ese correo ya pertenece a otra cuenta'
        : errorMessage(error, 'No se pudo actualizar el correo de acceso');
      toast.error(message);
    },
  });
};
