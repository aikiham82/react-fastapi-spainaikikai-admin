import { apiClient } from '@/core/data/apiClient';
import type { License, CreateLicenseRequest, UpdateLicenseRequest, LicenseFilters, LicensesListResponse } from './license.schema';

const BASE_URL = '/api/v1/licenses';

export const getLicenses = async (filters?: LicenseFilters): Promise<LicensesListResponse> => {
  return await apiClient.get<LicensesListResponse>(BASE_URL, { params: filters });
};

export const getLicense = async (id: string): Promise<License> => {
  return await apiClient.get<License>(`${BASE_URL}/${id}`);
};

export const createLicense = async (data: CreateLicenseRequest): Promise<License> => {
  return await apiClient.post<License>(BASE_URL, data);
};

export const updateLicense = async (id: string, data: UpdateLicenseRequest): Promise<License> => {
  return await apiClient.put<License>(`${BASE_URL}/${id}`, data);
};

export const deleteLicense = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const licenseService = {
  getLicenses,
  getLicense,
  createLicense,
  updateLicense,
  deleteLicense,
};
