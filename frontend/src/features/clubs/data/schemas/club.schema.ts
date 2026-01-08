export interface Club {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  website?: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface CreateClubRequest {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  website?: string;
}

export interface UpdateClubRequest extends Partial<CreateClubRequest> {}

export interface ClubFilters {
  search?: string;
  city?: string;
}
