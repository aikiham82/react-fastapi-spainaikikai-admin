import { apiClient } from '@/core/data/apiClient';
import type { DashboardData } from '../schemas/dashboard.schema';

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    return await apiClient.get<DashboardData>('/api/dashboard/stats');
  },
};
