import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { PayerDataSection } from './PayerDataSection';
import { ClubFeeSection } from './ClubFeeSection';
import { MemberFeesSection } from './MemberFeesSection';
import { InsuranceSection } from './InsuranceSection';
import { MemberSelectionSection } from './MemberSelectionSection';
import { PaymentSummary } from './PaymentSummary';

export const AnnualPaymentForm: React.FC = () => {
  const { isLoadingPrices, pricesError } = useAnnualPaymentContext();

  if (isLoadingPrices) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <span className="ml-3 text-slate-500">Cargando precios...</span>
      </div>
    );
  }

  if (pricesError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">No se pudieron cargar los precios</h3>
            <p className="text-sm text-slate-500 max-w-md">{pricesError}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pagos Anuales</CardTitle>
            <CardDescription>
              Complete el formulario para realizar el pago anual del club y sus miembros
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <PayerDataSection />
            <ClubFeeSection />
            <MemberFeesSection />
            <InsuranceSection />
            <MemberSelectionSection />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardContent className="pt-6">
            <PaymentSummary />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
