import { ClubProvider } from './features/clubs/hooks/useClubContext';
import { ClubList } from './features/clubs/components/ClubList';

export const ClubsPage = () => {
  return (
    <ClubProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clubs</h1>
          <p className="text-gray-600 mt-1">Gestiona los clubs de la asociación</p>
        </div>
        <ClubList />
      </div>
    </ClubProvider>
  );
};
