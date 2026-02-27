import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberService } from '../../data/services/member.service';
import type { UpdateMemberRequest, ChangeMemberStatusRequest } from '../../data/schemas/member.schema';
import type { ApiError } from '@/core/data/apiClient';
import { toast } from 'sonner';

export const useCreateMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: memberService.createMember,
    onSuccess: () => {
      toast.success('Miembro creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error: ApiError) => {
      toast.error(error.detail || 'Error al crear el miembro');
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
    onError: (error: ApiError) => {
      toast.error(error.detail || 'Error al actualizar el miembro');
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
    onError: (error: ApiError) => {
      toast.error(error.detail || 'Error al eliminar el miembro');
    },
  });
};

export const useChangeMemberStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangeMemberStatusRequest }) =>
      memberService.changeMemberStatus(id, data),
    onSuccess: (_data, variables) => {
      const message = variables.data.status === 'inactive'
        ? 'Miembro dado de baja exitosamente'
        : 'Miembro reactivado exitosamente';
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (_error, variables) => {
      const message = variables.data.status === 'inactive'
        ? 'Error al dar de baja al miembro'
        : 'Error al reactivar al miembro';
      toast.error(message);
    },
  });
};
