import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clubService } from '../../data/services/club.service';
import type { UpdateClubRequest } from '../../data/schemas/club.schema';
import { toast } from 'sonner';

export const useCreateClubMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clubService.createClub,
    onSuccess: () => {
      toast.success('Club creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: () => {
      toast.error('Error al crear el club');
    },
  });
};

export const useUpdateClubMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClubRequest }) =>
      clubService.updateClub(id, data),
    onSuccess: () => {
      toast.success('Club actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: () => {
      toast.error('Error al actualizar el club');
    },
  });
};

export const useDeleteClubMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clubService.deleteClub,
    onSuccess: () => {
      toast.success('Club eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: () => {
      toast.error('Error al eliminar el club');
    },
  });
};
