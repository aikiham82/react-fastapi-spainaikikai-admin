import React, { createContext, useContext, useCallback, useMemo, useState, useRef, useEffect, type ReactNode } from 'react';
import { useAnnualPaymentForm, type UseAnnualPaymentFormReturn } from './useAnnualPaymentForm';
import { useInitiateAnnualPaymentMutation } from './mutations/useInitiateAnnualPayment.mutation';
import { useAnnualPaymentPricesQuery } from './queries/useAnnualPaymentPricesQuery';
import { useAnnualPaymentPrefillQuery } from './queries/useAnnualPaymentPrefillQuery';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useClubsQuery } from '@/features/clubs/hooks/queries/useClubQueries';
import { useMembersQuery } from '@/features/members/hooks/queries/useMemberQueries';
import type { Club } from '@/features/clubs/data/schemas/club.schema';
import type { Member } from '@/features/members/data/schemas/member.schema';
import type { AnnualPaymentPrices, InitiateAnnualPaymentRequest, MemberPaymentAssignment } from '../data/schemas/annual-payment.schema';

interface AnnualPaymentContextType extends UseAnnualPaymentFormReturn {
  clubs: Club[];
  isLoadingClubs: boolean;
  members: Member[];
  isLoadingMembers: boolean;
  userClubId: string | null;
  isClubAdmin: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitPayment: () => void;
  // Prices from API
  prices: AnnualPaymentPrices | null;
  isLoadingPrices: boolean;
  pricesError: string | null;
  // Prefill
  prefillSource: 'members' | 'previous_payment' | null;
  isLoadingPrefill: boolean;
  // Member selection
  isMemberSelectionOpen: boolean;
  openMemberSelection: () => void;
  closeMemberSelection: () => void;
  setMemberAssignments: (assignments: MemberPaymentAssignment[]) => void;
}

const AnnualPaymentContext = createContext<AnnualPaymentContextType | undefined>(undefined);

interface AnnualPaymentProviderProps {
  children: ReactNode;
}

