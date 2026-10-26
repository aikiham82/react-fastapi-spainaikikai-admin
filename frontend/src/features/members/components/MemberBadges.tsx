import { StatusBadge } from '@/components/ui/status-badge';
import type { LicenseSummary, InsuranceSummary } from '../data/schemas/member.schema';
import {
  formatGrade,
  formatInstructorCategory,
  getLicenseStatusTone,
  getLicenseStatusLabel,
  getInsuranceStatusTone,
  getInsuranceStatusLabel,
  getMemberStatusLabel,
} from '../utils/member-badges';

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
    <span
      className="inline-flex whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[13px] font-medium text-muted-foreground"
      title="Este socio tiene cuenta para entrar en la aplicación"
    >
      Acceso
    </span>
  );
}

interface GradeBadgeProps {
  licenseSummary?: LicenseSummary;
  compact?: boolean;
}

export function GradeBadge({ licenseSummary, compact = false }: GradeBadgeProps) {
  const grade = formatGrade(licenseSummary?.grade);
  const instructor = formatInstructorCategory(licenseSummary?.instructor_category);

  return (
    <span className={licenseSummary?.grade ? 'text-foreground' : 'text-muted-foreground'}>
      {grade}
      {!compact && instructor && <span className="text-muted-foreground">{` · ${instructor}`}</span>}
    </span>
  );
}

interface LicenseStatusBadgeProps {
  licenseSummary?: LicenseSummary;
  labelled?: boolean;
}

export function LicenseStatusBadge({ licenseSummary, labelled = false }: LicenseStatusBadgeProps) {
  const status = licenseSummary?.status;
  const label = getLicenseStatusLabel(status);
  return (
    <StatusBadge tone={getLicenseStatusTone(status)}>
      {labelled ? `Licencia: ${label}` : label}
    </StatusBadge>
  );
}

interface InsuranceStatusBadgeProps {
  insuranceSummary?: InsuranceSummary;
  type: 'rc' | 'accident';
  compact?: boolean;
}

export function InsuranceStatusBadge({ insuranceSummary, type, compact = false }: InsuranceStatusBadgeProps) {
  const has = type === 'rc'
    ? insuranceSummary?.has_rc ?? false
    : insuranceSummary?.has_accident ?? false;
  const status = type === 'rc'
    ? insuranceSummary?.rc_status
    : insuranceSummary?.accident_status;

  const prefix = type === 'rc' ? 'RC' : compact ? 'Acc.' : 'Accidentes';

  return (
    <StatusBadge tone={getInsuranceStatusTone(has, status)}>
      {`${prefix}: ${getInsuranceStatusLabel(has, status)}`}
    </StatusBadge>
  );
}
