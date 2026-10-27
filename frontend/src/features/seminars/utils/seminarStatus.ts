import { CalendarClock, CircleCheck, CirclePlay, CircleX, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/components/ui/status-badge';
import type { Seminar } from '../data/schemas/seminar.schema';
import { isSeminarPast } from './seminarDates';

export const STATUS_LABELS: Record<Seminar['status'], string> = {
  upcoming: 'Próximo',
  ongoing: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export const displayStatus = (seminar: Seminar, now: Date = new Date()): Seminar['status'] =>
  seminar.status === 'upcoming' && isSeminarPast(seminar, now) ? 'completed' : seminar.status;

export const STATUS_TONES: Record<Seminar['status'], StatusTone> = {
  upcoming: 'neutral',
  ongoing: 'ok',
  completed: 'neutral',
  cancelled: 'bad',
};

export const STATUS_ICONS: Record<Seminar['status'], LucideIcon> = {
  upcoming: CalendarClock,
  ongoing: CirclePlay,
  completed: CircleCheck,
  cancelled: CircleX,
};

const NEARLY_FULL_RATIO = 0.8;

export const seatsTone = (taken: number, max: number): StatusTone => {
  if (taken >= max) return 'bad';
  return taken / max >= NEARLY_FULL_RATIO ? 'warn' : 'ok';
};