export const AnnualPaymentProvider: React.FC<AnnualPaymentProviderProps> = ({ children }) => {
  const { userRole, clubId } = useAuthContext();
  const { data: clubsData, isLoading: isLoadingClubs } = useClubsQuery({});
  const initiatePaymentMutation = useInitiateAnnualPaymentMutation();

  // Fetch prices from API
  const { data: prices, isLoading: isLoadingPrices, error: pricesQueryError } = useAnnualPaymentPricesQuery();

  const pricesError = useMemo(() => {
    if (pricesQueryError) {
      const err = pricesQueryError as Error & { response?: { data?: { detail?: string } } };
      return err.response?.data?.detail || err.message || 'Error al cargar los precios';
    }
    return null;
  }, [pricesQueryError]);

  const isClubAdmin = userRole === 'club_admin';
  const userClubId = clubId ?? null;

  // Initialize form with user's club if they are a club admin
  const initialFormValues = useMemo(() => {
    if (isClubAdmin && userClubId) {
      return { club_id: userClubId };
    }
    return {};
  }, [isClubAdmin, userClubId]);

  const form = useAnnualPaymentForm(initialFormValues, prices);

  // Fetch prefill data when club and year are set
  const {
    data: prefillData,
    isLoading: isLoadingPrefill,
  } = useAnnualPaymentPrefillQuery(form.formData.club_id, form.formData.payment_year);

  // Apply prefill data to form (once per club+year combination)
  const prefillAppliedRef = useRef<string>('');

  useEffect(() => {
    if (!prefillData) return;

    const prefillKey = `${form.formData.club_id}-${form.formData.payment_year}`;
    if (prefillAppliedRef.current === prefillKey) return;
    prefillAppliedRef.current = prefillKey;

    if (prefillData.payer_name) {
      form.setField('payer_name', prefillData.payer_name);
    }
    form.setField('include_club_fee', prefillData.include_club_fee);
    form.setField('kyu_count', prefillData.kyu_count);
    form.setField('kyu_infantil_count', prefillData.kyu_infantil_count);
    form.setField('dan_count', prefillData.dan_count);
    form.setField('fukushidoin_shidoin_count', prefillData.fukushidoin_shidoin_count);
    form.setField('seguro_accidentes_count', prefillData.seguro_accidentes_count);
    form.setField('seguro_rc_count', prefillData.seguro_rc_count);
    if (prefillData.member_assignments.length > 0) {
      form.setField('member_assignments', prefillData.member_assignments);
    }
  }, [prefillData, form]);

  // Fetch members for the selected club
  const { data: membersData, isLoading: isLoadingMembers } = useMembersQuery(
    { club_id: form.formData.club_id, status: 'active' },
    { enabled: !!form.formData.club_id }
  );

  // Clear member assignments and reset prefill when club changes
  const previousClubIdRef = useRef(form.formData.club_id);
  useEffect(() => {
    if (previousClubIdRef.current !== form.formData.club_id) {
      if (form.formData.member_assignments.length > 0) {
        form.setField('member_assignments', []);
      }
      prefillAppliedRef.current = '';
      previousClubIdRef.current = form.formData.club_id;
    }
  }, [form.formData.club_id, form.formData.member_assignments.length, form]);

  const clubs = useMemo(() => {
    if (isClubAdmin && userClubId) {
      // Filter to only show user's club if they are a club admin
      return (clubsData || []).filter((club) => club.id === userClubId);
    }
    return clubsData || [];
  }, [clubsData, isClubAdmin, userClubId]);

  const members = useMemo(() => membersData || [], [membersData]);

  // Member selection modal state
  const [isMemberSelectionOpen, setIsMemberSelectionOpen] = useState(false);

  const openMemberSelection = useCallback(() => {
    setIsMemberSelectionOpen(true);
  }, []);

  const closeMemberSelection = useCallback(() => {
    setIsMemberSelectionOpen(false);
  }, []);

  const setMemberAssignments = useCallback((assignments: MemberPaymentAssignment[]) => {
    // Count assignments per payment type
    const counts: Record<string, number> = {
      kyu: 0,
      kyu_infantil: 0,
      dan: 0,
      fukushidoin_shidoin: 0,
      seguro_accidentes: 0,
      seguro_rc: 0,
    };
    assignments.forEach((a) => {
      a.payment_types.forEach((type) => {
        if (counts[type] !== undefined) {
          counts[type]++;
        }
      });
    });

    // Update quantity fields to match actual assignments
    form.setField('kyu_count', counts.kyu);
    form.setField('kyu_infantil_count', counts.kyu_infantil);
    form.setField('dan_count', counts.dan);
    form.setField('fukushidoin_shidoin_count', counts.fukushidoin_shidoin);
    form.setField('seguro_accidentes_count', counts.seguro_accidentes);
    form.setField('seguro_rc_count', counts.seguro_rc);
    form.setField('member_assignments', assignments);
  }, [form]);

  const submitPayment = useCallback(() => {
    if (!form.validate()) {
      return;
    }

    // Build map of which types have non-zero quantities
    const activeCounts: Record<string, number> = {
      kyu: form.formData.kyu_count,
      kyu_infantil: form.formData.kyu_infantil_count,
      dan: form.formData.dan_count,
      fukushidoin_shidoin: form.formData.fukushidoin_shidoin_count,
      seguro_accidentes: form.formData.seguro_accidentes_count,
      seguro_rc: form.formData.seguro_rc_count,
    };

    // Filter out stale member assignments whose payment_types reference zero-count items
    const cleanedAssignments = form.formData.member_assignments
      .map((a) => ({
        ...a,
        payment_types: a.payment_types.filter((t) => (activeCounts[t] ?? 0) > 0),
      }))
      .filter((a) => a.payment_types.length > 0);

    const request: InitiateAnnualPaymentRequest = {
      payer_name: form.formData.payer_name,
      club_id: form.formData.club_id,
      payment_year: form.formData.payment_year,
      include_club_fee: form.formData.include_club_fee,
      kyu_count: form.formData.kyu_count,
      kyu_infantil_count: form.formData.kyu_infantil_count,
      dan_count: form.formData.dan_count,
      fukushidoin_shidoin_count: form.formData.fukushidoin_shidoin_count,
      seguro_accidentes_count: form.formData.seguro_accidentes_count,
      seguro_rc_count: form.formData.seguro_rc_count,
      member_assignments: cleanedAssignments.length > 0
        ? cleanedAssignments
        : undefined,
    };

    initiatePaymentMutation.mutate(request);
  }, [form, initiatePaymentMutation]);

  const submitError = useMemo(() => {
    if (initiatePaymentMutation.error) {
      const err = initiatePaymentMutation.error as Error & { response?: { data?: { detail?: string } } };
      return err.response?.data?.detail || err.message || 'Error al procesar el pago';
    }
    return null;
  }, [initiatePaymentMutation.error]);

  const value: AnnualPaymentContextType = {
    ...form,
    clubs,
    isLoadingClubs,
    members,
    isLoadingMembers,
    userClubId,
    isClubAdmin,
    isSubmitting: initiatePaymentMutation.isPending,
    submitError,
    submitPayment,
    prices: prices ?? null,
    isLoadingPrices,
    pricesError,
    prefillSource: prefillData?.source ?? null,
    isLoadingPrefill,
    isMemberSelectionOpen,
    openMemberSelection,
    closeMemberSelection,
    setMemberAssignments,
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
