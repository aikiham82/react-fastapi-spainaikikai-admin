import React, { createContext, useContext, useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react';
import { useAnnualPaymentForm, type UseAnnualPaymentFormReturn } from './useAnnualPaymentForm';
import { useInitiateAnnualPaymentMutation } from './mutations/useInitiateAnnualPayment.mutation';
import { useAnnualPaymentPricesQuery } from './queries/useAnnualPaymentPricesQuery';
import { useAnnualPaymentPrefillQuery } from './queries/useAnnualPaymentPrefillQuery';
import type { ApiError } from '@/core/data/apiClient';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useClubsQuery } from '@/features/clubs/hooks/queries/useClubQueries';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import type { Club } from '@/features/clubs/data/schemas/club.schema';
import type { AnnualPaymentItemType, AnnualPaymentPrices, InitiateAnnualPaymentRequest, MemberPaymentAssignment } from '../data/schemas/annual-payment.schema';
import {
  buildChecklistRows,
  deriveCounts,
  missingPriceConcepts,
  requiredPriceConcepts,
  sanitizeAssignments,
  chooseLicence,
  tickAllPending,
  tickedPriceConcepts,
  toggleItems,
  type ChecklistRow,
  type MemberItem,
  type LicenceItem,
} from '../utils/payment-checklist';

interface AnnualPaymentContextType extends UseAnnualPaymentFormReturn {
  clubs: Club[];
  isLoadingClubs: boolean;
  rows: ChecklistRow[];
  pendingMemberCount: number;
  pickedMemberCount: number;
  isLoadingMembers: boolean;
  userClubId: string | null;
  isClubAdmin: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitPayment: () => void;
  prices: AnnualPaymentPrices | null;
  isLoadingPrices: boolean;
  pricesError: string | null;
  missingPrices: AnnualPaymentItemType[];
  missingTickedPrices: AnnualPaymentItemType[];
  canPay: boolean;
  isLoadingPrefill: boolean;
  hasLoadError: boolean;
  retryLoad: () => void;
  clubFeeAlreadyPaid: boolean;
  toggleMemberItems: (row: ChecklistRow, items: MemberItem[]) => void;
  chooseMemberLicence: (row: ChecklistRow, licence: LicenceItem) => void;
  tickEverythingPending: () => void;
}

const AnnualPaymentContext = createContext<AnnualPaymentContextType | undefined>(undefined);

interface AnnualPaymentProviderProps {
  children: ReactNode;
}

