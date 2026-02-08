import { PriceConfigurationProvider } from '@/features/price-configurations/hooks/usePriceConfigurationContext';
import { PriceConfigurationList } from '@/features/price-configurations/components/PriceConfigurationList';

export const PriceConfigurationsPage = () => {
  return (
    <PriceConfigurationProvider>
      <PriceConfigurationList />
    </PriceConfigurationProvider>
  );
};
