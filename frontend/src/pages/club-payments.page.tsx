import { ClubPaymentsProvider } from '@/features/club-payments/hooks/useClubPaymentsContext';
import { ClubPaymentsPage } from '@/features/club-payments/components/ClubPaymentsPage';

export const ClubPaymentsPageRoute = () => {
  return (
    <ClubPaymentsProvider>
      <ClubPaymentsPage />
    </ClubPaymentsProvider>
  );
};
