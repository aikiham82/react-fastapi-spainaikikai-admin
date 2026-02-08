import { apiClient } from '@/core/data/apiClient';
import type { Member, CreateMemberRequest, UpdateMemberRequest, MemberFilters } from '../schemas/member.schema';

const BASE_URL = '/api/v1/members';

export const getMembers = async (filters?: MemberFilters): Promise<Member[]> => {
  if (filters?.search) {
    const { search, ...rest } = filters;
    return await apiClient.get<Member[]>(`${BASE_URL}/search`, {
      params: { name: search, ...rest },
    });
  }
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

export const memberService = {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
};
