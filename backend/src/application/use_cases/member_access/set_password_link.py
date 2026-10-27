"""The link a new or re-enabled account uses to set its password."""

from src.domain.entities.password_reset_token import PasswordResetToken
from src.domain.entities.user import User
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort


async def issue_set_password_link(
    user: User, token_repository: PasswordResetTokenRepositoryPort, frontend_base_url: str
) -> tuple[PasswordResetToken, str]:
    """Kill the account's previous links and issue a fresh one."""
    await token_repository.invalidate_user_tokens(user.id)
    token = await token_repository.create(PasswordResetToken(user_id=user.id, email=user.email))
    return token, f"{frontend_base_url}/reset-password?token={token.token}"
