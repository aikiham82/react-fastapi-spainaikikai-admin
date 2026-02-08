import { ClubProvider } from '@/features/clubs/hooks/useClubContext';
import { ClubList } from '@/features/clubs/components/ClubList';

export const ClubsPage = () => {
  return (
    <ClubProvider>
      <ClubList />
    </ClubProvider>
  );
};
