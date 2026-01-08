export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  postal_code: string;
  license_number?: string;
  license_status: 'active' | 'expired' | 'pending';
  club_id: string;
  club_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMemberRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  city: string;
  postal_code: string;
  club_id: string;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {}

export interface MemberFilters {
  search?: string;
  club_id?: string;
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
