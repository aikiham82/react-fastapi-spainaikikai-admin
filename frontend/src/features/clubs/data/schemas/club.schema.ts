export interface Club {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string;
  email?: string;

  website?: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

export interface CreateClubRequest {
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string;
  email?: string;

  website?: string;
}

export type UpdateClubRequest = Partial<CreateClubRequest>

export interface DeregisteredClub {
  members: number;
  accounts: number;
}

export interface ClubFilters {
  search?: string;
  city?: string;
}
