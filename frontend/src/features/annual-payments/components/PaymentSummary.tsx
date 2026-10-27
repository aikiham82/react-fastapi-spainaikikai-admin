import { Button } from '@/components/ui/button';
import { Building2, CreditCard, HeartPulse, IdCard, Loader2, Lock, ShieldCheck, type LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/core/utils/format';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

interface SummaryLineProps {
  icon: LucideIcon;
  label: string;
  amount: number;
}

const SummaryLine = ({ icon: Icon, label, amount }: SummaryLineProps) => (
  <div className="flex items-center gap-2.5 text-[15px]">
    <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
    <span className="min-w-0 flex-1 text-foreground">{label}</span>
    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(amount)}</span>
  </div>
);

export const PaymentSummary = () => {
  const { formData, totals, errors, canPay, isSubmitting, submitError, submitPayment } = useAnnualPaymentContext();

  const licenceCount =
    formData.kyu_count +
    formData.kyu_infantil_count +
    formData.dan_count +
    formData.fukushidoin_count +
    formData.shidoin_count;
  const licenceTotal =
    totals.subtotals.kyu +
    totals.subtotals.kyu_infantil +
    totals.subtotals.dan +
    totals.subtotals.fukushidoin +
    totals.subtotals.shidoin;
  const hasItems = totals.total > 0;
  const error = errors.payer_name ?? errors.club_id ?? submitError;

  return (
    <aside aria-labelledby="summary-title" className="hidden flex-col gap-4 rounded-[18px] bg-card p-5 shadow-card lg:flex">
      <h2 id="summary-title" className="text-lg font-semibold text-foreground">
        Resumen
      </h2>

      <div className="flex flex-col gap-2">
        {formData.include_club_fee && <SummaryLine icon={Building2} label="Cuota del club" amount={totals.subtotals.club_fee} />}
        {licenceCount > 0 && <SummaryLine icon={IdCard} label={plural(licenceCount, 'licencia', 'licencias')} amount={licenceTotal} />}
        {formData.seguro_accidentes_count > 0 && (
          <SummaryLine
            icon={HeartPulse}
            label={plural(formData.seguro_accidentes_count, 'seguro de accidentes', 'seguros de accidentes')}
            amount={totals.subtotals.seguro_accidentes}
          />
        )}
        {formData.seguro_rc_count > 0 && (
          <SummaryLine
            icon={ShieldCheck}
            label={plural(formData.seguro_rc_count, 'seguro RC', 'seguros RC')}
            amount={totals.subtotals.seguro_rc}
          />
        )}
        {!hasItems && <p className="text-sm text-muted-foreground">Marca al menos un concepto para pagar.</p>}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-border pt-4">
        <span className="text-[15px] text-muted-foreground">Total</span>
        <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{formatCurrency(totals.total)}</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="button" size="lg" className="h-12 w-full text-base" onClick={submitPayment} disabled={!canPay || isSubmitting || !hasItems}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CreditCard className="size-5" aria-hidden="true" />
            Pagar con tarjeta
          </>
        )}
      </Button>

      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        Web segura del banco. Factura por correo.
      </p>
    </aside>
  );
};
