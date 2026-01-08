import { useMutation, useQueryClient } from '@tanstack/react-query';
import { insuranceService } from '../../data/services/insurance.service';
import type { UpdateInsuranceRequest } from '../../data/schemas/insurance.schema';
import { toast } from 'sonner';

export const useCreateInsuranceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insuranceService.createInsurance,
    onSuccess: () => {
      toast.success('Seguro creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['insurance'] });
    },
    onError: () => {
      toast.error('Error al crear el seguro');
    },
  });
};

export const useUpdateInsuranceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInsuranceRequest }) =>
      insuranceService.updateInsurance(id, data),
    onSuccess: () => {
      toast.success('Seguro actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['insurance'] });
    },
    onError: () => {
      toast.error('Error al actualizar el seguro');
    },
  });
};

export const useDeleteInsuranceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: insuranceService.deleteInsurance,
    onSuccess: () => {
      toast.success('Seguro eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['insurance'] });
    },
    onError: () => {
      toast.error('Error al eliminar el seguro');
    },
  });
};
