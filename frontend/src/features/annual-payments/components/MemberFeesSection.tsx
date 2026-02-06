import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';
import { QuantityInput } from './QuantityInput';
import { ANNUAL_PAYMENT_LABELS } from '../data/schemas/annual-payment.schema';

export const MemberFeesSection: React.FC = () => {
  const { formData, incrementField, decrementField, isSubmitting, prices } = useAnnualPaymentContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Licencias de Miembros</h3>

      <div className="bg-slate-50 rounded-lg p-4">
        <QuantityInput
          label={ANNUAL_PAYMENT_LABELS.kyu}
          value={formData.kyu_count}
          unitPrice={prices?.kyu ?? 0}
          onIncrement={() => incrementField('kyu_count')}
          onDecrement={() => decrementField('kyu_count')}
          disabled={isSubmitting}
        />

        <QuantityInput
          label={ANNUAL_PAYMENT_LABELS.kyu_infantil}
          value={formData.kyu_infantil_count}
          unitPrice={prices?.kyu_infantil ?? 0}
          onIncrement={() => incrementField('kyu_infantil_count')}
          onDecrement={() => decrementField('kyu_infantil_count')}
          disabled={isSubmitting}
        />

        <QuantityInput
          label={ANNUAL_PAYMENT_LABELS.dan}
          value={formData.dan_count}
          unitPrice={prices?.dan ?? 0}
          onIncrement={() => incrementField('dan_count')}
          onDecrement={() => decrementField('dan_count')}
          disabled={isSubmitting}
        />

        <QuantityInput
          label={ANNUAL_PAYMENT_LABELS.fukushidoin_shidoin}
          value={formData.fukushidoin_shidoin_count}
          unitPrice={prices?.fukushidoin_shidoin ?? 0}
          onIncrement={() => incrementField('fukushidoin_shidoin_count')}
          onDecrement={() => decrementField('fukushidoin_shidoin_count')}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};
