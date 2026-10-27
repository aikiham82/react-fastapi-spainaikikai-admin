import type { Seminar } from '../data/schemas/seminar.schema';
import { parseUtcDateTime } from '@/core/utils/format';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const isSeminarPast = (seminar: Seminar, now: Date = new Date()): boolean => {
  if (seminar.status === 'completed' || seminar.status === 'cancelled') return true;
  if (seminar.status === 'ongoing') return false;
  const end = parseUtcDateTime(seminar.end_date || seminar.start_date);
  if (!end) return false;
  const endOfLastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
  return endOfLastDay.getTime() <= now.getTime();
};

export const canRequestOficialidad = (seminar: Seminar, now: Date = new Date()): boolean =>
  !seminar.is_official && !isSeminarPast(seminar, now);

export const splitSeminars = (seminars: Seminar[], now: Date = new Date()) => {
  const byStart = (a: Seminar, b: Seminar) => (parseUtcDateTime(a.start_date)?.getTime() ?? Infinity) - (parseUtcDateTime(b.start_date)?.getTime() ?? Infinity);
  const upcoming = seminars.filter((s) => !isSeminarPast(s, now)).sort(byStart);
  const past = seminars.filter((s) => isSeminarPast(s, now)).sort((a, b) => byStart(b, a));
  return { upcoming, past };
};

export const dateBlock = (iso: string) => {
  const date = parseUtcDateTime(iso);
  if (!date) return { day: '-', month: '' };
  return { day: String(date.getDate()), month: MONTHS[date.getMonth()] };
};

export const startTimeLabel = (iso: string): string | null => {
  const date = parseUtcDateTime(iso);
  if (!date) return null;
  if (date.getHours() === 0 && date.getMinutes() === 0) return null;
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};
