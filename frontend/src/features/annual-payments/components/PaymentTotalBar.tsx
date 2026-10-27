import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/core/utils/format';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

const describeSelection = (members: number, withClubFee: boolean): string => {
  if (members === 0) return withClubFee ? 'Solo la cuota del club' : 'Nada marcado';
  const noun = members === 1 ? 'miembro' : 'miembros';
  return `${members} ${noun}${withClubFee ? ' + cuota' : ''}`;
};

export const PaymentTotalBar = () => {
  const { formData, totals, canPay, isSubmitting, submitPayment, submitError } =
    useAnnualPaymentContext();

  return (
    <div className="sticky -bottom-5 z-20 -mx-4 -mb-5 bg-card px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:-mx-6 sm:px-6 md:-bottom-8 md:-mb-8 lg:hidden">
      {submitError && (
        <p role="alert" className="pb-2 text-sm text-danger">
          {submitError}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">{formatCurrency(totals.total)}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {describeSelection(formData.member_assignments.length, formData.include_club_fee)}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          aria-label="Pagar con tarjeta"
          className="h-12 shrink-0 px-6 text-base"
          onClick={submitPayment}
          disabled={!canPay || isSubmitting || totals.total <= 0}
        >
          {isSubmitting ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <CreditCard className="size-5" aria-hidden="true" />
          )}
          Pagar
        </Button>
      </div>
    </div>
  );
};
