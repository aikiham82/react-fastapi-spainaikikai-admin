"""Reset password use case."""

from dataclasses import dataclass

from src.application.ports.repositories import UserRepositoryPort
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.domain.exceptions.password_reset import (
    PasswordResetTokenNotFoundError,
    PasswordResetTokenExpiredError,
    PasswordResetTokenUsedError
)
from src.domain.exceptions.user import UserNotFoundError


@dataclass
class ResetPasswordResult:
    """Result of password reset operation."""
    success: bool
    message: str


class ResetPasswordUseCase:
    """Use case for resetting a user's password using a valid token.

    This use case:
    1. Validates the token exists, is not expired, and is not used
    2. Updates the user's password
    3. Marks the token as used
    """

    def __init__(
        self,
        user_repository: UserRepositoryPort,
        token_repository: PasswordResetTokenRepositoryPort
    ):
        """Initialize the use case.

        Args:
            user_repository: Repository for user operations.
            token_repository: Repository for token operations.
        """
        self.user_repository = user_repository
        self.token_repository = token_repository

    async def execute(self, token: str, new_hashed_password: str) -> ResetPasswordResult:
        """Execute the password reset.

        Args:
            token: The password reset token string.
            new_hashed_password: The new password, already hashed.

        Returns:
            ResetPasswordResult: Result indicating success or failure.

        Raises:
            PasswordResetTokenNotFoundError: If token doesn't exist.
            PasswordResetTokenExpiredError: If token has expired.
            PasswordResetTokenUsedError: If token has already been used.
            UserNotFoundError: If user associated with token doesn't exist.
        """
        # Find the token
        reset_token = await self.token_repository.find_by_token(token)

        if not reset_token:
            raise PasswordResetTokenNotFoundError(token)

        if reset_token.is_expired:
            raise PasswordResetTokenExpiredError()

        if reset_token.is_used:
            raise PasswordResetTokenUsedError()

        # Find the user
        user = await self.user_repository.find_by_id(reset_token.user_id)

        if not user:
            raise UserNotFoundError(reset_token.user_id)

        # Update the user's password
        user.update_password(new_hashed_password)
        await self.user_repository.update(user)

        # Mark token as used
        reset_token.mark_as_used()
        await self.token_repository.update(reset_token)

        return ResetPasswordResult(
            success=True,
            message="Contrasena restablecida correctamente"
        )


class ValidateResetTokenUseCase:
    """Use case for validating a password reset token.

    This is used by the frontend to check if a token is valid
    before showing the password reset form.
    """

    def __init__(self, token_repository: PasswordResetTokenRepositoryPort):
        """Initialize the use case.

        Args:
            token_repository: Repository for token operations.
        """
        self.token_repository = token_repository

    async def execute(self, token: str) -> dict:
        """Validate a password reset token.

        Args:
            token: The password reset token string.

        Returns:
            dict with 'valid', 'email', and 'message' keys.

        Raises:
            PasswordResetTokenNotFoundError: If token doesn't exist.
            PasswordResetTokenExpiredError: If token has expired.
            PasswordResetTokenUsedError: If token has already been used.
        """
        reset_token = await self.token_repository.find_by_token(token)

        if not reset_token:
            raise PasswordResetTokenNotFoundError(token)

        if reset_token.is_expired:
            raise PasswordResetTokenExpiredError()

        if reset_token.is_used:
            raise PasswordResetTokenUsedError()

        return {
            "valid": True,
            "email": reset_token.email,
            "message": "Token valido"
        }
