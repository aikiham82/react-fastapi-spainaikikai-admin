"""Password reset router."""

from fastapi import APIRouter, Depends, HTTPException, status

from src.infrastructure.web.dto.password_reset_dto import (
    PasswordResetRequestDTO,
    PasswordResetRequestResponseDTO,
    ValidateTokenResponseDTO,
    ResetPasswordDTO,
    ResetPasswordResponseDTO
)
from src.infrastructure.web.dependencies import (
    get_request_password_reset_use_case,
    get_reset_password_use_case,
    get_validate_reset_token_use_case
)
from src.application.use_cases.password_reset import (
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    ValidateResetTokenUseCase
)
from src.domain.exceptions.password_reset import (
    PasswordResetTokenNotFoundError,
    PasswordResetTokenExpiredError,
    PasswordResetTokenUsedError
)
from src.domain.exceptions.user import UserNotFoundError
from src.infrastructure.web.security import get_password_hash

router = APIRouter(prefix="/auth/password-reset", tags=["Password Reset"])


@router.post(
    "/request",
    response_model=PasswordResetRequestResponseDTO,
    summary="Request password reset",
    description="Request a password reset link. An email will be sent if the account exists."
)
async def request_password_reset(
    request: PasswordResetRequestDTO,
    use_case: RequestPasswordResetUseCase = Depends(get_request_password_reset_use_case)
) -> PasswordResetRequestResponseDTO:
    """Request a password reset.

    This endpoint always returns success to prevent email enumeration attacks.
    If the email exists and the user is active, a reset email will be sent.
    """
    result = await use_case.execute(request.email)
    return PasswordResetRequestResponseDTO(
        success=result.success,
        message=result.message
    )


@router.get(
    "/validate/{token}",
    response_model=ValidateTokenResponseDTO,
    summary="Validate reset token",
    description="Validate a password reset token before showing the reset form."
)
async def validate_reset_token(
    token: str,
    use_case: ValidateResetTokenUseCase = Depends(get_validate_reset_token_use_case)
) -> ValidateTokenResponseDTO:
    """Validate a password reset token.

    Use this endpoint to check if a token is valid before showing
    the password reset form to the user.
    """
    try:
        result = await use_case.execute(token)
        return ValidateTokenResponseDTO(
            valid=result["valid"],
            email=result["email"],
            message=result["message"]
        )
    except PasswordResetTokenNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token de restablecimiento no encontrado o invalido"
        )
    except PasswordResetTokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="El token de restablecimiento ha expirado"
        )
    except PasswordResetTokenUsedError:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="El token de restablecimiento ya ha sido utilizado"
        )


@router.post(
    "/reset",
    response_model=ResetPasswordResponseDTO,
    summary="Reset password",
    description="Reset password using a valid token."
)
async def reset_password(
    request: ResetPasswordDTO,
    use_case: ResetPasswordUseCase = Depends(get_reset_password_use_case)
) -> ResetPasswordResponseDTO:
    """Reset the user's password.

    The token must be valid, not expired, and not previously used.
    """
    try:
        # Hash the new password before passing to the use case
        hashed_password = get_password_hash(request.new_password)
        result = await use_case.execute(request.token, hashed_password)
        return ResetPasswordResponseDTO(
            success=result.success,
            message=result.message
        )
    except PasswordResetTokenNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token de restablecimiento no encontrado o invalido"
        )
    except PasswordResetTokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="El token de restablecimiento ha expirado"
        )
    except PasswordResetTokenUsedError:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="El token de restablecimiento ya ha sido utilizado"
        )
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
