import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { QuantityInput } from './QuantityInput';
import { ANNUAL_PAYMENT_PRICES, ANNUAL_PAYMENT_LABELS } from '../data/schemas/annual-payment.schema';

export const InsuranceSection: React.FC = () => {
  const { formData, incrementField, decrementField, isSubmitting } = useAnnualPaymentContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Seguros</h3>

      <div className="bg-slate-50 rounded-lg p-4">
        <QuantityInput
          label={ANNUAL_PAYMENT_LABELS.seguro_accidentes}
          value={formData.seguro_accidentes_count}
          unitPrice={ANNUAL_PAYMENT_PRICES.seguro_accidentes}
          onIncrement={() => incrementField('seguro_accidentes_count')}
          onDecrement={() => decrementField('seguro_accidentes_count')}
          disabled={isSubmitting}
        />

        <QuantityInput
          label={ANNUAL_PAYMENT_LABELS.seguro_rc}
          value={formData.seguro_rc_count}
          unitPrice={ANNUAL_PAYMENT_PRICES.seguro_rc}
          onIncrement={() => incrementField('seguro_rc_count')}
          onDecrement={() => decrementField('seguro_rc_count')}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};
