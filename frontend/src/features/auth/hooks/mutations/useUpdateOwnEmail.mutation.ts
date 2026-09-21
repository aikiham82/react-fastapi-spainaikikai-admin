import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appStorage } from '@/core/data/appStorage';
import { authService } from '../../data/auth.service';
import type { AuthResponse, UpdateOwnEmailRequest } from '../../data/auth.schema';

export const useUpdateOwnEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOwnEmailRequest) => authService.updateOwnEmail(data),
    onSuccess: (response: AuthResponse) => {
      // The JWT subject is the email, so the old token stops resolving to
      // this account the moment the address changes.
      appStorage().local.setString('access_token', response.access_token);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
};
