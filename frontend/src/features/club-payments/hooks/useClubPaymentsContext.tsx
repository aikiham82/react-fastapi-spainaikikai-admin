import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useAllClubsPaymentSummaryQuery, useClubPaymentDetailQuery } from './queries/useClubPaymentsQueries';
import type { AllClubsPaymentSummaryResponse } from '../data/schemas/club-payments.schema';
import type { ClubPaymentSummaryResponse } from '@/features/member-payments/data/schemas/member-payment.schema';

interface ClubPaymentsContextType {
  isSuperAdmin: boolean;
  userClubId: string | null;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  allClubsSummary: AllClubsPaymentSummaryResponse | undefined;
  isLoadingAllClubs: boolean;
  allClubsError: Error | null;
  selectedClubId: string | null;
  selectClub: (clubId: string | null) => void;
  clubDetail: ClubPaymentSummaryResponse | undefined;
  isLoadingClubDetail: boolean;
  clubDetailError: Error | null;
  showingDetail: boolean;
  goBackToList: () => void;
}

const ClubPaymentsContext = createContext<ClubPaymentsContextType | undefined>(undefined);

export const ClubPaymentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userRole, clubId: userClubId } = useAuthContext();
  const isSuperAdmin = userRole === 'super_admin';

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedClubId, setSelectedClubId] = useState<string | null>(
    isSuperAdmin ? null : userClubId
  );

  const {
    data: allClubsSummary,
    isLoading: isLoadingAllClubs,
    error: allClubsError,
  } = useAllClubsPaymentSummaryQuery(selectedYear, isSuperAdmin && !selectedClubId);

  const activeClubId = selectedClubId || (isSuperAdmin ? null : userClubId) || '';
  const {
    data: clubDetail,
    isLoading: isLoadingClubDetail,
    error: clubDetailError,
  } = useClubPaymentDetailQuery(activeClubId, selectedYear, !!activeClubId);

  const selectClub = useCallback((clubId: string | null) => {
    setSelectedClubId(clubId);
  }, []);

  const goBackToList = useCallback(() => {
    setSelectedClubId(null);
  }, []);

  const showingDetail = isSuperAdmin ? !!selectedClubId : true;

  const value: ClubPaymentsContextType = {
    isSuperAdmin,
    userClubId,
    selectedYear,
    setSelectedYear,
    allClubsSummary,
    isLoadingAllClubs,
    allClubsError: allClubsError as Error | null,
    selectedClubId,
    selectClub,
    clubDetail,
    isLoadingClubDetail,
    clubDetailError: clubDetailError as Error | null,
    showingDetail,
    goBackToList,
  };

  return (
    <ClubPaymentsContext.Provider value={value}>
      {children}
    </ClubPaymentsContext.Provider>
  );
};

export const useClubPaymentsContext = (): ClubPaymentsContextType => {
  const context = useContext(ClubPaymentsContext);
  if (!context) {
    throw new Error('useClubPaymentsContext must be used within a ClubPaymentsProvider');
  }
  return context;
};
