import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useAnnualPaymentForm, type UseAnnualPaymentFormReturn } from './useAnnualPaymentForm';
import { useInitiateAnnualPaymentMutation } from './mutations/useInitiateAnnualPayment.mutation';
import { useAuthContext } from '@/features/auth/hooks/useAuthContext';
import { useClubsQuery } from '@/features/clubs/hooks/queries/useClubQueries';
import type { Club } from '@/features/clubs/data/schemas/club.schema';
import type { InitiateAnnualPaymentRequest } from '../data/schemas/annual-payment.schema';

interface AnnualPaymentContextType extends UseAnnualPaymentFormReturn {
  clubs: Club[];
  isLoadingClubs: boolean;
  userClubId: string | null;
  isClubAdmin: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitPayment: () => void;
}

const AnnualPaymentContext = createContext<AnnualPaymentContextType | undefined>(undefined);

interface AnnualPaymentProviderProps {
  children: ReactNode;
}

export const AnnualPaymentProvider: React.FC<AnnualPaymentProviderProps> = ({ children }) => {
  const { userRole, clubId } = useAuthContext();
  const { data: clubsData, isLoading: isLoadingClubs } = useClubsQuery({});
  const initiatePaymentMutation = useInitiateAnnualPaymentMutation();

  const isClubAdmin = userRole === 'club_admin';
  const userClubId = clubId ?? null;

  // Initialize form with user's club if they are a club admin
  const initialFormValues = useMemo(() => {
    if (isClubAdmin && userClubId) {
      return { club_id: userClubId };
    }
    return {};
  }, [isClubAdmin, userClubId]);

  const form = useAnnualPaymentForm(initialFormValues);

  const clubs = useMemo(() => {
    if (isClubAdmin && userClubId) {
      // Filter to only show user's club if they are a club admin
      return (clubsData || []).filter((club) => club.id === userClubId);
    }
    return clubsData || [];
  }, [clubsData, isClubAdmin, userClubId]);

  const submitPayment = useCallback(() => {
    if (!form.validate()) {
      return;
    }

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
    userClubId,
    isClubAdmin,
    isSubmitting: initiatePaymentMutation.isPending,
    submitError,
    submitPayment,
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
