export interface AuthUser {
  email?: string;
}

export type GlobalRole = 'super_admin' | 'user';
export type ClubRole = 'admin' | 'member';
export type UserRole = 'super_admin' | 'club_admin' | null;

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  global_role: GlobalRole;
  member_id?: string;
  club_role?: ClubRole;
  club_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
