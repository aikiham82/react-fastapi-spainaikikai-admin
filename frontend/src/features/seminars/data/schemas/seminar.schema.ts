export interface Seminar {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  max_participants?: number;
  current_participants: number;
  price: number;
  instructor?: string;
  image_url?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateSeminarRequest {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  max_participants?: number;
  price: number;
  instructor?: string;
  image_url?: string;
}

export interface UpdateSeminarRequest extends Partial<CreateSeminarRequest> {}

export interface SeminarFilters {
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
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
