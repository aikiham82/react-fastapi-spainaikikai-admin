import { KeyRound } from 'lucide-react';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { BeltBadge } from '@/components/ui/graphic';
import { cn } from '@/lib/utils';
import type { LicenseSummary, InsuranceSummary } from '../data/schemas/member.schema';
import { getMemberStatusLabel } from '../utils/member-badges';
import { insurancePresentation, licensePresentation } from '../utils/member-attention';

interface StatusPresentation {
  tone: StatusTone;
  label: string;
}

const NO_LICENSE: StatusPresentation = { tone: 'neutral', label: 'Sin licencia' };
const NO_INSURANCE: StatusPresentation = { tone: 'neutral', label: 'Sin seguro' };

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

const TILE_TONES: Record<StatusTone, string> = {
  ok: 'bg-success-soft text-success',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-muted-foreground',
};

interface InsuranceTileProps {
  code: 'AC' | 'RC';
  name: string;
  has: boolean;
  rawStatus: string | null | undefined;
}

function InsuranceTile({ code, name, has, rawStatus }: InsuranceTileProps) {
  const presentation = insurancePresentation(has, rawStatus);
  const { label } = presentation ?? NO_INSURANCE;
  const tone = presentation?.tone ?? 'bad';
  const spoken = `${name}: ${tone === 'ok' ? 'al día' : label.toLowerCase()}`;
  return (
    <span
      role="img"
      aria-label={spoken}
      title={spoken}
      data-tone={tone}
      className={cn('inline-grid size-[30px] place-items-center rounded-lg text-[11px] font-bold', TILE_TONES[tone])}
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
