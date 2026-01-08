import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService } from '../../data/services/member.service';
import type { UpdateMemberRequest } from '../../data/schemas/member.schema';
import { toast } from 'sonner';

export const useCreateMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memberService.createMember,
    onSuccess: () => {
      toast.success('Miembro creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      toast.error('Error al crear el miembro');
    },
  });
};

export const useUpdateMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMemberRequest }) =>
      memberService.updateMember(id, data),
    onSuccess: () => {
      toast.success('Miembro actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      toast.error('Error al actualizar el miembro');
    },
  });
};

export const useDeleteMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memberService.deleteMember,
    onSuccess: () => {
      toast.success('Miembro eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      toast.error('Error al eliminar el miembro');
    },
  });
};
