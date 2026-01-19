/**
 * Password Reset Types and Schemas
 */

// Request password reset
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  success: boolean;
  message: string;
}

// Validate token
export interface ValidateTokenResponse {
  valid: boolean;
  email: string;
  message: string;
}

// Reset password
export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}
