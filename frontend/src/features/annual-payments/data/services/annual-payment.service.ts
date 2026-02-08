import { apiClient } from '@/core/data/apiClient';
import type {
  InitiateAnnualPaymentRequest,
  InitiateAnnualPaymentResponse,
  AnnualPaymentPricesResponse,
  PrefillAnnualPaymentResponse,
} from '../schemas/annual-payment.schema';

const BASE_URL = '/api/v1/payments';
const PRICE_CONFIG_URL = '/api/v1/price-configurations';

export const initiateAnnualPayment = async (
  data: InitiateAnnualPaymentRequest
): Promise<InitiateAnnualPaymentResponse> => {
  return await apiClient.post<InitiateAnnualPaymentResponse>(
    `${BASE_URL}/annual/initiate`,
    data
  );
};

export const getAnnualPaymentPrices = async (): Promise<AnnualPaymentPricesResponse> => {
  return await apiClient.get<AnnualPaymentPricesResponse>(
    `${PRICE_CONFIG_URL}/annual-payment-prices`
  );
};

export const getAnnualPaymentPrefill = async (
  clubId: string,
  paymentYear: number,
): Promise<PrefillAnnualPaymentResponse> => {
  return await apiClient.get<PrefillAnnualPaymentResponse>(
    `${BASE_URL}/annual/prefill`,
    { params: { club_id: clubId, payment_year: paymentYear } }
  );
};

export const annualPaymentService = {
  initiateAnnualPayment,
  getAnnualPaymentPrices,
  getAnnualPaymentPrefill,
};
