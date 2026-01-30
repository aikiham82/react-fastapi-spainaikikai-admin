import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { ANNUAL_PAYMENT_PRICES } from '../data/schemas/annual-payment.schema';

export const ClubFeeSection: React.FC = () => {
  const { formData, setField, isSubmitting } = useAnnualPaymentContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Cuota de Club</h3>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            id="include_club_fee"
            checked={formData.include_club_fee}
            onCheckedChange={(checked) => setField('include_club_fee', checked === true)}
            disabled={isSubmitting}
          />
          <Label
            htmlFor="include_club_fee"
            className="text-sm font-medium cursor-pointer"
          >
            Incluir cuota anual de club
          </Label>
        </div>
        <span className="font-semibold text-slate-900">
          {ANNUAL_PAYMENT_PRICES.club_fee.toFixed(2)}€
        </span>
      </div>
    </div>
  );
};
