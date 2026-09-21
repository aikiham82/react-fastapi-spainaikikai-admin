import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generatePasswordResetLink } from '../../data/services/user.service';
import { errorMessage } from '../../data/errorMessage';

export const useGeneratePasswordResetLinkMutation = () => {
  return useMutation({
    mutationFn: generatePasswordResetLink,
    onSuccess: () => {
      toast.success('Enlace generado. Caduca en 24 horas');
    },
    onError: (error: Error & { detail?: unknown }) => {
      toast.error(errorMessage(error, 'No se pudo generar el enlace de acceso'));
    },
  });
};
