import { useQuery } from '@tanstack/react-query';
import { getAnnualPaymentPrices } from '../../data/services/annual-payment.service';
import { transformPricesResponse } from '../../data/schemas/annual-payment.schema';
import type { AnnualPaymentPrices } from '../../data/schemas/annual-payment.schema';

export const useAnnualPaymentPricesQuery = () => {
  return useQuery<AnnualPaymentPrices>({
    queryKey: ['annual-payment-prices'],
    queryFn: async () => {
      const response = await getAnnualPaymentPrices();
      return transformPricesResponse(response);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
