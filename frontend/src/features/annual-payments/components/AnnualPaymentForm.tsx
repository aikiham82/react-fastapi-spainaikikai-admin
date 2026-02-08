import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { PayerDataSection } from './PayerDataSection';
import { ClubFeeSection } from './ClubFeeSection';
import { MemberFeesSection } from './MemberFeesSection';
import { InsuranceSection } from './InsuranceSection';
import { MemberSelectionSection } from './MemberSelectionSection';
import { PaymentSummary } from './PaymentSummary';

export const AnnualPaymentForm: React.FC = () => {
  const { isLoadingPrices, pricesError, prefillSource, isLoadingPrefill } = useAnnualPaymentContext();

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
            <CardTitle>Nuevo Pago</CardTitle>
            <CardDescription>
              Complete el formulario para realizar el pago del club y sus miembros
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {isLoadingPrefill && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando datos del club...
              </div>
            )}
            {prefillSource && !isLoadingPrefill && (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
                <Info className="h-4 w-4 shrink-0" />
                {prefillSource === 'members'
                  ? 'Datos precargados a partir de los miembros y licencias del club'
                  : 'Datos precargados a partir del pago del año anterior'}
              </div>
            )}
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
