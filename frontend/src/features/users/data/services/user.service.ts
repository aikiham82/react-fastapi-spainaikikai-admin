import { apiClient } from '@/core/data/apiClient';
import {
  passwordResetLinkSchema,
  userAccountSchema,
  type PasswordResetLink,
  type UserAccount,
} from '../schemas/user.schema';

const BASE_URL = '/api/v1/users';

export const getUserByMember = async (memberId: string): Promise<UserAccount> => {
  const response = await apiClient.get<unknown>(`${BASE_URL}/by-member/${memberId}`);
  return userAccountSchema.parse(response);
};

export const generatePasswordResetLink = async (userId: string): Promise<PasswordResetLink> => {
  const response = await apiClient.post<unknown>(`${BASE_URL}/${userId}/password-reset-link`);
  return passwordResetLinkSchema.parse(response);
};

export const updateUserEmail = async (userId: string, email: string): Promise<UserAccount> => {
  const response = await apiClient.patch<unknown>(`${BASE_URL}/${userId}/email`, { email });
  return userAccountSchema.parse(response);
};

export const userService = {
  getUserByMember,
  generatePasswordResetLink,
  updateUserEmail,
};
