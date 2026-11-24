import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMemberStatusBoard } from '../../data/services/member-status.service';

export const memberStatusBoardKey = (paymentYear: number) => ['member-status-board', paymentYear] as const;

export const useMemberStatusBoardQuery = (paymentYear: number) =>
  useQuery({
    queryKey: memberStatusBoardKey(paymentYear),
    queryFn: () => getMemberStatusBoard(paymentYear),
    placeholderData: keepPreviousData,
  });
