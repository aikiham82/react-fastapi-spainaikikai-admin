import { StatusBadge } from '@/components/ui/status-badge';
import type { LicenseSummary, InsuranceSummary } from '../data/schemas/member.schema';
import {
  formatGrade,
  formatInstructorCategory,
  getMemberStatusLabel,
} from '../utils/member-badges';
import { getStatusPresentation } from '@/features/licenses/utils/licenseStatus';
import { insuranceStatus } from '@/features/insurance/components/insuranceDisplay';
import type { Insurance } from '@/features/insurance/data/schemas/insurance.schema';
import type { License } from '@/features/licenses/data/schemas/license.schema';

type StatusPresentation = ReturnType<typeof getStatusPresentation>;

const NO_LICENSE: StatusPresentation = { tone: 'neutral', label: 'Sin licencia' };
const NO_INSURANCE: StatusPresentation = { tone: 'neutral', label: 'Sin seguro' };
const LICENSE_STATUSES: readonly License['status'][] = ['active', 'expired', 'pending', 'revoked'];
const INSURANCE_STATUSES: readonly Insurance['status'][] = ['active', 'expired', 'pending', 'cancelled'];

const presentLicense = (summary?: LicenseSummary): StatusPresentation => {
  const status = LICENSE_STATUSES.find((value) => value === summary?.status);
  if (!status) return NO_LICENSE;
  return getStatusPresentation({ status, expiry_date: summary?.expiration_date ?? '' });
};

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
  const { tone, label } = presentLicense(licenseSummary);
  return (
    <StatusBadge tone={tone}>
      {labelled ? `Licencia: ${label}` : label}
    </StatusBadge>
  );
}

interface InsuranceStatusBadgeProps {
  insuranceSummary?: InsuranceSummary;
  type: 'rc' | 'accident';
}

export function InsuranceStatusBadge({ insuranceSummary, type }: InsuranceStatusBadgeProps) {
  const has = type === 'rc'
    ? insuranceSummary?.has_rc ?? false
    : insuranceSummary?.has_accident ?? false;
  const status = type === 'rc'
    ? insuranceSummary?.rc_status
    : insuranceSummary?.accident_status;

  const prefix = type === 'rc' ? 'Resp. civil' : 'Accidentes';

  const { tone, label } = presentInsurance(has, status);

  return (
    <StatusBadge tone={tone}>
      {`${prefix}: ${label}`}
    </StatusBadge>
  );
}

const insuranceIsOk = (has: boolean, rawStatus: string | null | undefined): boolean =>
  presentInsurance(has, rawStatus).tone === 'ok';

interface InsuranceAttentionBadgesProps {
  insuranceSummary?: InsuranceSummary;
}

export function InsuranceAttentionBadges({ insuranceSummary }: InsuranceAttentionBadgesProps) {
  const rcOk = insuranceIsOk(insuranceSummary?.has_rc ?? false, insuranceSummary?.rc_status);
  const accidentOk = insuranceIsOk(insuranceSummary?.has_accident ?? false, insuranceSummary?.accident_status);

  if (rcOk && accidentOk) return <StatusBadge tone="ok">Seguros al día</StatusBadge>;

  return (
    <>
      {!rcOk && <InsuranceStatusBadge insuranceSummary={insuranceSummary} type="rc" />}
      {!accidentOk && <InsuranceStatusBadge insuranceSummary={insuranceSummary} type="accident" />}
    </>
  );
}
