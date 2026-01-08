export interface Insurance {
  id: string;
  member_id: string;
  member_name?: string;
  insurance_type: 'accident' | 'rc';
  policy_number: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired';
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateInsuranceRequest {
  member_id: string;
  insurance_type: 'accident' | 'rc';
  policy_number: string;
  start_date: string;
  end_date: string;
  amount: number;
}

export interface UpdateInsuranceRequest extends Partial<CreateInsuranceRequest> {}

export interface InsuranceFilters {
  member_id?: string;
  insurance_type?: 'accident' | 'rc';
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
