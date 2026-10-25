import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { grantMemberAccess } from '../../data/services/user.service';
import { errorMessage } from '../../data/errorMessage';

interface GrantMemberAccessInput {
  memberId: string;
  email: string;
  clubAdmin: boolean;
}

export const useGrantMemberAccessMutation = () =>
  useMutation({
    mutationFn: ({ memberId, email, clubAdmin }: GrantMemberAccessInput) =>
      grantMemberAccess(memberId, email, clubAdmin),
    onError: (error: Error & { detail?: unknown; status?: number }) => {
      toast.error(errorMessage(error, 'No se pudo dar acceso a la web'));
    },
  });
