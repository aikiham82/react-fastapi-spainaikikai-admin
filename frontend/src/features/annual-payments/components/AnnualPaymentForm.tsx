import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayerDataSection } from './PayerDataSection';
import { ClubFeeSection } from './ClubFeeSection';
import { MemberFeesSection } from './MemberFeesSection';
import { InsuranceSection } from './InsuranceSection';
import { MemberSelectionSection } from './MemberSelectionSection';
import { PaymentSummary } from './PaymentSummary';

export const AnnualPaymentForm: React.FC = () => {
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
