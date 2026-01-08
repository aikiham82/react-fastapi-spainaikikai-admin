import { apiClient } from '@/core/data/apiClient';
import type { Seminar, CreateSeminarRequest, UpdateSeminarRequest, SeminarFilters, SeminarsListResponse, RegisterMemberRequest } from './seminar.schema';

const BASE_URL = '/api/v1/seminars';

export const getSeminars = async (filters?: SeminarFilters): Promise<SeminarsListResponse> => {
  return await apiClient.get<SeminarsListResponse>(BASE_URL, { params: filters });
};

export const getSeminar = async (id: string): Promise<Seminar> => {
  return await apiClient.get<Seminar>(`${BASE_URL}/${id}`);
};

export const createSeminar = async (data: CreateSeminarRequest): Promise<Seminar> => {
  return await apiClient.post<Seminar>(BASE_URL, data);
};

export const updateSeminar = async (id: string, data: UpdateSeminarRequest): Promise<Seminar> => {
  return await apiClient.put<Seminar>(`${BASE_URL}/${id}`, data);
};

export const deleteSeminar = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const registerMember = async (data: RegisterMemberRequest): Promise<void> => {
  return await apiClient.post<void>(`${BASE_URL}/register`, data);
};

export const seminarService = {
  getSeminars,
  getSeminar,
  createSeminar,
  updateSeminar,
  deleteSeminar,
  registerMember,
};
