export interface DashboardStats {
  total_clubs: number;
  total_members: number;
  active_members: number;
  clubs_paid: number;
  clubs_pending: number;
  upcoming_seminars: number;
  expired_licenses: number;
}

export interface ExpiringLicense {
  id: string;
  member_name: string;
  license_number: string;
  expiry_date: string;
  days_remaining: number;
}

export interface UpcomingSeminar {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  max_participants: number;
  price: number;
}

export interface RecentActivity {
  id: string;
  type: 'member' | 'payment' | 'license' | 'seminar';
  message: string;
  user: string;
  time: string;
}

export interface DashboardData {
  stats: DashboardStats;
  expiring_licenses: ExpiringLicense[];
  upcoming_seminars: UpcomingSeminar[];
  recent_activity: RecentActivity[];
}
