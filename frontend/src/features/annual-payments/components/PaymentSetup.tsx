import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextButton } from '@/components/ui/text-link';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/core/utils/format';
import { insuranceSeasonYear, seasonLabel } from '@/core/utils/defaultPaymentYear';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

const seasonText = (paymentYear: number, today: Date): string => {
  const season = insuranceSeasonYear(today);
  const from = formatDate(new Date(season - 1, 9, 1));
  const to = formatDate(new Date(season, 8, 30));
  return `Temporada ${seasonLabel(paymentYear)} · licencias del año ${paymentYear} y seguros del ${from} al ${to}`;
};

export const PaymentSetup = () => {
  const { formData, errors, setField, clubs, isLoadingClubs, isClubAdmin } = useAnnualPaymentContext();
  const [showYear, setShowYear] = useState(false);
  const today = new Date();
  const year = today.getFullYear();
  const yearOptions = [year - 1, year, year + 1];

  return (
    <div className="flex flex-col gap-4 rounded-[18px] bg-card p-4 shadow-card sm:p-5">
      <div className="grid items-start gap-4 sm:grid-cols-2">
        {!isClubAdmin && (
          <div className="grid gap-1.5">
            <Label htmlFor="club_id">Club</Label>
            <SearchableSelect
              id="club_id"
              className="h-11"
              options={clubs.map((club) => ({ value: club.id, label: club.name }))}
              value={formData.club_id}
              onValueChange={(value) => setField('club_id', value)}
              disabled={isLoadingClubs}
              placeholder={isLoadingClubs ? 'Cargando...' : 'Elige un club'}
              searchPlaceholder="Buscar club..."
              emptyMessage="No se encontraron clubs."
            />
            {errors.club_id && <p className="text-sm text-danger">{errors.club_id}</p>}
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="payer_name">Nombre de quien paga</Label>
          <Input
            id="payer_name"
            value={formData.payer_name}
            onChange={(e) => setField('payer_name', e.target.value)}
            aria-invalid={!!errors.payer_name}
            className="h-11"
          />
          <p className="text-sm text-muted-foreground">Así aparecerá en la factura.</p>
          {errors.payer_name && <p className="text-sm text-danger">{errors.payer_name}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <p className="flex items-start gap-1.5">
          <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {seasonText(formData.payment_year, today)}
        </p>
        {!showYear && (
          <TextButton variant="inline" onClick={() => setShowYear(true)}>
            Otra temporada
          </TextButton>
        )}
      </div>

      {showYear && (
        <div className="grid max-w-48 gap-1.5">
          <Label htmlFor="payment_year">Temporada</Label>
          <Select value={String(formData.payment_year)} onValueChange={(v) => setField('payment_year', Number(v))}>
            <SelectTrigger id="payment_year" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {seasonLabel(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
