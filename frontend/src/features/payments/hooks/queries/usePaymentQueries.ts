import { useQuery } from '@tanstack/react-query';
import { paymentService } from '../../data/services/payment.service';
import type { PaymentFilters } from '../../data/schemas/payment.schema';

export const usePaymentsQuery = (filters?: PaymentFilters) => {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentService.getPayments(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const usePaymentQuery = (id: string) => {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentService.getPayment(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
