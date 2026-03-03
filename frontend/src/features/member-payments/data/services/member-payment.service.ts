import { apiClient } from '@/core/data/apiClient';
import type {
  MemberPaymentStatusResponse,
  MemberPaymentHistoryResponse,
  ClubPaymentSummaryResponse,
  UnpaidMembersResponse,
} from '../schemas/member-payment.schema';

const BASE_URL = '/api/v1/member-payments';

export const getMemberPaymentStatus = async (
  memberId: string,
  paymentYear?: number
): Promise<MemberPaymentStatusResponse> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<MemberPaymentStatusResponse>(
    `${BASE_URL}/member/${memberId}`,
    { params }
  );
};

export const getMemberPaymentHistory = async (
  memberId: string,
  limit: number = 0
): Promise<MemberPaymentHistoryResponse> => {
  return await apiClient.get<MemberPaymentHistoryResponse>(
    `${BASE_URL}/member/${memberId}/history`,
    { params: { limit } }
  );
};

export const getClubPaymentSummary = async (
  clubId: string,
  paymentYear?: number
): Promise<ClubPaymentSummaryResponse> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<ClubPaymentSummaryResponse>(
    `${BASE_URL}/club/${clubId}/summary`,
    { params }
  );
};

export const getUnpaidMembers = async (
  clubId: string,
  paymentYear?: number,
  paymentType?: string
): Promise<UnpaidMembersResponse> => {
  const params: Record<string, string | number | undefined> = {};
  if (paymentYear) params.payment_year = paymentYear;
  if (paymentType) params.payment_type = paymentType;

  return await apiClient.get<UnpaidMembersResponse>(
    `${BASE_URL}/club/${clubId}/unpaid`,
    { params }
  );
};

export const memberPaymentService = {
  getMemberPaymentStatus,
  getMemberPaymentHistory,
  getClubPaymentSummary,
  getUnpaidMembers,
};
