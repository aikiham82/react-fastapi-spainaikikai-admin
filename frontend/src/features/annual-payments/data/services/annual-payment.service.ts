import { apiClient } from '@/core/data/apiClient';
import type {
  InitiateAnnualPaymentRequest,
  InitiateAnnualPaymentResponse,
} from '../schemas/annual-payment.schema';

const BASE_URL = '/api/v1/payments';

export const initiateAnnualPayment = async (
  data: InitiateAnnualPaymentRequest
): Promise<InitiateAnnualPaymentResponse> => {
  return await apiClient.post<InitiateAnnualPaymentResponse>(
    `${BASE_URL}/annual/initiate`,
    data
  );
};

export const annualPaymentService = {
  initiateAnnualPayment,
};
