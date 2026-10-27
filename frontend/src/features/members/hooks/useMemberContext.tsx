import { createContext, useContext, useState, useCallback, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { useMembersQuery } from './queries/useMemberQueries';
import { useCreateMemberMutation, useUpdateMemberMutation, useDeleteMemberMutation, useChangeMemberStatusMutation, useChangeMemberGradeMutation } from './mutations/useMemberMutations';
import type { Member, CreateMemberRequest, UpdateMemberRequest, MemberFilters } from '../data/schemas/member.schema';

interface MemberContextType {
  members: Member[];
  selectedMember: Member | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  filters: MemberFilters;
  total: number;
  offset: number;
  limit: number;
  createMember: (data: CreateMemberRequest, onSaved?: () => void) => void;
  updateMember: (id: string, data: UpdateMemberRequest, onSaved?: () => void) => void;
  deleteMember: (id: string) => void;
  changeMemberStatus: (id: string, status: 'active' | 'inactive') => void;
  changeMemberGrade: (id: string, gradeNumber: number, onSaved?: () => void) => void;
  selectMember: (member: Member | null) => void;
  setFilters: Dispatch<SetStateAction<MemberFilters>>;
  setPagination: (offset: number, limit: number) => void;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

interface MemberProviderProps {
  children: ReactNode;
  initialFilters?: MemberFilters;
}

export const MemberProvider: React.FC<MemberProviderProps> = ({ children, initialFilters }) => {
  const [filters, setFilters] = useState<MemberFilters>({ limit: 0, offset: 0, ...initialFilters });
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { data: membersData, isLoading, isFetching, error } = useMembersQuery(filters);
  const createMutation = useCreateMemberMutation();
  const updateMutation = useUpdateMemberMutation();
  const deleteMutation = useDeleteMemberMutation();
  const changeStatusMutation = useChangeMemberStatusMutation();
  const changeGradeMutation = useChangeMemberGradeMutation();

  const handleCreateMember = useCallback((data: CreateMemberRequest, onSaved?: () => void) => {
    createMutation.mutate(data, { onSuccess: onSaved });
  }, [createMutation]);

  const handleUpdateMember = useCallback((id: string, data: UpdateMemberRequest, onSaved?: () => void) => {
    updateMutation.mutate({ id, data }, { onSuccess: onSaved });
  }, [updateMutation]);

  const handleDeleteMember = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleChangeMemberStatus = useCallback((id: string, status: 'active' | 'inactive') => {
    changeStatusMutation.mutate({ id, data: { status } });
  }, [changeStatusMutation]);

  const handleChangeMemberGrade = useCallback((id: string, gradeNumber: number, onSaved?: () => void) => {
    changeGradeMutation.mutate({ id, gradeNumber }, { onSuccess: onSaved });
  }, [changeGradeMutation]);

  const handleSetPagination = useCallback((offset: number, limit: number) => {
    setFilters(prev => ({ ...prev, offset, limit }));
  }, []);

  const value: MemberContextType = {
    members: membersData || [],
    selectedMember,
    isLoading,
    isFetching,
    error,
    filters,
    total: membersData?.length || 0,
    offset: filters.offset || 0,
    limit: filters.limit || 0,
    createMember: handleCreateMember,
    updateMember: handleUpdateMember,
    deleteMember: handleDeleteMember,
    changeMemberStatus: handleChangeMemberStatus,
    changeMemberGrade: handleChangeMemberGrade,
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
