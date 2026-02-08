import { useQuery } from '@tanstack/react-query';
import { getAnnualPaymentPrefill } from '../../data/services/annual-payment.service';
import type { PrefillAnnualPaymentResponse } from '../../data/schemas/annual-payment.schema';

export const useAnnualPaymentPrefillQuery = (
  clubId: string,
  paymentYear: number,
) => {
  return useQuery<PrefillAnnualPaymentResponse>({
    queryKey: ['annual-payment-prefill', clubId, paymentYear],
    queryFn: () => getAnnualPaymentPrefill(clubId, paymentYear),
    enabled: !!clubId && !!paymentYear,
    staleTime: 2 * 60 * 1000,
  });
};
