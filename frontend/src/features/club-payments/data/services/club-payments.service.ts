import { apiClient } from '@/core/data/apiClient';
import type { AllClubsPaymentSummaryResponse } from '../schemas/club-payments.schema';
import type { ClubPaymentSummaryResponse } from '@/features/member-payments/data/schemas/member-payment.schema';

const MEMBER_PAYMENTS_URL = '/api/v1/member-payments';

export const getAllClubsPaymentSummary = async (
  paymentYear?: number
): Promise<AllClubsPaymentSummaryResponse> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<AllClubsPaymentSummaryResponse>(
    `${MEMBER_PAYMENTS_URL}/all-clubs/summary`,
    { params }
  );
};

export const getClubPaymentSummary = async (
  clubId: string,
  paymentYear?: number
): Promise<ClubPaymentSummaryResponse> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<ClubPaymentSummaryResponse>(
    `${MEMBER_PAYMENTS_URL}/club/${clubId}/summary`,
    { params }
  );
};

export const clubPaymentsService = {
  getAllClubsPaymentSummary,
  getClubPaymentSummary,
};
