import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateUserEmail } from '../../data/services/user.service';

export const useUpdateUserEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, email }: { userId: string; email: string }) =>
      updateUserEmail(userId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-by-member'] });
      toast.success('Correo de acceso actualizado');
    },
    onError: (error: Error & { detail?: string; status?: number }) => {
      const message = error.status === 409
        ? 'Ese correo ya pertenece a otra cuenta'
        : error.detail || 'No se pudo actualizar el correo de acceso';
      toast.error(message);
    },
  });
};
