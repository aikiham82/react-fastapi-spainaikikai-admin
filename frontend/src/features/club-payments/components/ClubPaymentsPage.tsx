import { useState } from 'react';
import { useClubPaymentsContext } from '../hooks/useClubPaymentsContext';
import { AllClubsSummaryTable } from './AllClubsSummaryTable';
import { ClubPaymentDetail } from './ClubPaymentDetail';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';
import { defaultPaymentYear, seasonLabel } from '@/core/utils/defaultPaymentYear';

export const ClubPaymentsPage = () => {
  const { showingDetail, selectedYear, setSelectedYear } = useClubPaymentsContext();
  const [pickingYear, setPickingYear] = useState(false);

  const today = new Date();
  const latestYear = defaultPaymentYear(today);
  const oldestYear = today.getFullYear() - 4;
  const years = Array.from({ length: latestYear - oldestYear + 1 }, (_, i) => latestYear - i);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <p>
          Pagos del año {selectedYear} · seguros {seasonLabel(selectedYear)}
        </p>
        {pickingYear ? (
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="h-11 w-32" aria-label="Año">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setPickingYear(true)}>
            Otro año
          </Button>
        )}
      </div>

      {selectedYear === today.getFullYear() && latestYear > selectedYear && (
        <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-foreground">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            Los pagos hechos desde octubre cuentan para {latestYear}.
            <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setSelectedYear(latestYear)}>
              Ver {latestYear}
            </Button>
          </p>
        </div>
      )}

      {showingDetail ? <ClubPaymentDetail /> : <AllClubsSummaryTable />}
    </div>
  );
};
