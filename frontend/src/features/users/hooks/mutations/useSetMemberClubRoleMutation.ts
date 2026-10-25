import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ClubRole } from '@/features/auth/data/auth.schema';
import { setMemberClubRole } from '../../data/services/user.service';
import { errorMessage } from '../../data/errorMessage';

export const useSetMemberClubRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, clubRole }: { memberId: string; clubRole: ClubRole }) =>
      setMemberClubRole(memberId, clubRole),
    onSuccess: (_, { clubRole }) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(clubRole === 'admin' ? 'Ahora puede gestionar el club' : 'Ya no gestiona el club');
    },
    onError: (error: Error & { detail?: unknown; status?: number }) => {
      toast.error(errorMessage(error, 'No se pudo cambiar quién gestiona el club'));
    },
  });
};
