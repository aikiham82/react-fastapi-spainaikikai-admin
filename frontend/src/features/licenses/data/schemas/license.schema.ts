export type TechnicalGrade = 'dan' | 'kyu';
export type InstructorCategory = 'none' | 'fukushidoin' | 'shidoin';
export type AgeCategory = 'infantil' | 'adulto';

export interface License {
  id: string;
  license_number: string;
  member_id: string;
  member_name?: string;
  member_status?: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'pending' | 'revoked';
  dan_grade: number;
  technical_grade: TechnicalGrade;
  instructor_category: InstructorCategory;
  age_category: AgeCategory;
  created_at: string;
  updated_at: string;
}

export interface CreateLicenseRequest {
  member_id: string;
  issue_date: string;
  expiry_date: string;
  dan_grade: number;
  technical_grade?: TechnicalGrade;
  instructor_category?: InstructorCategory;
  age_category?: AgeCategory;
}

export interface UpdateLicenseRequest {
  issue_date?: string;
  expiration_date?: string;
  grade?: string;
  technical_grade?: TechnicalGrade;
  instructor_category?: InstructorCategory;
  age_category?: AgeCategory;
  annulled?: boolean;
}

export interface LicenseFilters {
  search?: string;
  member_id?: string;
  club_id?: string;
  status?: 'active' | 'expired' | 'pending' | 'revoked';
  expiring_soon?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface LicensesListResponse {
  items: License[];
  total: number;
  offset: number;
  limit: number;
}
