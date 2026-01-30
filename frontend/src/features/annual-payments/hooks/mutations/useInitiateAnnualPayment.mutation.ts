import { useMutation } from '@tanstack/react-query';
import { annualPaymentService } from '../../data/services/annual-payment.service';
import type { InitiateAnnualPaymentResponse } from '../../data/schemas/annual-payment.schema';
import { toast } from 'sonner';

export const useInitiateAnnualPaymentMutation = () => {
  return useMutation({
    mutationFn: annualPaymentService.initiateAnnualPayment,
    onSuccess: (response: InitiateAnnualPaymentResponse) => {
      toast.success('Pago iniciado correctamente. Redirigiendo a pasarela de pago...');

      // Create and submit Redsys form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.payment_url;

      const addField = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      addField('Ds_SignatureVersion', response.ds_signature_version);
      addField('Ds_MerchantParameters', response.ds_merchant_parameters);
      addField('Ds_Signature', response.ds_signature);

      document.body.appendChild(form);
      form.submit();
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      const message = error.response?.data?.detail || 'Error al iniciar el pago';
      toast.error(message);
    },
  });
};
