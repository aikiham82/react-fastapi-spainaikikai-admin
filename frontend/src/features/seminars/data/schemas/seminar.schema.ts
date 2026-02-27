export interface Seminar {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  venue: string;
  address: string;
  city: string;
  province: string;
  start_date: string;
  end_date: string;
  max_participants?: number;
  current_participants: number;
  price: number;
  club_id?: string;
  association_id?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  cover_image_url?: string;
}

export interface CreateSeminarRequest {
  title: string;
  description: string;
  instructor_name: string;
  venue: string;
  address: string;
  city: string;
  province: string;
  start_date: string;
  end_date: string;
  max_participants?: number;
  price: number;
  club_id?: string;
  association_id?: string;
}

export interface UpdateSeminarRequest extends Partial<CreateSeminarRequest> {}

export interface SeminarFilters {
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  club_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface SeminarsListResponse {
  items: Seminar[];
  total: number;
  offset: number;
  limit: number;
}

export interface RegisterMemberRequest {
  seminar_id: string;
  member_id: string;
}
