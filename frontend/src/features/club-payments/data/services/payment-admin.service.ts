import { apiClient } from '@/core/data/apiClient';
import type { Payment } from '../schemas/payment-admin.schema';
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema';

const PAYMENTS_URL = '/api/v1/payments';
const MEMBER_PAYMENTS_URL = '/api/v1/member-payments';

// POST /api/v1/payments/manual
export const registerManualPayment = async (
  data: {
    payer_name: string;
    club_id: string;
    payment_year: number;
    payment_method: string;
    member_assignments: { member_id: string; member_name: string; payment_types: string[] }[];
    include_club_fee: boolean;
  }
): Promise<Payment> => {
  return await apiClient.post<Payment>(`${PAYMENTS_URL}/manual`, data);
};

// PUT /api/v1/payments/{id}
export const updatePayment = async (
  id: string,
  data: Partial<{
    amount: number;
    payment_year: number;
    payment_method: string;
    payer_name: string;
    status: string;
  }>
): Promise<Payment> => {
  return await apiClient.put<Payment>(`${PAYMENTS_URL}/${id}`, data);
};

// DELETE /api/v1/payments/{id}?force=true  (only sent when force is true)
export const deletePayment = async (id: string, force = false): Promise<void> => {
  return await apiClient.delete<void>(`${PAYMENTS_URL}/${id}`, {
    params: force ? { force: true } : undefined,
  });
};

// GET /api/v1/member-payments/club/{club_id}  (with optional payment_year)
export const getClubMemberPayments = async (
  clubId: string,
  paymentYear?: number
): Promise<MemberPayment[]> => {
  const params = paymentYear ? { payment_year: paymentYear } : undefined;
  return await apiClient.get<MemberPayment[]>(
    `${MEMBER_PAYMENTS_URL}/club/${clubId}`,
    { params }
  );
};

// PUT /api/v1/member-payments/{id}
export const updateMemberPayment = async (
  id: string,
  data: Partial<{
    payment_type: string;
    concept: string;
    amount: number;
    status: string;
  }>
): Promise<MemberPayment> => {
  return await apiClient.put<MemberPayment>(`${MEMBER_PAYMENTS_URL}/${id}`, data);
};

// DELETE /api/v1/member-payments/{id}
export const deleteMemberPayment = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${MEMBER_PAYMENTS_URL}/${id}`);
};

export const paymentAdminService = {
  registerManualPayment,
  updatePayment,
  deletePayment,
  getClubMemberPayments,
  updateMemberPayment,
  deleteMemberPayment,
};
