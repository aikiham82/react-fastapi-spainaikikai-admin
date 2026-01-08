import { apiClient } from '@/core/data/apiClient';
import type { Insurance, CreateInsuranceRequest, UpdateInsuranceRequest, InsuranceFilters, InsuranceListResponse } from './insurance.schema';

const BASE_URL = '/api/v1/insurance';

export const getInsurance = async (filters?: InsuranceFilters): Promise<InsuranceListResponse> => {
  return await apiClient.get<InsuranceListResponse>(BASE_URL, { params: filters });
};

export const getInsurancePolicy = async (id: string): Promise<Insurance> => {
  return await apiClient.get<Insurance>(`${BASE_URL}/${id}`);
};

export const createInsurance = async (data: CreateInsuranceRequest): Promise<Insurance> => {
  return await apiClient.post<Insurance>(BASE_URL, data);
};

export const updateInsurance = async (id: string, data: UpdateInsuranceRequest): Promise<Insurance> => {
  return await apiClient.put<Insurance>(`${BASE_URL}/${id}`, data);
};

export const deleteInsurance = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const insuranceService = {
  getInsurance,
  getInsurancePolicy,
  createInsurance,
  updateInsurance,
  deleteInsurance,
};
