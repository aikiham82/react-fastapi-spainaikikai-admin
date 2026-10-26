import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/core/utils/format';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

const describeSelection = (members: number, withClubFee: boolean): string => {
  if (members === 0) return withClubFee ? 'Solo la cuota del club' : 'Nada marcado';
  const noun = members === 1 ? 'miembro' : 'miembros';
  return `${members} ${noun}${withClubFee ? ' + cuota' : ''}`;
};

export const PaymentTotalBar = () => {
  const { formData, totals, pickedMemberCount, canPay, isSubmitting, submitPayment, submitError } =
    useAnnualPaymentContext();

  return (
    <div className="sticky -bottom-5 z-20 -mx-4 -mb-5 border-t border-border bg-card px-4 py-3 sm:-mx-6 sm:px-6 md:-bottom-8 md:-mb-8 lg:hidden">
      {submitError && (
        <p role="alert" className="pb-2 text-sm text-danger">
          {submitError}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-[15px] text-foreground">
          <span>{describeSelection(pickedMemberCount, formData.include_club_fee)}</span>
          <span aria-hidden="true"> · </span>
          <span className="font-semibold tabular-nums">{formatCurrency(totals.total)}</span>
        </p>
        <Button type="button" size="lg" onClick={submitPayment} disabled={!canPay || isSubmitting || totals.total <= 0}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Pagar con tarjeta
        </Button>
      </div>
    </div>
  );
};
