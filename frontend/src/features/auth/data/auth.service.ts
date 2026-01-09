import { apiClient } from "@/core/data/apiClient"
import type { AuthRequest, AuthResponse, AuthUser, CurrentUser, RegisterRequest } from "./auth.schema";

const BASE_URL = "/api/v1/auth";
const logout = async (): Promise<string> => {
  return await apiClient.post<string>(`${BASE_URL}/logout`);
};

const login = async (userData: AuthRequest): Promise<AuthResponse> => {
  const formData = new URLSearchParams();
  formData.append('username', userData.email);
  formData.append('password', userData.password);
  
  return await apiClient.post<AuthResponse>(`${BASE_URL}/login`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
};

const register = async (userData: RegisterRequest): Promise<AuthResponse> => {
  return await apiClient.post<AuthResponse>(`${BASE_URL}/register`, userData);
};

const updateUser = async (userData: AuthUser): Promise<AuthUser> => {
  return await apiClient.put<AuthUser>(`${BASE_URL}/users`, userData);
};

const getCurrentUser = async (): Promise<CurrentUser> => {
  return await apiClient.get<CurrentUser>("/api/v1/users/me");
};

export const authService = {
  logout,
  login,
  register,
  updateUser,
  getCurrentUser
};

export { getCurrentUser };