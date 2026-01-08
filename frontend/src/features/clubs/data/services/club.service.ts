import { apiClient } from '@/core/data/apiClient';
import type { Club, CreateClubRequest, UpdateClubRequest, ClubFilters } from './club.schema';

const BASE_URL = '/api/v1/clubs';

export const getClubs = async (filters?: ClubFilters): Promise<Club[]> => {
  return await apiClient.get<Club[]>(BASE_URL, { params: filters });
};

export const getClub = async (id: string): Promise<Club> => {
  return await apiClient.get<Club>(`${BASE_URL}/${id}`);
};

export const createClub = async (data: CreateClubRequest): Promise<Club> => {
  return await apiClient.post<Club>(BASE_URL, data);
};

export const updateClub = async (id: string, data: UpdateClubRequest): Promise<Club> => {
  return await apiClient.put<Club>(`${BASE_URL}/${id}`, data);
};

export const deleteClub = async (id: string): Promise<void> => {
  return await apiClient.delete<void>(`${BASE_URL}/${id}`);
};

export const clubService = {
  getClubs,
  getClub,
  createClub,
  updateClub,
  deleteClub,
};
