import type { StatusTone } from '@/components/ui/status-badge';
import type { Seminar } from '../data/schemas/seminar.schema';

export const STATUS_LABELS: Record<Seminar['status'], string> = {
  upcoming: 'Próximo',
  ongoing: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export const STATUS_TONES: Record<Seminar['status'], StatusTone> = {
  upcoming: 'neutral',
  ongoing: 'ok',
  completed: 'neutral',
  cancelled: 'bad',
};
