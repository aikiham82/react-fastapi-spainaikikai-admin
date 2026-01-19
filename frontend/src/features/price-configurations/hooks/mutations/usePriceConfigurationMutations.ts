import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { priceConfigurationService } from '../../data/services/price-configuration.service';
import { PRICE_CONFIGURATIONS_QUERY_KEY } from '../queries/usePriceConfigurationQueries';
import type {
  CreatePriceConfigurationRequest,
  UpdatePriceConfigurationRequest,
} from '../../data/schemas/price-configuration.schema';

export const useCreatePriceConfigurationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePriceConfigurationRequest) =>
      priceConfigurationService.createPriceConfiguration(data),
    onSuccess: () => {
      toast.success('Precio creado correctamente');
      queryClient.invalidateQueries({ queryKey: [PRICE_CONFIGURATIONS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Error al crear precio: ${error.message}`);
    },
  });
};

export const useUpdatePriceConfigurationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePriceConfigurationRequest }) =>
      priceConfigurationService.updatePriceConfiguration(id, data),
    onSuccess: () => {
      toast.success('Precio actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: [PRICE_CONFIGURATIONS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar precio: ${error.message}`);
    },
  });
};

export const useDeletePriceConfigurationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => priceConfigurationService.deletePriceConfiguration(id),
    onSuccess: () => {
      toast.success('Precio eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: [PRICE_CONFIGURATIONS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar precio: ${error.message}`);
    },
  });
};
