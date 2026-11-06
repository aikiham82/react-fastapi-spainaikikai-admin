import { useQuery } from '@tanstack/react-query';
import { paymentAdminService } from '../../data/services/payment-admin.service';
import type { ExamPrice } from '../../data/schemas/exam-payment.schema';
import { PRICE_CONFIGURATIONS_QUERY_KEY } from '@/features/price-configurations/hooks/queries/usePriceConfigurationQueries';

export const useExamPricesQuery = (enabled = true) =>
  useQuery<ExamPrice[]>({
    queryKey: [PRICE_CONFIGURATIONS_QUERY_KEY, 'exam'],
    queryFn: paymentAdminService.getExamPrices,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
