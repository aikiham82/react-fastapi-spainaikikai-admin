export interface LicenseSummary {
  grade: string | null;
  technical_grade: string | null;
  instructor_category: string | null;
  status: string | null;
  expiration_date: string | null;
}

export interface InsuranceSummary {
  has_accident: boolean;
  accident_status: string | null;
  has_rc: boolean;
  rc_status: string | null;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  license_number?: string;
  license_status: 'active' | 'expired' | 'pending';
  club_id: string;
  club_name?: string;
  created_at: string;
  updated_at: string;
  license_summary?: LicenseSummary;
  insurance_summary?: InsuranceSummary;
}

export interface CreateMemberRequest {
  first_name: string;
  email: string;
  last_name?: string;
  dni?: string;
  phone?: string;
  birth_date?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  club_id?: string;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> { }

export interface ChangeMemberStatusRequest {
  status: 'active' | 'inactive';
}

export interface MemberFilters {
  search?: string;
  club_id?: string;
  status?: string;
  license_status?: 'active' | 'expired' | 'pending';
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface MembersListResponse {
  items: Member[];
  total: number;
  offset: number;
  limit: number;
}
