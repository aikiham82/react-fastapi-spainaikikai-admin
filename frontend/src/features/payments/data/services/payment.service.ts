import { apiClient } from '@/core/data/apiClient';
import type {
  Payment,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  RefundPaymentRequest,
  PaymentFilters,
} from '../schemas/payment.schema';

const BASE_URL = '/api/v1/payments';

export const getPayments = async (filters?: PaymentFilters): Promise<Payment[]> => {
  const params = filters ? { ...filters } : {};
  return await apiClient.get<Payment[]>(BASE_URL, { params });
};

export const getPayment = async (id: string): Promise<Payment> => {
  return await apiClient.get<Payment>(`${BASE_URL}/${id}`);
};

export const getPaymentStatus = async (id: string): Promise<Payment> => {
  return await apiClient.get<Payment>(`${BASE_URL}/${id}/status`);
};

export const initiatePayment = async (data: InitiatePaymentRequest): Promise<InitiatePaymentResponse> => {
  return await apiClient.post<InitiatePaymentResponse>(`${BASE_URL}/initiate`, data);
};

export const refundPayment = async (id: string, data: RefundPaymentRequest): Promise<Payment> => {
  return await apiClient.put<Payment>(`${BASE_URL}/${id}/refund`, data);
};

export const deletePayment = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const paymentService = {
  getPayments,
  getPayment,
  getPaymentStatus,
  initiatePayment,
  refundPayment,
  deletePayment,
};
