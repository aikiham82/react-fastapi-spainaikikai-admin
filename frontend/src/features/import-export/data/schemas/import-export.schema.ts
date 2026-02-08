export interface ImportMembersRequest {
  members: Array<Record<string, unknown>>;
  mode?: 'create' | 'upsert';
}

export interface ImportMembersResponse {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: string[];
}

export interface ExportMembersFilters {
  club_id?: string;
  license_status?: string;
  date_from?: string;
  date_to?: string;
}

export interface ExportDataResponse {
  data: any[];
  filename: string;
}

// License import/export
export interface ImportLicensesRequest {
  licenses: Array<Record<string, unknown>>;
}

export interface ExportLicensesFilters {
  club_id?: string;
  status?: string;
  technical_grade?: string;
  age_category?: string;
}

// Insurance import/export
export interface ImportInsurancesRequest {
  insurances: Array<Record<string, unknown>>;
}

export interface ExportInsurancesFilters {
  club_id?: string;
  status?: string;
  insurance_type?: string;
}
