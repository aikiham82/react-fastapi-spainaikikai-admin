import { apiClient } from '@/core/data/apiClient';
import type {
  PriceConfiguration,
  CreatePriceConfigurationRequest,
  UpdatePriceConfigurationRequest,
  LicensePriceQuery,
  LicensePriceResponse,
} from '../schemas/price-configuration.schema';

const BASE_URL = '/api/v1/price-configurations';

export const getPriceConfigurations = async (activeOnly: boolean = false): Promise<PriceConfiguration[]> => {
  return await apiClient.get<PriceConfiguration[]>(BASE_URL, {
    params: { active_only: activeOnly },
  });
};

export const getPriceConfiguration = async (id: string): Promise<PriceConfiguration> => {
  return await apiClient.get<PriceConfiguration>(`${BASE_URL}/${id}`);
};

export const getLicensePrice = async (query: LicensePriceQuery): Promise<LicensePriceResponse> => {
  return await apiClient.get<LicensePriceResponse>(`${BASE_URL}/license-price`, {
    params: query,
  });
};

export const createPriceConfiguration = async (data: CreatePriceConfigurationRequest): Promise<PriceConfiguration> => {
  return await apiClient.post<PriceConfiguration>(BASE_URL, data);
};

export const updatePriceConfiguration = async (
  id: string,
  data: UpdatePriceConfigurationRequest
): Promise<PriceConfiguration> => {
  return await apiClient.put<PriceConfiguration>(`${BASE_URL}/${id}`, data);
};

export const deletePriceConfiguration = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const priceConfigurationService = {
  getPriceConfigurations,
  getPriceConfiguration,
  getLicensePrice,
  createPriceConfiguration,
  updatePriceConfiguration,
  deletePriceConfiguration,
};
