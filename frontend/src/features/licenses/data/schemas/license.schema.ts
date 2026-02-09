export interface License {
  id: string;
  license_number: string;
  member_id: string;
  member_name?: string;
  club_id: string;
  issue_date: string;
  expiry_date: string;
  status: 'active' | 'expired' | 'pending';
  dan_grade: number;
  technical_grade: 'dan' | 'kyu';
  instructor_category: 'none' | 'fukushidoin' | 'shidoin';
  created_at: string;
  updated_at: string;
}

export interface CreateLicenseRequest {
  member_id: string;
  issue_date: string;
  expiry_date: string;
  dan_grade: number;
  technical_grade?: 'dan' | 'kyu';
}

export interface UpdateLicenseRequest extends Partial<CreateLicenseRequest> {}

export interface LicenseFilters {
  search?: string;
  member_id?: string;
  club_id?: string;
  status?: 'active' | 'expired' | 'pending';
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
