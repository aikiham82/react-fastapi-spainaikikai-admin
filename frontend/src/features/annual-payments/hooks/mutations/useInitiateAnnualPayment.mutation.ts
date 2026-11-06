import { submitRedsysForm } from '@/core/utils/redsys';
import { useMutation } from '@tanstack/react-query';
import { annualPaymentService } from '../../data/services/annual-payment.service';
import type { InitiateAnnualPaymentResponse } from '../../data/schemas/annual-payment.schema';
import { toast } from 'sonner';
import type { ApiError } from '@/core/data/apiClient';

export const useInitiateAnnualPaymentMutation = () => {
  return useMutation({
    mutationFn: annualPaymentService.initiateAnnualPayment,
    onSuccess: (response: InitiateAnnualPaymentResponse) => {
      toast.success('Pago iniciado correctamente. Redirigiendo a pasarela de pago...');
      submitRedsysForm(response);
    },
    onError: (error: ApiError) => {
      const message = error.detail || 'Error al iniciar el pago';
      toast.error(message);
    },
  });
};
