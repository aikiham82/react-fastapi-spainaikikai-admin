import { MemberProvider } from '@/features/members/hooks/useMemberContext';
import { MemberList } from '@/features/members/components/MemberList';
import { ClubProvider } from '@/features/clubs/hooks/useClubContext';

export const MembersPage = () => {
  return (
    <ClubProvider>
      <MemberProvider>
        <MemberList />
      </MemberProvider>
    </ClubProvider>
  );
};
