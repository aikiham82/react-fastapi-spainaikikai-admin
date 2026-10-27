import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/core/utils/format';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

interface SummaryLineProps {
  label: string;
  amount: number;
}

const SummaryLine = ({ label, amount }: SummaryLineProps) => (
  <div className="flex items-baseline justify-between gap-3 text-[15px]">
    <span className="text-foreground">{label}</span>
    <span className="tabular-nums text-foreground">{formatCurrency(amount)}</span>
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
    <aside aria-labelledby="summary-title" className="hidden flex-col gap-4 border-l border-border pl-8 lg:flex">
      <h2 id="summary-title" className="text-lg font-semibold text-foreground">
        Resumen
      </h2>

      <div className="flex flex-col gap-2">
        {formData.include_club_fee && <SummaryLine label="Cuota del club" amount={totals.subtotals.club_fee} />}
        {licenceCount > 0 && <SummaryLine label={plural(licenceCount, 'licencia', 'licencias')} amount={licenceTotal} />}
        {formData.seguro_accidentes_count > 0 && (
          <SummaryLine
            label={plural(formData.seguro_accidentes_count, 'seguro de accidentes', 'seguros de accidentes')}
            amount={totals.subtotals.seguro_accidentes}
          />
        )}
        {formData.seguro_rc_count > 0 && (
          <SummaryLine
            label={plural(formData.seguro_rc_count, 'seguro RC', 'seguros RC')}
            amount={totals.subtotals.seguro_rc}
          />
        )}
        {!hasItems && <p className="text-sm text-muted-foreground">Marca al menos un concepto para pagar.</p>}
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
        <span className="text-[15px] font-medium text-foreground">Total</span>
        <span className="text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(totals.total)}</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="button" size="lg" className="w-full" onClick={submitPayment} disabled={!canPay || isSubmitting || !hasItems}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Procesando...
          </>
        ) : (
          'Pagar con tarjeta'
        )}
      </Button>

      <p className="text-[13px] text-muted-foreground">
        Pagarás en la web segura del banco. Al terminar recibirás la factura por correo y las licencias quedarán activas.
      </p>
    </aside>
  );
};
