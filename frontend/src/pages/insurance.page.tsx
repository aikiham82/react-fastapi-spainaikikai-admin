import { InsuranceProvider } from './features/insurance/hooks/useInsuranceContext';
import { InsuranceList } from './features/insurance/components/InsuranceList';

export const InsurancePage = () => {
  return (
    <InsuranceProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguros</h1>
          <p className="text-gray-600 mt-1">Gestiona los seguros de la asociación</p>
        </div>
        <InsuranceList />
      </div>
    </InsuranceProvider>
  );
};
