import { apiClient } from '@/core/data/apiClient';
import type { Member, CreateMemberRequest, UpdateMemberRequest, ChangeMemberStatusRequest, MemberFilters } from '../schemas/member.schema';

const BASE_URL = '/api/v1/members';

export const getMembers = async (filters?: MemberFilters): Promise<Member[]> => {
  return await apiClient.get<Member[]>(BASE_URL, { params: filters });
};

export const getMember = async (id: string): Promise<Member> => {
  return await apiClient.get<Member>(`${BASE_URL}/${id}`);
};

const cleanEmptyFields = <T extends object>(data: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  ) as Partial<T>;
};

export const createMember = async (data: CreateMemberRequest): Promise<Member> => {
  const cleanedData = cleanEmptyFields(data);
  return await apiClient.post<Member>(BASE_URL, cleanedData);
};

export const updateMember = async (id: string, data: UpdateMemberRequest): Promise<Member> => {
  const cleanedData = cleanEmptyFields(data);
  return await apiClient.put<Member>(`${BASE_URL}/${id}`, cleanedData);
};

export const deleteMember = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const changeMemberStatus = async (id: string, data: ChangeMemberStatusRequest): Promise<Member> => {
  return await apiClient.patch<Member>(`${BASE_URL}/${id}/status`, data);
};

export const memberService = {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  changeMemberStatus,
};
