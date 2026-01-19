import { PriceConfigurationProvider } from '@/features/price-configurations/hooks/usePriceConfigurationContext';
import { PriceConfigurationList } from '@/features/price-configurations/components/PriceConfigurationList';

export const PriceConfigurationsPage = () => {
  return (
    <PriceConfigurationProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuracion de Precios</h1>
          <p className="text-gray-600 mt-1">Gestiona los precios de las licencias federativas</p>
        </div>
        <PriceConfigurationList />
      </div>
    </PriceConfigurationProvider>
  );
};
