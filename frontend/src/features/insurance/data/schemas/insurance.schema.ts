export type InsuranceType = 'accident' | 'civil_liability';

export interface Insurance {
  id: string;
  member_id?: string;
  club_id?: string;
  member_name?: string;
  insurance_type: InsuranceType;
  policy_number: string;
  insurance_company: string;
  coverage_amount?: number;
  payment_id?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  documents?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInsuranceRequest {
  member_id?: string;
  club_id?: string;
  insurance_type: InsuranceType;
  policy_number: string;
  insurance_company: string;
  coverage_amount?: number;
  payment_id?: string;
  start_date: string;
  end_date: string;
}

export interface UpdateInsuranceRequest {
  insurance_type?: InsuranceType;
  policy_number?: string;
  insurance_company?: string;
  coverage_amount?: number;
  start_date?: string;
  end_date?: string;
  annulled?: boolean;
}

export interface InsuranceFilters {
  club_id?: string;
  member_id?: string;
  insurance_type?: InsuranceType;
  status?: 'active' | 'expired';
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface InsuranceListResponse {
  items: Insurance[];
  total: number;
  offset: number;
  limit: number;
}
