import { ClubProvider } from '@/features/clubs/hooks/useClubContext';
import { ClubList } from '@/features/clubs/components/ClubList';
import { ClubAccountsSection } from '@/features/clubs/components/ClubAccountsSection';

export const ClubsPage = () => {
  return (
    <ClubProvider>
      <ClubAccountsSection />
      <ClubList />
    </ClubProvider>
  );
};
