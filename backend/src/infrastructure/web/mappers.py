"""Mappers for converting between domain entities and DTOs."""

from typing import List

from src.domain.entities.user import User
from src.infrastructure.web.dto.user_dto import UserResponse


class UserMapper:
    """Mapper for User entities and DTOs."""

    @staticmethod
    def to_response(user: User) -> UserResponse:
        """Convert User entity to UserResponse DTO."""
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            is_active=user.is_active,
            global_role=user.global_role.value,
            member_id=user.member_id,
            role=user.role,  # Legacy field (deprecated)
            created_at=user.created_at,
            updated_at=user.updated_at
        )

    @staticmethod
    def to_response_list(users: List[User]) -> List[UserResponse]:
        """Convert list of User entities to list of UserResponse DTOs."""
        return [UserMapper.to_response(user) for user in users]