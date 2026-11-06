import { submitRedsysForm } from '@/core/utils/redsys';
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
      submitRedsysForm(response);
    },
    // No onError handler — errors propagated to component via mutation.error
  });
};
