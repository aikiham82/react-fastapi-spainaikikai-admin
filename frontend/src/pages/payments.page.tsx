import { useSearchParams } from 'react-router-dom';
import { AnnualPaymentProvider, PendingPayments } from '@/features/annual-payments';
import { ClubPaymentsProvider } from '@/features/club-payments/hooks/useClubPaymentsContext';
import { ClubPaymentsPage } from '@/features/club-payments/components/ClubPaymentsPage';

export const PaymentsPage = () => {
  const [searchParams] = useSearchParams();

  return (
    <AnnualPaymentProvider>
      {searchParams.get('tab') === 'historial' ? (
        <ClubPaymentsProvider>
          <ClubPaymentsPage />
        </ClubPaymentsProvider>
      ) : (
        <PendingPayments />
      )}
    </AnnualPaymentProvider>
  );
};

export default PaymentsPage;
