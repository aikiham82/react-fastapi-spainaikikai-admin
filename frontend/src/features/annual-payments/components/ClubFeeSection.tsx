import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

export const ClubFeeSection: React.FC = () => {
  const { formData, setField, isSubmitting, prices, clubFeeAlreadyPaid } = useAnnualPaymentContext();

  const clubFeePrice = prices?.club_fee ?? 0;
  const isDisabled = isSubmitting || clubFeeAlreadyPaid;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Cuota de Club</h3>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Checkbox
            id="include_club_fee"
            checked={clubFeeAlreadyPaid ? false : formData.include_club_fee}
            onCheckedChange={(checked) => setField('include_club_fee', checked === true)}
            disabled={isDisabled}
          />
          <Label
            htmlFor="include_club_fee"
            className={`text-sm font-medium ${clubFeeAlreadyPaid ? 'text-slate-400' : 'cursor-pointer'}`}
          >
            Incluir cuota anual de club
          </Label>
          {clubFeeAlreadyPaid && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Ya pagada
            </Badge>
          )}
        </div>
        <span className={`font-semibold ${clubFeeAlreadyPaid ? 'text-slate-400' : 'text-slate-900'}`}>
          {clubFeePrice.toFixed(2)}€
        </span>
      </div>
    </div>
  );
};
