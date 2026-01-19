import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '../../data/services/invoice.service';
import type { InvoiceFilters } from '../../data/schemas/invoice.schema';

export const INVOICES_QUERY_KEY = 'invoices';

export const useInvoicesQuery = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: [INVOICES_QUERY_KEY, filters],
    queryFn: () => invoiceService.getInvoices(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useInvoiceQuery = (id: string) => {
  return useQuery({
    queryKey: [INVOICES_QUERY_KEY, id],
    queryFn: () => invoiceService.getInvoice(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMemberInvoicesQuery = (memberId: string, limit?: number) => {
  return useQuery({
    queryKey: [INVOICES_QUERY_KEY, 'member', memberId, { limit }],
    queryFn: () => invoiceService.getMemberInvoices(memberId, limit),
    enabled: !!memberId,
    staleTime: 2 * 60 * 1000,
  });
};
