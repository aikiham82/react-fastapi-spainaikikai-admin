import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnnualPaymentProvider, PendingPayments, useAnnualPaymentContext } from '@/features/annual-payments';
import { ClubPaymentsProvider } from '@/features/club-payments/hooks/useClubPaymentsContext';
import { ClubPaymentsPage } from '@/features/club-payments/components/ClubPaymentsPage';

const PENDING_TAB = 'pendientes';
const HISTORY_TAB = 'historial';

const PendingTabLabel = () => {
  const { formData, pendingMemberCount, isLoadingMembers } = useAnnualPaymentContext();
  const showCount = !!formData.club_id && !isLoadingMembers && pendingMemberCount > 0;
  return <>{showCount ? `Pendientes · ${pendingMemberCount}` : 'Pendientes'}</>;
};

export const PaymentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === HISTORY_TAB ? HISTORY_TAB : PENDING_TAB;

  const changeTab = (next: string) => {
    setSearchParams(next === HISTORY_TAB ? { tab: HISTORY_TAB } : {}, { replace: true });
  };

  return (
    <AnnualPaymentProvider>
      <Tabs value={tab} onValueChange={changeTab} className="gap-6">
        <TabsList className="h-11 self-start">
          <TabsTrigger value={PENDING_TAB} className="px-4 text-[15px]">
            <PendingTabLabel />
          </TabsTrigger>
          <TabsTrigger value={HISTORY_TAB} className="px-4 text-[15px]">
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value={PENDING_TAB}>
          <PendingPayments />
        </TabsContent>
        <TabsContent value={HISTORY_TAB}>
          <ClubPaymentsProvider>
            <ClubPaymentsPage />
          </ClubPaymentsProvider>
        </TabsContent>
      </Tabs>
    </AnnualPaymentProvider>
  );
};

export default PaymentsPage;
