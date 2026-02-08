import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldX } from 'lucide-react';
import type { LicenseSummary, InsuranceSummary } from '../data/schemas/member.schema';
import {
  formatGrade,
  formatInstructorCategory,
  getInstructorBadgeVariant,
  getLicenseStatusVariant,
  getLicenseStatusLabel,
  getInsuranceStatusVariant,
  getInsuranceStatusLabel,
  getMemberStatusLabel,
  getMemberStatusVariant,
} from '../utils/member-badges';

interface MemberStatusBadgeProps {
  status?: string;
}

export function MemberStatusBadge({ status }: MemberStatusBadgeProps) {
  const label = getMemberStatusLabel(status);
  if (!label) return null;
  return (
    <Badge variant={getMemberStatusVariant(status)}>
      {label}
    </Badge>
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
    <div className="flex items-center gap-1 flex-wrap">
      <Badge variant={licenseSummary?.grade ? 'default' : 'secondary'}>
        {grade}
      </Badge>
      {!compact && instructor && (
        <Badge variant={getInstructorBadgeVariant(licenseSummary?.instructor_category)}>
          {instructor}
        </Badge>
      )}
    </div>
  );
}

interface LicenseStatusBadgeProps {
  licenseSummary?: LicenseSummary;
}

export function LicenseStatusBadge({ licenseSummary }: LicenseStatusBadgeProps) {
  const status = licenseSummary?.status;
  return (
    <Badge variant={getLicenseStatusVariant(status)}>
      {getLicenseStatusLabel(status)}
    </Badge>
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

  const variant = getInsuranceStatusVariant(has, status);
  const label = getInsuranceStatusLabel(has, status);

  const Icon = !has ? Shield : status === 'active' ? ShieldCheck : ShieldX;

  return (
    <Badge variant={variant}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}
