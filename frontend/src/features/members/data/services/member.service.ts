import { apiClient } from '@/core/data/apiClient';
import type { Member, CreateMemberRequest, UpdateMemberRequest, MemberFilters, MembersListResponse } from './member.schema';

const BASE_URL = '/api/v1/members';

export const getMembers = async (filters?: MemberFilters): Promise<MembersListResponse> => {
  return await apiClient.get<MembersListResponse>(BASE_URL, { params: filters });
};

export const getMember = async (id: string): Promise<Member> => {
  return await apiClient.get<Member>(`${BASE_URL}/${id}`);
};

export const createMember = async (data: CreateMemberRequest): Promise<Member> => {
  return await apiClient.post<Member>(BASE_URL, data);
};

export const updateMember = async (id: string, data: UpdateMemberRequest): Promise<Member> => {
  return await apiClient.put<Member>(`${BASE_URL}/${id}`, data);
};

export const deleteMember = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const memberService = {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
};
