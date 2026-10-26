import { LicenseProvider } from '@/features/licenses/hooks/useLicenseContext';
import { LicenseList } from '@/features/licenses/components/LicenseList';

export const LicensesPage = () => {
  return (
    <LicenseProvider>
      <LicenseList />
    </LicenseProvider>
  );
};
