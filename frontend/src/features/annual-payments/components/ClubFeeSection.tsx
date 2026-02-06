import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

export const ClubFeeSection: React.FC = () => {
  const { formData, setField, isSubmitting, prices } = useAnnualPaymentContext();

  const clubFeePrice = prices?.club_fee ?? 0;

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
          {clubFeePrice.toFixed(2)}€
        </span>
      </div>
    </div>
  );
};
