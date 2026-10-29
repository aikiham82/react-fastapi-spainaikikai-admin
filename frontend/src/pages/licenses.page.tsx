import { LicenseProvider } from '@/features/licenses/hooks/useLicenseContext';
import { LicenseList } from '@/features/licenses/components/LicenseList';
import { ClubProvider } from '@/features/clubs/hooks/useClubContext';

export const LicensesPage = () => {
  return (
    <ClubProvider>
      <LicenseProvider>
        <LicenseList />
      </LicenseProvider>
    </ClubProvider>
  );
};
