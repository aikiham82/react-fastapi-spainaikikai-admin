import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generatePasswordResetLink } from '../../data/services/user.service';

export const useGeneratePasswordResetLinkMutation = () => {
  return useMutation({
    mutationFn: generatePasswordResetLink,
    onSuccess: () => {
      toast.success('Enlace generado. Caduca en 24 horas');
    },
    onError: (error: Error & { detail?: string }) => {
      toast.error(error.detail || 'No se pudo generar el enlace de acceso');
    },
  });
};
