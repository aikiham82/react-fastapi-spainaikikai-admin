export interface ImportMembersRequest {
  members: Array<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    address: string;
    city: string;
    postal_code: string;
  }>;
}

export interface ImportMembersResponse {
  success: boolean;
  imported: number;
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
