import { KeyRound } from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { BeltBadge } from '@/components/ui/graphic';
import { cn } from '@/lib/utils';
import type { LicenseSummary, InsuranceSummary } from '../data/schemas/member.schema';
import { getMemberStatusLabel } from '../utils/member-badges';
import { insuranceStatus } from '@/features/insurance/components/insuranceDisplay';
import type { Insurance } from '@/features/insurance/data/schemas/insurance.schema';
import { licensePresentation } from '../utils/member-attention';

interface StatusPresentation {
  tone: StatusTone;
  label: string;
}

const NO_LICENSE: StatusPresentation = { tone: 'neutral', label: 'Sin licencia' };
const NO_INSURANCE: StatusPresentation = { tone: 'neutral', label: 'Sin seguro' };
const INSURANCE_STATUSES: readonly Insurance['status'][] = ['active', 'expired', 'pending', 'cancelled'];

const presentInsurance = (has: boolean, rawStatus: string | null | undefined): StatusPresentation => {
  const status = INSURANCE_STATUSES.find((value) => value === rawStatus);
  if (!has || !status) return NO_INSURANCE;
  return insuranceStatus({ status, end_date: '' });
};

interface MemberStatusBadgeProps {
  status?: string;
}

export function MemberStatusBadge({ status }: MemberStatusBadgeProps) {
  const label = getMemberStatusLabel(status);
  if (!label) return null;
  return <StatusBadge tone="neutral">{label}</StatusBadge>;
}

interface MemberAccessBadgeProps {
  hasAccount: boolean;
}

export function MemberAccessBadge({ hasAccount }: MemberAccessBadgeProps) {
  if (!hasAccount) return null;

  return (
    <StatusBadge tone="neutral" icon={KeyRound}>
      <span title="Este socio tiene cuenta para entrar en la aplicación">Acceso</span>
    </StatusBadge>
  );
}

interface GradeBadgeProps {
  licenseSummary?: LicenseSummary;
}

export function GradeBadge({ licenseSummary }: GradeBadgeProps) {
  return <BeltBadge grade={licenseSummary?.grade} title={licenseSummary?.instructor_category} />;
}

interface LicenseStatusBadgeProps {
  licenseSummary?: LicenseSummary;
}

export function LicenseStatusBadge({ licenseSummary }: LicenseStatusBadgeProps) {
  const { tone, label } = licensePresentation({ license_summary: licenseSummary }) ?? NO_LICENSE;
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

const TILE_TONES: Record<'ok' | 'bad', string> = {
  ok: 'bg-success-soft text-success',
  bad: 'bg-danger-soft text-danger',
};

interface InsuranceTileProps {
  code: 'AC' | 'RC';
  name: string;
  has: boolean;
  rawStatus: string | null | undefined;
}

function InsuranceTile({ code, name, has, rawStatus }: InsuranceTileProps) {
  const { tone, label } = presentInsurance(has, rawStatus);
  const ok = tone === 'ok';
  const spoken = `${name}: ${ok ? 'al día' : label.toLowerCase()}`;
  return (
    <span
      role="img"
      aria-label={spoken}
      title={spoken}
      data-tone={ok ? 'ok' : 'bad'}
      className={cn('inline-grid size-[30px] place-items-center rounded-lg text-[11px] font-bold', TILE_TONES[ok ? 'ok' : 'bad'])}
    >
      {code}
    </span>
  );
}

interface InsuranceTilesProps {
  insuranceSummary?: InsuranceSummary;
}

export function InsuranceTiles({ insuranceSummary }: InsuranceTilesProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <InsuranceTile
        code="AC"
        name="Seguro de accidentes"
        has={insuranceSummary?.has_accident ?? false}
        rawStatus={insuranceSummary?.accident_status}
      />
      <InsuranceTile
        code="RC"
        name="Seguro de responsabilidad civil"
        has={insuranceSummary?.has_rc ?? false}
        rawStatus={insuranceSummary?.rc_status}
      />
    </span>
  );
}
