import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useSeminarsQuery } from './queries/useSeminarQueries';
import { useCreateSeminarMutation, useUpdateSeminarMutation, useDeleteSeminarMutation, useRegisterMemberMutation } from './mutations/useSeminarMutations';
import type { Seminar, CreateSeminarRequest, UpdateSeminarRequest, SeminarFilters, RegisterMemberRequest } from '../data/schemas/seminar.schema';

interface SeminarContextType {
  seminars: Seminar[];
  selectedSeminar: Seminar | null;
  isLoading: boolean;
  error: Error | null;
  filters: SeminarFilters;
  total: number;
  offset: number;
  limit: number;
  createSeminar: (data: CreateSeminarRequest) => void;
  updateSeminar: (id: string, data: UpdateSeminarRequest) => void;
  deleteSeminar: (id: string) => void;
  registerMember: (data: RegisterMemberRequest) => void;
  selectSeminar: (seminar: Seminar | null) => void;
  setFilters: (filters: SeminarFilters) => void;
  setPagination: (offset: number, limit: number) => void;
}

const SeminarContext = createContext<SeminarContextType | undefined>(undefined);

export const SeminarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<SeminarFilters>({ limit: 20, offset: 0 });
  const [selectedSeminar, setSelectedSeminar] = useState<Seminar | null>(null);
  const { data: seminarsData, isLoading, error } = useSeminarsQuery(filters);
  const createMutation = useCreateSeminarMutation();
  const updateMutation = useUpdateSeminarMutation();
  const deleteMutation = useDeleteSeminarMutation();
  const registerMutation = useRegisterMemberMutation();

  const handleCreateSeminar = useCallback((data: CreateSeminarRequest) => {
    createMutation.mutate(data);
  }, [createMutation]);

  const handleUpdateSeminar = useCallback((id: string, data: UpdateSeminarRequest) => {
    updateMutation.mutate({ id, data });
  }, [updateMutation]);

  const handleDeleteSeminar = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleRegisterMember = useCallback((data: RegisterMemberRequest) => {
    registerMutation.mutate(data);
  }, [registerMutation]);

  const handleSetPagination = useCallback((offset: number, limit: number) => {
    setFilters({ ...filters, offset, limit });
  }, [filters, setFilters]);

  const value: SeminarContextType = {
    seminars: seminarsData?.items || [],
    selectedSeminar,
    isLoading,
    error,
    filters,
    total: seminarsData?.total || 0,
    offset: seminarsData?.offset || 0,
    limit: seminarsData?.limit || 20,
    createSeminar: handleCreateSeminar,
    updateSeminar: handleUpdateSeminar,
    deleteSeminar: handleDeleteSeminar,
    registerMember: handleRegisterMember,
    selectSeminar: setSelectedSeminar,
    setFilters,
    setPagination: handleSetPagination,
  };

  return <SeminarContext.Provider value={value}>{children}</SeminarContext.Provider>;
};

export const useSeminarContext = (): SeminarContextType => {
  const context = useContext(SeminarContext);
  if (!context) {
    throw new Error('useSeminarContext must be used within a SeminarProvider');
  }
  return context;
};
