import { useMutation } from '@tanstack/react-query';
import { seminarService } from '../../data/services/seminar.service';
import type { InitiateOfficialidadResponse } from '../../data/services/seminar.service';

/**
 * Mutation to initiate seminar oficialidad payment via Redsys.
 *
 * IMPORTANT: This mutation does NOT show toasts on error.
 * Per CONTEXT decision, errors are displayed INSIDE the modal (role="alert"),
 * not via toast. The caller (SolicitudOficialidadModal) handles error display.
 *
 * On success, a hidden form is created and submitted to redirect the browser to Redsys.
 */
export const useInitiateSeminarOfficialidadMutation = () => {
  return useMutation({
    mutationFn: (seminarId: string) =>
      seminarService.initiateSeminarOficialidad(seminarId),
    onSuccess: (response: InitiateOfficialidadResponse) => {
      // Create and submit Redsys form (same pattern as annual payment)
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
    // No onError handler — errors propagated to component via mutation.error
  });
};
