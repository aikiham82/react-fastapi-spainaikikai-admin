import { useSearchParams } from 'react-router-dom';
import { AnnualPaymentProvider, PendingPayments } from '@/features/annual-payments';
import type { RenewKind } from '@/features/annual-payments/utils/payment-checklist';

const RENEW_KINDS: readonly RenewKind[] = ['licencia', 'accidentes', 'rc'];
const renewKindOf = (value: string | null): RenewKind => RENEW_KINDS.find((kind) => kind === value) ?? 'licencia';
import { ClubPaymentsProvider } from '@/features/club-payments/hooks/useClubPaymentsContext';
import { ClubPaymentsPage } from '@/features/club-payments/components/ClubPaymentsPage';

export const PaymentsPage = () => {
  const [searchParams] = useSearchParams();

  return (
    <AnnualPaymentProvider
      renewMemberId={searchParams.get('renovar') ?? undefined}
      renewKind={renewKindOf(searchParams.get('que'))}
    >
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
