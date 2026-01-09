import { MemberProvider } from '@/features/members/hooks/useMemberContext';
import { MemberList } from '@/features/members/components/MemberList';

export const MembersPage = () => {
  return (
    <MemberProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Miembros</h1>
          <p className="text-gray-600 mt-1">Gestiona los miembros de la asociación</p>
        </div>
        <MemberList />
      </div>
    </MemberProvider>
  );
};
