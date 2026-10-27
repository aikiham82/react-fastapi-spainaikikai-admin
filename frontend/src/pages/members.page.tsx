import { MemberProvider } from '@/features/members/hooks/useMemberContext';
import { MemberList } from '@/features/members/components/MemberList';
import { DEFAULT_MEMBER_STATUS } from '@/features/members/utils/member-defaults';
import { ClubProvider } from '@/features/clubs/hooks/useClubContext';

export const MembersPage = () => {
  return (
    <ClubProvider>
      <MemberProvider initialFilters={{ status: DEFAULT_MEMBER_STATUS }}>
        <MemberList />
      </MemberProvider>
    </ClubProvider>
  );
};
