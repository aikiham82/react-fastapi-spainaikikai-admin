import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/core/utils/format';
import { insuranceSeasonYear, seasonLabel } from '@/core/utils/defaultPaymentYear';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

const seasonText = (paymentYear: number, today: Date): string => {
  const season = insuranceSeasonYear(today);
  const from = formatDate(new Date(season - 1, 9, 1));
  const to = formatDate(new Date(season, 8, 30));
  return `Temporada ${seasonLabel(season)} · licencias del año ${paymentYear} y seguros del ${from} al ${to}`;
};

export const PaymentSetup = () => {
  const { formData, errors, setField, clubs, isLoadingClubs, isClubAdmin } = useAnnualPaymentContext();
  const [showYear, setShowYear] = useState(false);
  const today = new Date();
  const year = today.getFullYear();
  const yearOptions = [year - 1, year, year + 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
          {errors.payer_name && <p className="text-sm text-danger">{errors.payer_name}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <p>{seasonText(formData.payment_year, today)}</p>
        {!showYear && (
          <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setShowYear(true)}>
            Otro año
          </Button>
        )}
      </div>

      {showYear && (
        <div className="grid max-w-48 gap-1.5">
          <Label htmlFor="payment_year">Año de las licencias</Label>
          <Select value={String(formData.payment_year)} onValueChange={(v) => setField('payment_year', Number(v))}>
            <SelectTrigger id="payment_year" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
