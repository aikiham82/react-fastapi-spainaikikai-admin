import { useQuery } from '@tanstack/react-query';
import { clubPaymentsService } from '../../data/services/club-payments.service';
import { paymentAdminService } from '../../data/services/payment-admin.service';
import { CONFIRMABLE_PAYMENT_TYPES, UNFINISHED_PAYMENT_STATUSES } from '../../data/schemas/payment-admin.schema';

export const clubPaymentsKeys = {
  all: ['club-payments'] as const,
  allClubsSummary: (year?: number) =>
    [...clubPaymentsKeys.all, 'all-clubs-summary', year] as const,
  clubDetail: (clubId: string, year?: number) =>
    [...clubPaymentsKeys.all, 'club-detail', clubId, year] as const,
  clubMemberPayments: (clubId: string, year?: number) =>
    [...clubPaymentsKeys.all, 'club-member-payments', clubId, year] as const,
  clubUnfinishedPayments: (clubId: string, year: number) =>
    [...clubPaymentsKeys.all, 'club-unfinished-payments', clubId, year] as const,
};

export const useAllClubsPaymentSummaryQuery = (
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: clubPaymentsKeys.allClubsSummary(paymentYear),
    queryFn: () => clubPaymentsService.getAllClubsPaymentSummary(paymentYear),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

export const useClubPaymentDetailQuery = (
  clubId: string,
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: clubPaymentsKeys.clubDetail(clubId, paymentYear),
    queryFn: () => clubPaymentsService.getClubPaymentSummary(clubId, paymentYear),
    enabled: enabled && !!clubId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useClubMemberPaymentsQuery = (
  clubId: string,
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: clubPaymentsKeys.clubMemberPayments(clubId, paymentYear),
    queryFn: () => paymentAdminService.getClubMemberPayments(clubId, paymentYear),
    enabled: enabled && !!clubId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useClubUnfinishedPaymentsQuery = (clubId: string, paymentYear: number) => {
  return useQuery({
    queryKey: clubPaymentsKeys.clubUnfinishedPayments(clubId, paymentYear),
    queryFn: () => paymentAdminService.getClubPayments(clubId, paymentYear),
    select: (payments) =>
      payments
        .filter(
          (payment) =>
            UNFINISHED_PAYMENT_STATUSES.includes(payment.status) && CONFIRMABLE_PAYMENT_TYPES.includes(payment.payment_type),
        )
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    enabled: !!clubId,
    staleTime: 2 * 60 * 1000,
  });
};
