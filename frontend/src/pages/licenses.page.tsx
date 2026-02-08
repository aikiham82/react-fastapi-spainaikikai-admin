import { LicenseProvider } from '@/features/licenses/hooks/useLicenseContext';
import { MemberProvider } from '@/features/members/hooks/useMemberContext';
import { LicenseList } from '@/features/licenses/components/LicenseList';

export const LicensesPage = () => {
  return (
    <MemberProvider>
      <LicenseProvider>
        <LicenseList />
      </LicenseProvider>
    </MemberProvider>
  );
};
