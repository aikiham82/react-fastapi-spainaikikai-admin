import { useMutation, useQueryClient } from '@tanstack/react-query';
import { licenseService } from '../../data/services/license.service';
import type { UpdateLicenseRequest } from '../../data/schemas/license.schema';
import { toast } from 'sonner';
import { updateToast } from '@/core/utils/updateToast';

export const useCreateLicenseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: licenseService.createLicense,
    onSuccess: () => {
      toast.success('Licencia creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      toast.error('Error al crear la licencia');
    },
  });
};

export const useUpdateLicenseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLicenseRequest }) =>
      licenseService.updateLicense(id, data),
    onSuccess: (_license, { data }) => {
      toast.success(updateToast(data, {
        updated: 'Licencia actualizada exitosamente',
        annulled: 'Licencia anulada',
        reactivated: 'Licencia reactivada',
      }));
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      toast.error('Error al actualizar la licencia');
    },
  });
};

export const useDeleteLicenseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: licenseService.deleteLicense,
    onSuccess: () => {
      toast.success('Licencia eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      toast.error('Error al eliminar la licencia');
    },
  });
};
