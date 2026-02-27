import { useMutation, useQueryClient } from '@tanstack/react-query';
import { seminarService } from '../../data/services/seminar.service';
import type { UpdateSeminarRequest } from '../../data/schemas/seminar.schema';
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
    mutationFn: ({ id, data }: { id: string; data: UpdateSeminarRequest }) =>
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

export const useUploadCoverImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seminarId, file }: { seminarId: string; file: File }) =>
      seminarService.uploadCoverImage(seminarId, file),
    onSuccess: () => {
      toast.success('Imagen de portada actualizada');
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
    },
    onError: () => {
      toast.error('Error al subir la imagen');
    },
  });
};

export const useDeleteCoverImageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seminarId: string) => seminarService.deleteCoverImage(seminarId),
    onSuccess: () => {
      toast.success('Imagen de portada eliminada');
      queryClient.invalidateQueries({ queryKey: ['seminars'] });
    },
    onError: () => {
      toast.error('Error al eliminar la imagen');
    },
  });
};
