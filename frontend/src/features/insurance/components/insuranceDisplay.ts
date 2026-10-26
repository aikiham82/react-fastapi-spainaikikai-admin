import type { Insurance } from '../data/schemas/insurance.schema';
import type { StatusTone } from '@/components/ui/status-badge';

export const INSURANCE_TYPE_LABELS: Record<string, string> = {
  accident: 'Accidentes',
  rc: 'Responsabilidad civil (RC)',
  civil_liability: 'Responsabilidad civil (RC)',
};

const EXPIRING_SOON_DAYS = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const insuranceTypeLabel = (type: string): string => INSURANCE_TYPE_LABELS[type] ?? type;

const isExpiringSoon = (endDate: string): boolean => {
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / MS_PER_DAY);
  return days >= 0 && days <= EXPIRING_SOON_DAYS;
};

export const insuranceStatus = (insurance: Insurance): { tone: StatusTone; label: string } => {
  switch (insurance.status) {
    case 'cancelled':
      return { tone: 'bad', label: 'Anulado' };
    case 'expired':
      return { tone: 'bad', label: 'Caducado' };
    case 'pending':
      return { tone: 'neutral', label: 'Pendiente' };
    default:
      return isExpiringSoon(insurance.end_date)
        ? { tone: 'warn', label: 'Caduca pronto' }
        : { tone: 'ok', label: 'Activo' };
  }
};
