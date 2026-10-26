import type { Insurance } from '../data/schemas/insurance.schema';
import type { StatusTone } from '@/components/ui/status-badge';
import { isExpiringSoon } from '@/core/utils/expiry';

export const INSURANCE_TYPE_LABELS: Record<string, string> = {
  accident: 'Accidentes',
  rc: 'Responsabilidad civil (RC)',
  civil_liability: 'Responsabilidad civil (RC)',
};

export const insuranceTypeLabel = (type: string): string => INSURANCE_TYPE_LABELS[type] ?? type;

export const insuranceStatus = (insurance: Pick<Insurance, 'status' | 'end_date'>): { tone: StatusTone; label: string } => {
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
