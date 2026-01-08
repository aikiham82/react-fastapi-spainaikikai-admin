import { useMutation, useQueryClient } from '@tanstack/react-query';
import { seminarService } from '../../data/services/seminar.service';
import { toast } from 'sonner';

export const useCreateSeminarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seminarService.createSeminar,
    onSuccess: () => {
      toast.success('Seminario creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
    },
    onError: () => {
      toast.error('Error al crear el seminario');
    },
  });
};

export const useUpdateSeminarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      seminarService.updateSeminar(id, data),
    onSuccess: () => {
      toast.success('Seminario actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
    },
    onError: () => {
      toast.error('Error al actualizar el seminario');
    },
  });
};

export const useDeleteSeminarMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seminarService.deleteSeminar,
    onSuccess: () => {
      toast.success('Seminario eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
    },
    onError: () => {
      toast.error('Error al eliminar el seminario');
    },
  });
};

export const useRegisterMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: seminarService.registerMember,
    onSuccess: () => {
      toast.success('Miembro inscrito exitosamente');
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
    },
    onError: () => {
      toast.error('Error al inscribir el miembro');
    },
  });
};
