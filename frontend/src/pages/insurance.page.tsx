import { InsuranceProvider } from '@/features/insurance/hooks/useInsuranceContext';
import { InsuranceList } from '@/features/insurance/components/InsuranceList';

export const InsurancePage = () => {
  return (
    <InsuranceProvider>
      <InsuranceList />
    </InsuranceProvider>
  );
};
