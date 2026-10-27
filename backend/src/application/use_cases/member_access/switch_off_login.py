"""Switch off a login so nobody signs in with it again."""

from src.domain.entities.user import User
from src.application.ports.password_reset_token_repository import PasswordResetTokenRepositoryPort
from src.application.ports.repositories import UserRepositoryPort


async def switch_off_login(
    user: User, user_repository: UserRepositoryPort, token_repository: PasswordResetTokenRepositoryPort
) -> User:
    """Deactivate the account and kill its reset links; it is kept, never deleted."""
    await token_repository.invalidate_user_tokens(user.id)
    user.deactivate()
    return await user_repository.update(user)
