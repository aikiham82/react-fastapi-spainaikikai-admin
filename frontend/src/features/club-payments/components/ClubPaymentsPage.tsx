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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { defaultPaymentYear, seasonLabel } from '@/core/utils/defaultPaymentYear';
import { Info } from 'lucide-react';

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

      {selectedYear < latestYear && selectedYear === today.getFullYear() && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Los seguros de la temporada {seasonLabel(latestYear)}, pagados desde octubre, están en {latestYear}.
            </span>
            <Button size="sm" variant="outline" onClick={() => setSelectedYear(latestYear)}>
              Ver {latestYear}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showingDetail ? <ClubPaymentDetail /> : <AllClubsSummaryTable />}
    </div>
  );
};
