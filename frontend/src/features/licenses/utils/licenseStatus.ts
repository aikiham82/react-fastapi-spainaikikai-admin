import type { License } from '../data/schemas/license.schema';

export type LicenseUrgency = 'expired' | 'expiring' | 'other';
export type LicenseChip = 'all' | 'expired' | 'expiring';
export type StatusTone = 'ok' | 'warn' | 'bad' | 'neutral';

export const EXPIRING_SOON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const daysUntil = (expiryDate: string, now: Date = new Date()): number =>
  Math.round((startOfDay(new Date(expiryDate)).getTime() - startOfDay(now).getTime()) / DAY_MS);

export const getUrgency = (license: License, now: Date = new Date()): LicenseUrgency => {
  if (license.status === 'expired') return 'expired';
  if (license.status !== 'active' || !license.expiry_date) return 'other';
  const days = daysUntil(license.expiry_date, now);
  if (days < 0) return 'expired';
  return days <= EXPIRING_SOON_DAYS ? 'expiring' : 'other';
};

export const getStatusPresentation = (
  license: License,
  now: Date = new Date(),
): { tone: StatusTone; label: string } => {
  const urgency = getUrgency(license, now);
  if (urgency === 'expired') return { tone: 'bad', label: 'Caducada' };
  if (urgency === 'expiring') return { tone: 'warn', label: 'Caduca pronto' };
  if (license.status === 'active') return { tone: 'ok', label: 'Activa' };
  if (license.status === 'revoked') return { tone: 'neutral', label: 'Anulada' };
  return { tone: 'neutral', label: 'Pendiente' };
};

const URGENCY_RANK: Record<LicenseUrgency, number> = { expired: 0, expiring: 1, other: 2 };

export const sortByUrgency = (licenses: License[], now: Date = new Date()): License[] =>
  licenses
    .map((license, index) => ({ license, index, urgency: getUrgency(license, now) }))
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.index - b.index)
    .map(({ license }) => license);

export const ESTADO_PARAM_TO_CHIP: Record<string, LicenseChip> = {
  caducadas: 'expired',
  'caducan-pronto': 'expiring',
};

export const CHIP_TO_ESTADO_PARAM: Partial<Record<LicenseChip, string>> = {
  expired: 'caducadas',
  expiring: 'caducan-pronto',
};
