import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { AllClubsSummaryTable } from './AllClubsSummaryTable';
import { ClubPaymentDetail } from './ClubPaymentDetail';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { defaultPaymentYear } from '@/core/utils/defaultPaymentYear';

export const ClubPaymentsPage = () => {
  const { showingDetail, selectedYear, setSelectedYear } = useClubPaymentsContext();

  const today = new Date();
  const latestYear = defaultPaymentYear(today);
  const oldestYear = today.getFullYear() - 4;
  const years = Array.from({ length: latestYear - oldestYear + 1 }, (_, i) => latestYear - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {showingDetail ? 'Detalle de Pagos' : 'Resumen de Pagos por Club'}
        </h2>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showingDetail ? <ClubPaymentDetail /> : <AllClubsSummaryTable />}
    </div>
  );
};
