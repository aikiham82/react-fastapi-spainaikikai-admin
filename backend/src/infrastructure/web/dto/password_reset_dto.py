"""DTOs for password reset operations."""

from pydantic import BaseModel, EmailStr, Field


class PasswordResetRequestDTO(BaseModel):
    """DTO for requesting a password reset."""

    email: EmailStr = Field(
        ...,
        description="Email address to send password reset link"
    )


class PasswordResetRequestResponseDTO(BaseModel):
    """DTO for password reset request response."""

    success: bool = Field(
        ...,
        description="Whether the request was processed"
    )
    message: str = Field(
        ...,
        description="Response message"
    )


class ValidateTokenResponseDTO(BaseModel):
    """DTO for token validation response."""

    valid: bool = Field(
        ...,
        description="Whether the token is valid"
    )
    email: str = Field(
        ...,
        description="Email associated with the token"
    )
    message: str = Field(
        ...,
        description="Validation message"
    )


class ResetPasswordDTO(BaseModel):
    """DTO for executing password reset."""

    token: str = Field(
        ...,
        min_length=1,
        description="Password reset token"
    )
    new_password: str = Field(
        ...,
        min_length=8,
        description="New password (minimum 8 characters)"
    )


class ResetPasswordResponseDTO(BaseModel):
    """DTO for password reset response."""

    success: bool = Field(
        ...,
        description="Whether the password was reset successfully"
    )
    message: str = Field(
        ...,
        description="Response message"
    )
