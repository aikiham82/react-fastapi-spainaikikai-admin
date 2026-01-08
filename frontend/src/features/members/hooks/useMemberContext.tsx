import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useMembersQuery } from './queries/useMemberQueries';
import { useCreateMemberMutation, useUpdateMemberMutation, useDeleteMemberMutation } from './mutations/useMemberMutations';
import type { Member, CreateMemberRequest, UpdateMemberRequest, MemberFilters } from '../data/schemas/member.schema';

interface MemberContextType {
  members: Member[];
  selectedMember: Member | null;
  isLoading: boolean;
  error: Error | null;
  filters: MemberFilters;
  total: number;
  offset: number;
  limit: number;
  createMember: (data: CreateMemberRequest) => void;
  updateMember: (id: string, data: UpdateMemberRequest) => void;
  deleteMember: (id: string) => void;
  selectMember: (member: Member | null) => void;
  setFilters: (filters: MemberFilters) => void;
  setPagination: (offset: number, limit: number) => void;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export const MemberProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<MemberFilters>({ limit: 20, offset: 0 });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { data: membersData, isLoading, error } = useMembersQuery(filters);
  const createMutation = useCreateMemberMutation();
  const updateMutation = useUpdateMemberMutation();
  const deleteMutation = useDeleteMemberMutation();

  const handleCreateMember = useCallback((data: CreateMemberRequest) => {
    createMutation(data);
  }, [createMutation]);

  const handleUpdateMember = useCallback((id: string, data: UpdateMemberRequest) => {
    updateMutation({ id, data });
  }, [updateMutation]);

  const handleDeleteMember = useCallback((id: string) => {
    deleteMutation(id);
  }, [deleteMutation]);

  const handleSetPagination = useCallback((offset: number, limit: number) => {
    setFilters({ ...filters, offset, limit });
  }, [filters, setFilters]);

  const value: MemberContextType = {
    members: membersData?.items || [],
    selectedMember,
    isLoading,
    error,
    filters,
    total: membersData?.total || 0,
    offset: membersData?.offset || 0,
    limit: membersData?.limit || 20,
    createMember: handleCreateMember,
    updateMember: handleUpdateMember,
    deleteMember: handleDeleteMember,
    selectMember: setSelectedMember,
    setFilters,
    setPagination: handleSetPagination,
  };

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
};

export const useMemberContext = (): MemberContextType => {
  const context = useContext(MemberContext);
  if (!context) {
    throw new Error('useMemberContext must be used within a MemberProvider');
  }
  return context;
};
