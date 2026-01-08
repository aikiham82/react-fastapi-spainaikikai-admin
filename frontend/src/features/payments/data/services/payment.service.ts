import { apiClient } from '@/core/data/apiClient';
import type { Payment, CreatePaymentRequest, UpdatePaymentStatusRequest, PaymentFilters, PaymentsListResponse, CreatePaymentResponse } from './payment.schema';

const BASE_URL = '/api/v1/payments';

export const getPayments = async (filters?: PaymentFilters): Promise<PaymentsListResponse> => {
  return await apiClient.get<PaymentsListResponse>(BASE_URL, { params: filters });
};

export const getPayment = async (id: string): Promise<Payment> => {
  return await apiClient.get<Payment>(`${BASE_URL}/${id}`);
};

export const createPayment = async (data: CreatePaymentRequest): Promise<CreatePaymentResponse> => {
  return await apiClient.post<CreatePaymentResponse>(BASE_URL, data);
};

export const updatePaymentStatus = async (id: string, data: UpdatePaymentStatusRequest): Promise<Payment> => {
  return await apiClient.put<Payment>(`${BASE_URL}/${id}/status`, data);
};

export const deletePayment = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const paymentService = {
  getPayments,
  getPayment,
  createPayment,
  updatePaymentStatus,
  deletePayment,
};
