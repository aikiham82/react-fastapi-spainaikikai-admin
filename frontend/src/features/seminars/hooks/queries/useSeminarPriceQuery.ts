import { useQuery } from '@tanstack/react-query';
import { seminarService } from '../../data/services/seminar.service';

export const useSeminarOfficialidadPriceQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: ['seminar-oficialidad-price'],
    queryFn: () => seminarService.getSeminarOficialidadPrice(),
    enabled,
    retry: false,
  });
};
