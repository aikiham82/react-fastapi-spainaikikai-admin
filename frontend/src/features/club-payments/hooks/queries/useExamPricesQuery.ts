import { useQuery } from '@tanstack/react-query';
import { paymentAdminService } from '../../data/services/payment-admin.service';
import type { ExamPrice } from '../../data/schemas/exam-payment.schema';

export const useExamPricesQuery = (enabled = true) =>
  useQuery<ExamPrice[]>({
    queryKey: ['exam-prices'],
    queryFn: paymentAdminService.getExamPrices,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
