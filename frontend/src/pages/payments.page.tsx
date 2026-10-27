import { useSearchParams } from 'react-router-dom';
import { AnnualPaymentProvider, PendingPayments } from '@/features/annual-payments';
import type { RenewKind } from '@/features/annual-payments/utils/payment-checklist';

const RENEW_KINDS: readonly RenewKind[] = ['licencia', 'accidentes', 'rc'];
const renewKindOf = (value: string | null): RenewKind => RENEW_KINDS.find((kind) => kind === value) ?? 'licencia';
const renewYearOf = (value: string | null): number | undefined => {
  const year = Number(value);
  return Number.isInteger(year) && year > 2000 ? year : undefined;
};
import { ClubPaymentsProvider } from '@/features/club-payments/hooks/useClubPaymentsContext';
import { ClubPaymentsPage } from '@/features/club-payments/components/ClubPaymentsPage';

export const PaymentsPage = () => {
  const [searchParams] = useSearchParams();

  return (
    <AnnualPaymentProvider
      renewMemberId={searchParams.get('renovar') ?? undefined}
      renewKind={renewKindOf(searchParams.get('que'))}
      renewYear={renewYearOf(searchParams.get('anio'))}
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
