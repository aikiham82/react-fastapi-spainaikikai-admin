import { useQuery } from '@tanstack/react-query';
import { priceConfigurationService } from '../../data/services/price-configuration.service';
import type { LicensePriceQuery } from '../../data/schemas/price-configuration.schema';

export const PRICE_CONFIGURATIONS_QUERY_KEY = 'price-configurations';

export const usePriceConfigurationsQuery = (activeOnly: boolean = false) => {
  return useQuery({
    queryKey: [PRICE_CONFIGURATIONS_QUERY_KEY, { activeOnly }],
    queryFn: () => priceConfigurationService.getPriceConfigurations(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePriceConfigurationQuery = (id: string) => {
  return useQuery({
    queryKey: [PRICE_CONFIGURATIONS_QUERY_KEY, id],
    queryFn: () => priceConfigurationService.getPriceConfiguration(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLicensePriceQuery = (query: LicensePriceQuery | null) => {
  return useQuery({
    queryKey: [PRICE_CONFIGURATIONS_QUERY_KEY, 'license-price', query],
    queryFn: () => priceConfigurationService.getLicensePrice(query!),
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
  });
};
