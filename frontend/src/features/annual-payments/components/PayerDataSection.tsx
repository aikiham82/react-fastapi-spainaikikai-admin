import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Lock } from 'lucide-react';
import { useAnnualPaymentContext } from '../hooks/useAnnualPaymentContext';

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

export const PayerDataSection: React.FC = () => {
  const {
    formData,
    errors,
    setField,
    clubs,
    isLoadingClubs,
    isClubAdmin,
  } = useAnnualPaymentContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Datos del Pagador</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="payer_name">Nombre del Pagador *</Label>
          <Input
            id="payer_name"
            placeholder="Nombre completo"
            value={formData.payer_name}
            onChange={(e) => setField('payer_name', e.target.value)}
            className={errors.payer_name ? 'border-red-500' : ''}
          />
          {errors.payer_name && (
            <p className="text-sm text-red-500">{errors.payer_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="club_id">Club *</Label>
          <div className="relative">
            <SearchableSelect
              options={clubs.map((club) => ({ value: club.id, label: club.name }))}
              value={formData.club_id}
              onValueChange={(value) => setField('club_id', value)}
              disabled={isClubAdmin || isLoadingClubs}
              placeholder={isLoadingClubs ? 'Cargando...' : 'Seleccionar club'}
              searchPlaceholder="Buscar club..."
              emptyMessage="No se encontraron clubs."
              className={errors.club_id ? 'border-red-500' : ''}
            />
            {isClubAdmin && (
              <Lock className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            )}
          </div>
          {isClubAdmin && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Como administrador de club, solo puede pagar por su club asignado
            </p>
          )}
          {errors.club_id && (
            <p className="text-sm text-red-500">{errors.club_id}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_year">Año de Pago *</Label>
          <Select
            value={formData.payment_year.toString()}
            onValueChange={(value) => setField('payment_year', parseInt(value, 10))}
          >
            <SelectTrigger id="payment_year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
