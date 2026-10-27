import type { Member } from '../data/schemas/member.schema';
import { getStatusPresentation } from '@/features/licenses/utils/licenseStatus';
import type { License } from '@/features/licenses/data/schemas/license.schema';
import { insuranceStatus } from '@/features/insurance/components/insuranceDisplay';
import type { Insurance } from '@/features/insurance/data/schemas/insurance.schema';

export type MemberChip = 'all' | 'expired' | 'expiring' | 'uninsured';

const LICENSE_STATUSES: readonly License['status'][] = ['active', 'expired', 'pending', 'revoked'];
const INSURANCE_STATUSES: readonly Insurance['status'][] = ['active', 'expired', 'pending', 'cancelled'];

export const licensePresentation = (member: Pick<Member, 'license_summary'>) => {
  const summary = member.license_summary;
  const status = LICENSE_STATUSES.find((value) => value === summary?.status);
  if (!status) return null;
  return getStatusPresentation({ status, expiry_date: summary?.expiration_date ?? '' });
};

export const insurancePresentation = (has: boolean, rawStatus: string | null | undefined) => {
  const status = INSURANCE_STATUSES.find((value) => value === rawStatus);
  return has && status ? insuranceStatus({ status, end_date: '' }) : null;
};

export const isInsuranceInOrder = (has: boolean, rawStatus: string | null | undefined): boolean =>
  insurancePresentation(has, rawStatus)?.tone === 'ok';

export const matchesMemberChip = (member: Member, chip: MemberChip): boolean => {
  if (chip === 'all') return true;
  if (chip === 'uninsured') {
    const summary = member.insurance_summary;
    return !(
      isInsuranceInOrder(summary?.has_accident ?? false, summary?.accident_status) &&
      isInsuranceInOrder(summary?.has_rc ?? false, summary?.rc_status)
    );
  }
  const tone = licensePresentation(member)?.tone;
  return chip === 'expired' ? tone === 'bad' : tone === 'warn';
};

export const countMemberChips = (members: Member[]): Record<MemberChip, number> => ({
  all: members.length,
  expired: members.filter((member) => matchesMemberChip(member, 'expired')).length,
  expiring: members.filter((member) => matchesMemberChip(member, 'expiring')).length,
  uninsured: members.filter((member) => matchesMemberChip(member, 'uninsured')).length,
});