export const AnnualPaymentProvider: React.FC<AnnualPaymentProviderProps> = ({ children }) => {
  const { userRole, clubId } = useAuthContext();
  const { data: clubsData, isLoading: isLoadingClubs } = useClubsQuery({});
  const initiatePaymentMutation = useInitiateAnnualPaymentMutation();

  const { data: prices, isLoading: isLoadingPrices, error: pricesQueryError } = useAnnualPaymentPricesQuery();

  const pricesError = useMemo(() => {
    if (pricesQueryError) {
      const err = pricesQueryError as unknown as ApiError;
      return err.detail || err.message || 'Error al cargar los precios';
    }
    return null;
  }, [pricesQueryError]);

  const isClubAdmin = userRole === 'club_admin';
  const userClubId = clubId ?? null;

  const initialFormValues = useMemo(() => {
    if (isClubAdmin && userClubId) {
      return { club_id: userClubId };
    }
    return {};
  }, [isClubAdmin, userClubId]);

  const form = useAnnualPaymentForm(initialFormValues, prices);
  const { formData, setField } = form;

  const {
    data: prefillData,
    isLoading: isLoadingPrefill,
    isError: prefillFailed,
    refetch: refetchPrefill,
  } = useAnnualPaymentPrefillQuery(
    formData.club_id,
    formData.payment_year,
  );

  const {
    data: membersData,
    isLoading: isLoadingMembersQuery,
    isPlaceholderData: membersArePlaceholder,
    isError: membersFailed,
    refetch: refetchMembers,
  } = useMembersQuery(
    { club_id: formData.club_id, status: 'active', limit: 0 },
    { enabled: !!formData.club_id }
  );

  const membersBelongToClub = !!formData.club_id && !membersArePlaceholder;
  const isLoadingMembers = !!formData.club_id && (isLoadingMembersQuery || !!membersArePlaceholder);

  const rows = useMemo(
    () => buildChecklistRows(membersBelongToClub ? (membersData ?? []) : [], prefillData?.paid_assignments),
    [membersBelongToClub, membersData, prefillData?.paid_assignments],
  );

  const hasLoadError = !!formData.club_id && (prefillFailed || !!membersFailed);

  const retryLoad = useCallback(() => {
    if (prefillFailed) void refetchPrefill();
    if (membersFailed) void refetchMembers();
  }, [prefillFailed, membersFailed, refetchPrefill, refetchMembers]);

  const applyAssignments = useCallback((assignments: MemberPaymentAssignment[]) => {
    const counts = deriveCounts(assignments);
    setField('kyu_count', counts.kyu);
    setField('kyu_infantil_count', counts.kyu_infantil);
    setField('dan_count', counts.dan);
    setField('fukushidoin_count', counts.fukushidoin);
    setField('shidoin_count', counts.shidoin);
    setField('seguro_accidentes_count', counts.seguro_accidentes);
    setField('seguro_rc_count', counts.seguro_rc);
    setField('member_assignments', assignments);
  }, [setField]);

  const scopeKey = `${formData.club_id}:${formData.payment_year}`;
  const resetScopeRef = useRef('');
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (resetScopeRef.current !== scopeKey) {
      resetScopeRef.current = scopeKey;
      prefillAppliedRef.current = false;
      applyAssignments([]);
    }

    if (prefillAppliedRef.current || !prefillData || !membersBelongToClub || isLoadingMembers) return;
    prefillAppliedRef.current = true;

    if (prefillData.payer_name) {
      setField('payer_name', prefillData.payer_name);
    }
    setField('include_club_fee', prefillData.include_club_fee && !prefillData.club_fee_already_paid);
    applyAssignments(sanitizeAssignments(prefillData.member_assignments, rows));
  }, [scopeKey, prefillData, membersBelongToClub, isLoadingMembers, rows, setField, applyAssignments]);

  const clubs = useMemo(() => {
    if (isClubAdmin && userClubId) {
      return (clubsData || []).filter((club) => club.id === userClubId);
    }
    return clubsData || [];
  }, [clubsData, isClubAdmin, userClubId]);

  const clubFeeAlreadyPaid = prefillData?.club_fee_already_paid ?? false;

  const missingPrices = useMemo(() => {
    if (isLoadingPrices || (rows.length === 0 && !prefillData)) return [];
    return missingPriceConcepts(prices, requiredPriceConcepts(rows, clubFeeAlreadyPaid));
  }, [isLoadingPrices, prices, rows, prefillData, clubFeeAlreadyPaid]);

  const missingTickedPrices = useMemo(() => {
    if (isLoadingPrices) return [];
    const ticked = tickedPriceConcepts(formData.member_assignments, formData.include_club_fee);
    return missingPriceConcepts(prices, ticked).filter((concept) => !missingPrices.includes(concept));
  }, [isLoadingPrices, prices, formData.member_assignments, formData.include_club_fee, missingPrices]);

  const pendingMemberCount = useMemo(() => rows.filter((row) => !row.isUpToDate).length, [rows]);
  const pickedMemberCount = formData.member_assignments.length;

  const toggleMemberItems = useCallback((row: ChecklistRow, items: MemberItem[]) => {
    applyAssignments(toggleItems(formData.member_assignments, row, items));
  }, [applyAssignments, formData.member_assignments]);

  const chooseMemberLicence = useCallback((row: ChecklistRow, licence: LicenceItem) => {
    applyAssignments(chooseLicence(formData.member_assignments, row, licence));
  }, [applyAssignments, formData.member_assignments]);

  const tickEverythingPending = useCallback(() => {
    applyAssignments(tickAllPending(rows, formData.member_assignments));
    if (!clubFeeAlreadyPaid) setField('include_club_fee', true);
  }, [applyAssignments, rows, formData.member_assignments, clubFeeAlreadyPaid, setField]);

  const submitPayment = useCallback(() => {
    if (missingPrices.length > 0 || missingTickedPrices.length > 0 || hasLoadError || !form.validate()) {
      return;
    }

    const request: InitiateAnnualPaymentRequest = {
      payer_name: formData.payer_name,
      club_id: formData.club_id,
      payment_year: formData.payment_year,
      include_club_fee: formData.include_club_fee,
      kyu_count: formData.kyu_count,
      kyu_infantil_count: formData.kyu_infantil_count,
      dan_count: formData.dan_count,
      fukushidoin_count: formData.fukushidoin_count,
      shidoin_count: formData.shidoin_count,
      seguro_accidentes_count: formData.seguro_accidentes_count,
      seguro_rc_count: formData.seguro_rc_count,
      member_assignments: formData.member_assignments.length > 0 ? formData.member_assignments : undefined,
    };

    initiatePaymentMutation.mutate(request);
  }, [form, formData, initiatePaymentMutation, missingPrices, missingTickedPrices, hasLoadError]);

  const submitError = useMemo(() => {
    if (initiatePaymentMutation.error) {
      const err = initiatePaymentMutation.error as unknown as ApiError;
      return err.detail || err.message || 'Error al procesar el pago';
    }
    return null;
  }, [initiatePaymentMutation.error]);

  const value: AnnualPaymentContextType = {
    ...form,
    clubs,
    isLoadingClubs,
    rows,
    pendingMemberCount,
    pickedMemberCount,
    isLoadingMembers,
    userClubId,
    isClubAdmin,
    isSubmitting: initiatePaymentMutation.isPending,
    submitError,
    submitPayment,
    prices: prices ?? null,
    isLoadingPrices,
    pricesError,
    missingPrices,
    missingTickedPrices,
    canPay: form.isValid && missingTickedPrices.length === 0,
    isLoadingPrefill,
    hasLoadError,
    retryLoad,
    clubFeeAlreadyPaid,
    toggleMemberItems,
    chooseMemberLicence,
    tickEverythingPending,
  };

  return (
    <AnnualPaymentContext.Provider value={value}>
      {children}
    </AnnualPaymentContext.Provider>
  );
};

export const useAnnualPaymentContext = (): AnnualPaymentContextType => {
  const context = useContext(AnnualPaymentContext);
  if (!context) {
    throw new Error('useAnnualPaymentContext must be used within an AnnualPaymentProvider');
  }
  return context;
};
