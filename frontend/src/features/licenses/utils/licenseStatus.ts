import type { License } from '../data/schemas/license.schema';
import { Ban, type LucideIcon } from 'lucide-react';
import type { StatusTone } from '@/components/ui/status-badge';
import { daysUntil, EXPIRING_SOON_DAYS } from '@/core/utils/expiry';

export type LicenseUrgency = 'expired' | 'expiring' | 'other';
export type LicenseChip = 'all' | 'expired' | 'expiring';

type LicenseState = Pick<License, 'status' | 'expiry_date' | 'member_status'>;

const isDeregistered = (license: LicenseState): boolean => license.member_status === 'inactive';

export const getUrgency = (license: LicenseState, now: Date = new Date()): LicenseUrgency => {
  if (isDeregistered(license)) return 'other';
  if (license.status === 'expired') return 'expired';
  if (license.status !== 'active' || !license.expiry_date) return 'other';
  const days = daysUntil(license.expiry_date, now);
  if (days < 0) return 'expired';
  return days <= EXPIRING_SOON_DAYS ? 'expiring' : 'other';
};

export const getStatusPresentation = (
  license: LicenseState,
  now: Date = new Date(),
): { tone: StatusTone; label: string; icon?: LucideIcon } => {
  if (isDeregistered(license)) return { tone: 'neutral', label: 'De baja', icon: Ban };
  const urgency = getUrgency(license, now);
  if (urgency === 'expired') return { tone: 'bad', label: 'Caducada' };
  if (urgency === 'expiring') return { tone: 'warn', label: 'Caduca pronto' };
  if (license.status === 'active') return { tone: 'ok', label: 'Activa' };
  if (license.status === 'revoked') return { tone: 'neutral', label: 'Anulada' };
  return { tone: 'neutral', label: 'Pendiente' };
};

const URGENCY_RANK: Record<LicenseUrgency, number> = { expired: 0, expiring: 1, other: 2 };
const DEREGISTERED_RANK = 3;

const rankOf = (license: License, now: Date): number =>
  isDeregistered(license) ? DEREGISTERED_RANK : URGENCY_RANK[getUrgency(license, now)];

export const sortByUrgency = (licenses: License[], now: Date = new Date()): License[] =>
  licenses
    .map((license, index) => ({ license, index, rank: rankOf(license, now) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ license }) => license);

export const ESTADO_PARAM_TO_CHIP: Record<string, LicenseChip> = {
  caducadas: 'expired',
  'caducan-pronto': 'expiring',
};

export const CHIP_TO_ESTADO_PARAM: Partial<Record<LicenseChip, string>> = {
  expired: 'caducadas',
  expiring: 'caducan-pronto',
};
