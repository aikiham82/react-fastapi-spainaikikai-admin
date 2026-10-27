import { ClubProvider } from '@/features/clubs/hooks/useClubContext';
import { ClubList } from '@/features/clubs/components/ClubList';
import { ClubAccountsSection } from '@/features/clubs/components/ClubAccountsSection';
import { MyClub } from '@/features/clubs/components/MyClub';
import { usePermissions } from '@/core/hooks/usePermissions';

export const ClubsPage = () => {
  const { isClubAdmin } = usePermissions();

  return (
    <ClubProvider>
      {isClubAdmin() ? (
        <MyClub />
      ) : (
        <>
          <ClubAccountsSection />
          <ClubList />
        </>
      )}
    </ClubProvider>
  );
};
