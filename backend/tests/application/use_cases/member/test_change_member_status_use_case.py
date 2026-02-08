"""Tests for ChangeMemberStatusUseCase."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import Member, MemberStatus, ClubRole
from src.domain.exceptions.member import MemberNotFoundError, InvalidMemberDataError
from src.application.use_cases.member.change_member_status_use_case import ChangeMemberStatusUseCase


@pytest.fixture
def mock_member_repository():
    """Mock member repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.find_by_id = AsyncMock(return_value=None)
    mock_repo.update = AsyncMock()
    return mock_repo


@pytest.fixture
def active_member():
    """Active member entity for testing."""
    return Member(
        id="member123",
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        dni="12345678A",
        phone="+34612345678",
        club_id="club123",
        status=MemberStatus.ACTIVE,
        club_role=ClubRole.MEMBER,
        birth_date=datetime(1990, 1, 15),
        registration_date=datetime(2024, 1, 1),
        created_at=datetime(2024, 1, 1, 10, 0, 0),
        updated_at=datetime(2024, 1, 1, 10, 0, 0)
    )


@pytest.fixture
def inactive_member():
    """Inactive member entity for testing."""
    return Member(
        id="member456",
        first_name="Jane",
        last_name="Smith",
        email="jane.smith@example.com",
        dni="87654321B",
        phone="+34623456789",
        club_id="club123",
        status=MemberStatus.INACTIVE,
        club_role=ClubRole.MEMBER,
        birth_date=datetime(1995, 5, 20),
        registration_date=datetime(2023, 6, 15),
        created_at=datetime(2023, 6, 15, 10, 0, 0),
        updated_at=datetime(2026, 2, 1, 14, 30, 0)
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestChangeMemberStatusUseCase:
    """Test suite for ChangeMemberStatusUseCase."""

    async def test_execute_changes_active_to_inactive_successfully(self, mock_member_repository, active_member):
        """Test that execute successfully changes an active member to inactive."""
        # Arrange
        member_id = "member123"
        new_status = "inactive"

        mock_member_repository.find_by_id.return_value = active_member
        mock_member_repository.update.return_value = active_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert
        assert result is not None
        assert result.status == MemberStatus.INACTIVE
        mock_member_repository.find_by_id.assert_called_once_with(member_id)
        mock_member_repository.update.assert_called_once()

        # Verify the member passed to update has inactive status
        updated_member = mock_member_repository.update.call_args[0][0]
        assert updated_member.status == MemberStatus.INACTIVE
        assert updated_member.id == member_id

    async def test_execute_changes_inactive_to_active_successfully(self, mock_member_repository, inactive_member):
        """Test that execute successfully changes an inactive member to active."""
        # Arrange
        member_id = "member456"
        new_status = "active"

        mock_member_repository.find_by_id.return_value = inactive_member
        mock_member_repository.update.return_value = inactive_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert
        assert result is not None
        assert result.status == MemberStatus.ACTIVE
        mock_member_repository.find_by_id.assert_called_once_with(member_id)
        mock_member_repository.update.assert_called_once()

        # Verify the member passed to update has active status
        updated_member = mock_member_repository.update.call_args[0][0]
        assert updated_member.status == MemberStatus.ACTIVE
        assert updated_member.id == member_id

    async def test_execute_raises_invalid_member_data_error_for_pending_status(self, mock_member_repository):
        """Test that execute rejects 'pending' status value."""
        # Arrange
        member_id = "member123"
        new_status = "pending"

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(InvalidMemberDataError) as exc_info:
            await use_case.execute(member_id, new_status)

        error_message = str(exc_info.value)
        assert "Invalid status 'pending'" in error_message
        assert "active" in error_message
        assert "inactive" in error_message
        mock_member_repository.find_by_id.assert_not_called()
        mock_member_repository.update.assert_not_called()

    async def test_execute_raises_invalid_member_data_error_for_suspended_status(self, mock_member_repository):
        """Test that execute rejects 'suspended' status value."""
        # Arrange
        member_id = "member123"
        new_status = "suspended"

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(InvalidMemberDataError) as exc_info:
            await use_case.execute(member_id, new_status)

        error_message = str(exc_info.value)
        assert "Invalid status 'suspended'" in error_message
        assert "active" in error_message
        assert "inactive" in error_message
        mock_member_repository.find_by_id.assert_not_called()
        mock_member_repository.update.assert_not_called()

    async def test_execute_raises_invalid_member_data_error_for_arbitrary_status(self, mock_member_repository):
        """Test that execute rejects arbitrary status values."""
        # Arrange
        member_id = "member123"
        new_status = "deleted"

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(InvalidMemberDataError) as exc_info:
            await use_case.execute(member_id, new_status)

        assert "Invalid status 'deleted'" in str(exc_info.value)
        mock_member_repository.find_by_id.assert_not_called()
        mock_member_repository.update.assert_not_called()

    async def test_execute_raises_invalid_member_data_error_for_empty_status(self, mock_member_repository):
        """Test that execute rejects empty status value."""
        # Arrange
        member_id = "member123"
        new_status = ""

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(InvalidMemberDataError) as exc_info:
            await use_case.execute(member_id, new_status)

        assert "Invalid status ''" in str(exc_info.value)
        mock_member_repository.find_by_id.assert_not_called()
        mock_member_repository.update.assert_not_called()

    async def test_execute_raises_member_not_found_error_when_member_does_not_exist(self, mock_member_repository):
        """Test that execute raises MemberNotFoundError when member doesn't exist."""
        # Arrange
        member_id = "nonexistent123"
        new_status = "inactive"

        mock_member_repository.find_by_id.return_value = None

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(MemberNotFoundError) as exc_info:
            await use_case.execute(member_id, new_status)

        assert member_id in str(exc_info.value)
        mock_member_repository.find_by_id.assert_called_once_with(member_id)
        mock_member_repository.update.assert_not_called()

    async def test_execute_idempotency_active_to_active(self, mock_member_repository, active_member):
        """Test idempotency: changing an active member to active still works."""
        # Arrange
        member_id = "member123"
        new_status = "active"

        mock_member_repository.find_by_id.return_value = active_member
        mock_member_repository.update.return_value = active_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert
        assert result is not None
        assert result.status == MemberStatus.ACTIVE
        mock_member_repository.find_by_id.assert_called_once_with(member_id)
        mock_member_repository.update.assert_called_once()

        # Member should still be active
        updated_member = mock_member_repository.update.call_args[0][0]
        assert updated_member.status == MemberStatus.ACTIVE

    async def test_execute_idempotency_inactive_to_inactive(self, mock_member_repository, inactive_member):
        """Test idempotency: changing an inactive member to inactive still works."""
        # Arrange
        member_id = "member456"
        new_status = "inactive"

        mock_member_repository.find_by_id.return_value = inactive_member
        mock_member_repository.update.return_value = inactive_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert
        assert result is not None
        assert result.status == MemberStatus.INACTIVE
        mock_member_repository.find_by_id.assert_called_once_with(member_id)
        mock_member_repository.update.assert_called_once()

        # Member should still be inactive
        updated_member = mock_member_repository.update.call_args[0][0]
        assert updated_member.status == MemberStatus.INACTIVE

    async def test_execute_preserves_member_data_when_changing_status(self, mock_member_repository, active_member):
        """Test that execute preserves all member data except status."""
        # Arrange
        member_id = "member123"
        new_status = "inactive"
        original_first_name = active_member.first_name
        original_last_name = active_member.last_name
        original_email = active_member.email
        original_dni = active_member.dni
        original_club_id = active_member.club_id
        original_club_role = active_member.club_role

        mock_member_repository.find_by_id.return_value = active_member
        mock_member_repository.update.return_value = active_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert
        updated_member = mock_member_repository.update.call_args[0][0]
        assert updated_member.first_name == original_first_name
        assert updated_member.last_name == original_last_name
        assert updated_member.email == original_email
        assert updated_member.dni == original_dni
        assert updated_member.club_id == original_club_id
        assert updated_member.club_role == original_club_role
        assert updated_member.status == MemberStatus.INACTIVE

    async def test_execute_uses_domain_activate_method(self, mock_member_repository, inactive_member):
        """Test that execute uses the domain entity's activate() method."""
        # Arrange
        member_id = "member456"
        new_status = "active"

        mock_member_repository.find_by_id.return_value = inactive_member
        mock_member_repository.update.return_value = inactive_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert - verify the domain method was effectively used
        updated_member = mock_member_repository.update.call_args[0][0]
        assert updated_member.status == MemberStatus.ACTIVE
        assert updated_member.is_active is True

    async def test_execute_uses_domain_deactivate_method(self, mock_member_repository, active_member):
        """Test that execute uses the domain entity's deactivate() method."""
        # Arrange
        member_id = "member123"
        new_status = "inactive"

        mock_member_repository.find_by_id.return_value = active_member
        mock_member_repository.update.return_value = active_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert - verify the domain method was effectively used
        updated_member = mock_member_repository.update.call_args[0][0]
        assert updated_member.status == MemberStatus.INACTIVE
        assert updated_member.is_active is False

    async def test_execute_propagates_repository_exceptions_from_find(self, mock_member_repository):
        """Test that execute propagates repository exceptions from find_by_id."""
        # Arrange
        member_id = "member123"
        new_status = "inactive"
        repository_error = Exception("Database connection failed")

        mock_member_repository.find_by_id.side_effect = repository_error

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute(member_id, new_status)

        assert str(exc_info.value) == "Database connection failed"
        mock_member_repository.update.assert_not_called()

    async def test_execute_propagates_repository_exceptions_from_update(self, mock_member_repository, active_member):
        """Test that execute propagates repository exceptions from update operation."""
        # Arrange
        member_id = "member123"
        new_status = "inactive"
        repository_error = Exception("Update operation failed")

        mock_member_repository.find_by_id.return_value = active_member
        mock_member_repository.update.side_effect = repository_error

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute(member_id, new_status)

        assert str(exc_info.value) == "Update operation failed"

    async def test_execute_validates_status_before_querying_repository(self, mock_member_repository):
        """Test that status validation happens before any repository calls."""
        # Arrange
        member_id = "member123"
        new_status = "invalid_status"

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(InvalidMemberDataError):
            await use_case.execute(member_id, new_status)

        # Repository should never be called with invalid status
        mock_member_repository.find_by_id.assert_not_called()
        mock_member_repository.update.assert_not_called()

    async def test_execute_handles_case_sensitive_status_values(self, mock_member_repository, active_member):
        """Test that execute handles status values case-sensitively (lowercase only)."""
        # Arrange
        member_id = "member123"
        new_status = "INACTIVE"  # Uppercase should fail

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act & Assert
        with pytest.raises(InvalidMemberDataError) as exc_info:
            await use_case.execute(member_id, new_status)

        assert "Invalid status 'INACTIVE'" in str(exc_info.value)
        mock_member_repository.find_by_id.assert_not_called()

    async def test_execute_returns_updated_member_from_repository(self, mock_member_repository, active_member):
        """Test that execute returns the updated member from repository."""
        # Arrange
        member_id = "member123"
        new_status = "inactive"

        updated_member = Member(
            id=member_id,
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            dni="12345678A",
            phone="+34612345678",
            club_id="club123",
            status=MemberStatus.INACTIVE,
            club_role=ClubRole.MEMBER,
            birth_date=datetime(1990, 1, 15),
            created_at=datetime(2024, 1, 1, 10, 0, 0),
            updated_at=datetime(2026, 2, 8, 16, 30, 0)  # Updated timestamp
        )

        mock_member_repository.find_by_id.return_value = active_member
        mock_member_repository.update.return_value = updated_member

        use_case = ChangeMemberStatusUseCase(mock_member_repository)

        # Act
        result = await use_case.execute(member_id, new_status)

        # Assert
        assert result == updated_member
        assert result.id == member_id
        assert result.status == MemberStatus.INACTIVE


@pytest.mark.unit
class TestChangeMemberStatusUseCaseConstants:
    """Test suite for ChangeMemberStatusUseCase constants."""

    def test_allowed_statuses_contains_active_and_inactive(self):
        """Test that ALLOWED_STATUSES contains only 'active' and 'inactive'."""
        use_case = ChangeMemberStatusUseCase(MagicMock())

        assert "active" in use_case.ALLOWED_STATUSES
        assert "inactive" in use_case.ALLOWED_STATUSES
        assert len(use_case.ALLOWED_STATUSES) == 2

    def test_allowed_statuses_does_not_contain_pending(self):
        """Test that ALLOWED_STATUSES does not contain 'pending'."""
        use_case = ChangeMemberStatusUseCase(MagicMock())

        assert "pending" not in use_case.ALLOWED_STATUSES

    def test_allowed_statuses_does_not_contain_suspended(self):
        """Test that ALLOWED_STATUSES does not contain 'suspended'."""
        use_case = ChangeMemberStatusUseCase(MagicMock())

        assert "suspended" not in use_case.ALLOWED_STATUSES
