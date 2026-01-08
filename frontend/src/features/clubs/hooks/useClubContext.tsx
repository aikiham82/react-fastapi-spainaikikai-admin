import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useClubsQuery } from './queries/useClubQueries';
import { useCreateClubMutation, useUpdateClubMutation, useDeleteClubMutation } from './mutations/useClubMutations';
import type { Club, CreateClubRequest, UpdateClubRequest, ClubFilters } from '../data/schemas/club.schema';

interface ClubContextType {
  clubs: Club[];
  selectedClub: Club | null;
  isLoading: boolean;
  error: Error | null;
  filters: ClubFilters;
  createClub: (data: CreateClubRequest) => void;
  updateClub: (id: string, data: UpdateClubRequest) => void;
  deleteClub: (id: string) => void;
  selectClub: (club: Club | null) => void;
  setFilters: (filters: ClubFilters) => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<ClubFilters>({});
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const { data: clubsData, isLoading, error } = useClubsQuery(filters);
  const createMutation = useCreateClubMutation();
  const updateMutation = useUpdateClubMutation();
  const deleteMutation = useDeleteClubMutation();

  const handleCreateClub = useCallback((data: CreateClubRequest) => {
    createMutation(data);
  }, [createMutation]);

  const handleUpdateClub = useCallback((id: string, data: UpdateClubRequest) => {
    updateMutation({ id, data });
  }, [updateMutation]);

  const handleDeleteClub = useCallback((id: string) => {
    deleteMutation(id);
  }, [deleteMutation]);

  const value: ClubContextType = {
    clubs: clubsData || [],
    selectedClub,
    isLoading,
    error,
    filters,
    createClub: handleCreateClub,
    updateClub: handleUpdateClub,
    deleteClub: handleDeleteClub,
    selectClub: setSelectedClub,
    setFilters,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
};

export const useClubContext = (): ClubContextType => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClubContext must be used within a ClubProvider');
  }
  return context;
};
