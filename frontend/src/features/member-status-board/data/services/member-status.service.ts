import { apiClient } from '@/core/data/apiClient';
import { memberStatusBoardSchema, type MemberStatusRow } from '../schemas/member-status.schema';

export const getMemberStatusBoard = async (paymentYear: number): Promise<MemberStatusRow[]> =>
  memberStatusBoardSchema.parse(
    await apiClient.get<unknown>('/api/v1/members/status-board', { params: { payment_year: paymentYear } })
  );

export const exportMemberStatusBoard = (paymentYear: number): Promise<Blob> =>
  apiClient.get<Blob>('/api/v1/import-export/members/status-board/export', {
    params: { payment_year: paymentYear },
    responseType: 'blob',
  });
