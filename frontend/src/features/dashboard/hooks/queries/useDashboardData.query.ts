import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../data/services/dashboard.service';

export const useDashboardDataQuery = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};
