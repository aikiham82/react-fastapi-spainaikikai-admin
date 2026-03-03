import { useQuery } from '@tanstack/react-query';
import { memberPaymentService } from '../../data/services/member-payment.service';

export const memberPaymentKeys = {
  all: ['member-payments'] as const,
  status: (memberId: string, year?: number) =>
    [...memberPaymentKeys.all, 'status', memberId, year] as const,
  history: (memberId: string) =>
    [...memberPaymentKeys.all, 'history', memberId] as const,
  clubSummary: (clubId: string, year?: number) =>
    [...memberPaymentKeys.all, 'club-summary', clubId, year] as const,
  unpaid: (clubId: string, year?: number, type?: string) =>
    [...memberPaymentKeys.all, 'unpaid', clubId, year, type] as const,
};

export const useMemberPaymentStatusQuery = (
  memberId: string,
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: memberPaymentKeys.status(memberId, paymentYear),
    queryFn: () => memberPaymentService.getMemberPaymentStatus(memberId, paymentYear),
    enabled: enabled && !!memberId,
  });
};

export const useMemberPaymentHistoryQuery = (
  memberId: string,
  limit: number = 0,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: memberPaymentKeys.history(memberId),
    queryFn: () => memberPaymentService.getMemberPaymentHistory(memberId, limit),
    enabled: enabled && !!memberId,
  });
};

export const useClubPaymentSummaryQuery = (
  clubId: string,
  paymentYear?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: memberPaymentKeys.clubSummary(clubId, paymentYear),
    queryFn: () => memberPaymentService.getClubPaymentSummary(clubId, paymentYear),
    enabled: enabled && !!clubId,
  });
};

export const useUnpaidMembersQuery = (
  clubId: string,
  paymentYear?: number,
  paymentType?: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: memberPaymentKeys.unpaid(clubId, paymentYear, paymentType),
    queryFn: () => memberPaymentService.getUnpaidMembers(clubId, paymentYear, paymentType),
    enabled: enabled && !!clubId,
  });
};
