import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { ANNUAL_PAYMENT_LABELS } from '../data/schemas/annual-payment.schema';
import { formatCurrency } from '@/core/utils/format';

export const PaymentSummary: React.FC = () => {
  const {
    formData,
    totals,
    errors,
    isValid,
    isSubmitting,
    submitError,
    assignmentError,
    submitPayment,
  } = useAnnualPaymentContext();

  const hasItems = totals.total > 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Resumen de Pago</h3>

      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
        {formData.include_club_fee && totals.subtotals.club_fee > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.club_fee}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.club_fee)}</span>
          </div>
        )}

        {formData.kyu_count > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.kyu} x{formData.kyu_count}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.kyu)}</span>
          </div>
        )}

        {formData.kyu_infantil_count > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.kyu_infantil} x{formData.kyu_infantil_count}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.kyu_infantil)}</span>
          </div>
        )}

        {formData.dan_count > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.dan} x{formData.dan_count}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.dan)}</span>
          </div>
        )}

        {formData.fukushidoin_count > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.fukushidoin} x{formData.fukushidoin_count}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.fukushidoin)}</span>
          </div>
        )}

        {formData.shidoin_count > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.shidoin} x{formData.shidoin_count}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.shidoin)}</span>
          </div>
        )}

        {formData.seguro_accidentes_count > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.seguro_accidentes} x{formData.seguro_accidentes_count}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.seguro_accidentes)}</span>
          </div>
        )}

        {formData.seguro_rc_count > 0 && (
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate">{ANNUAL_PAYMENT_LABELS.seguro_rc} x{formData.seguro_rc_count}</span>
            <span className="whitespace-nowrap">{formatCurrency(totals.subtotals.seguro_rc)}</span>
          </div>
        )}

        {!hasItems && (
          <p className="text-sm text-slate-500 italic">
            Seleccione al menos un concepto de pago
          </p>
        )}

        <div className="border-t border-slate-200 pt-3 mt-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>

      {errors._form && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-600">{errors._form}</p>
        </div>
      )}

      {assignmentError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-600">{assignmentError}</p>
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      <Button
        type="button"
        className="w-full"
        size="lg"
        onClick={submitPayment}
        disabled={!isValid || isSubmitting || !hasItems}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pagar {formatCurrency(totals.total)}
          </>
        )}
      </Button>

      <p className="text-xs text-center text-slate-500">
        Será redirigido a la pasarela de pago segura de Redsys
      </p>
    </div>
  );
};
