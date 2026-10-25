import { apiClient } from '@/core/data/apiClient';
import {
  passwordResetLinkSchema,
  userAccountSchema,
  type PasswordResetLink,
  type UserAccount,
} from '../schemas/user.schema';
import type { ClubRole } from '@/features/auth/data/auth.schema';

const BASE_URL = '/api/v1/users';

export const getUserAccounts = async (): Promise<UserAccount[]> => {
  const response = await apiClient.get<unknown>(BASE_URL);
  return userAccountSchema.array().parse(response);
};

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

export const grantMemberAccess = async (
  memberId: string,
  email: string,
  clubAdmin: boolean
): Promise<PasswordResetLink> => {
  const response = await apiClient.post<unknown>(`/api/v1/members/${memberId}/account`, {
    email,
    club_admin: clubAdmin,
  });
  return passwordResetLinkSchema.parse(response);
};

export const setMemberClubRole = async (memberId: string, clubRole: ClubRole): Promise<void> => {
  await apiClient.patch<unknown>(`/api/v1/members/${memberId}/club-role`, { club_role: clubRole });
};

export const revokeMemberAccess = async (memberId: string): Promise<void> => {
  await apiClient.delete<unknown>(`/api/v1/members/${memberId}/account`);
};

export const userService = {
  getUserAccounts,
  getUserByMember,
  generatePasswordResetLink,
  updateUserEmail,
  grantMemberAccess,
  setMemberClubRole,
  revokeMemberAccess,
};
