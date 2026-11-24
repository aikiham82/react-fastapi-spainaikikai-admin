import type { InsuranceSummary, LicenseSummary } from '@/features/members/data/schemas/member.schema';

export interface MemberStatusRow {
  member_id: string;
  first_name: string;
  last_name: string;
  club_id?: string | null;
  club_name?: string | null;
  member_status: string;
  license_summary?: LicenseSummary | null;
  insurance_summary?: InsuranceSummary | null;
  license_paid: boolean;
  license_payment_id?: string | null;
}
