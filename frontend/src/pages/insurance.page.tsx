import { InsuranceProvider } from '@/features/insurance/hooks/useInsuranceContext';
import { InsuranceList } from '@/features/insurance/components/InsuranceList';
import { ClubProvider } from '@/features/clubs/hooks/useClubContext';

export const InsurancePage = () => {
  return (
    <ClubProvider>
      <InsuranceProvider>
        <InsuranceList />
      </InsuranceProvider>
    </ClubProvider>
  );
};
