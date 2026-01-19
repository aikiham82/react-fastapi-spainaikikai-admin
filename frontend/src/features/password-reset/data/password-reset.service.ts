import { apiClient } from "@/core/data/apiClient";
import type {
  PasswordResetRequest,
  PasswordResetRequestResponse,
  ValidateTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "./password-reset.schema";

const BASE_URL = "/api/v1/auth/password-reset";

/**
 * Request a password reset email
 */
const requestPasswordReset = async (
  data: PasswordResetRequest
): Promise<PasswordResetRequestResponse> => {
  return await apiClient.post<PasswordResetRequestResponse>(
    `${BASE_URL}/request`,
    data
  );
};

/**
 * Validate a password reset token
 */
const validateToken = async (token: string): Promise<ValidateTokenResponse> => {
  return await apiClient.get<ValidateTokenResponse>(
    `${BASE_URL}/validate/${token}`
  );
};

/**
 * Reset password with token
 */
const resetPassword = async (
  data: ResetPasswordRequest
): Promise<ResetPasswordResponse> => {
  return await apiClient.post<ResetPasswordResponse>(
    `${BASE_URL}/reset`,
    data
  );
};

export const passwordResetService = {
  requestPasswordReset,
  validateToken,
  resetPassword,
};
