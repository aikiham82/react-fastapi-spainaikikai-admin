import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../../data/services/payment.service';
import { toast } from 'sonner';

export const useCreatePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentService.createPayment,
    onSuccess: (response) => {
      toast.success('Pago iniciado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      if (response.redsys_url) {
        window.location.href = response.redsys_url;
      }
    },
    onError: () => {
      toast.error('Error al iniciar el pago');
    },
  });
};

export const useUpdatePaymentStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      paymentService.updatePaymentStatus(id, data),
    onSuccess: () => {
      toast.success('Estado del pago actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: () => {
      toast.error('Error al actualizar el estado del pago');
    },
  });
};

export const useDeletePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: paymentService.deletePayment,
    onSuccess: () => {
      toast.success('Pago eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: () => {
      toast.error('Error al eliminar el pago');
    },
  });
};
