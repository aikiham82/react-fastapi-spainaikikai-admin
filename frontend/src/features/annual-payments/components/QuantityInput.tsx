import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { QUANTITY_LIMITS } from '../data/schemas/annual-payment.schema';

interface QuantityInputProps {
  label: string;
  value: number;
  unitPrice: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
  maxValue?: number;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  label,
  value,
  unitPrice,
  onIncrement,
  onDecrement,
  disabled = false,
  maxValue = QUANTITY_LIMITS.max_per_item,
}) => {
  const total = value * unitPrice;
  const isAtMax = value >= maxValue;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{unitPrice.toFixed(2)}€ / unidad</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onDecrement}
            disabled={disabled || value === 0}
            aria-label={`Disminuir ${label}`}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <span
            className="w-8 text-center font-medium text-slate-900"
            aria-live="polite"
            aria-atomic="true"
          >
            {value}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onIncrement}
            disabled={disabled || isAtMax}
            aria-label={`Aumentar ${label}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-20 text-right">
          <span className="font-medium text-slate-900">{total.toFixed(2)}€</span>
        </div>
      </div>
    </div>
  );
};
