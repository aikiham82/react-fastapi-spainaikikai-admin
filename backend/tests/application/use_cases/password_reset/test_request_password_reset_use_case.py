"""Tests for RequestPasswordResetUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.user import User
from src.application.use_cases.password_reset import RequestPasswordResetUseCase


@pytest.fixture
def club_account():
    """Account of a club, reachable at an address the club may not know."""
    return User(
        id="user123",
        email="jcarlosarevalo2@gmail.com",
        username="KUKI AIKIKAI",
        hashed_password="hashed"
    )


@pytest.fixture
def mock_find_login_accounts(club_account):
    """Mock of the use case resolving an identifier into accounts."""
    use_case = MagicMock()
    use_case.execute = AsyncMock(return_value=[club_account])
    return use_case


@pytest.fixture
def mock_token_repository():
    """Mock password reset token repository."""
    mock_repo = MagicMock()
    mock_repo.count_recent_requests = AsyncMock(return_value=0)
    mock_repo.invalidate_user_tokens = AsyncMock(return_value=0)
    mock_repo.create = AsyncMock(side_effect=lambda token: token)
    return mock_repo


@pytest.fixture
def mock_email_service():
    """Mock email service."""
    service = MagicMock()
    service.is_available = MagicMock(return_value=True)
    service.send_password_reset_email = AsyncMock(return_value=True)
    return service


@pytest.fixture
def use_case(mock_find_login_accounts, mock_token_repository, mock_email_service):
    """Use case under test."""
    return RequestPasswordResetUseCase(
        find_login_accounts_use_case=mock_find_login_accounts,
        token_repository=mock_token_repository,
        email_service=mock_email_service,
        frontend_base_url="https://admin.spainaikikai.es"
    )


@pytest.mark.service
@pytest.mark.unit
@pytest.mark.asyncio
class TestRequestPasswordResetUseCase:
    """Test suite for requesting a password reset."""

    async def test_execute_sends_the_link_to_the_account_own_email(
        self, use_case, mock_email_service, mock_token_repository
    ):
        """Test that the club name reaches whatever mailbox the account holds."""
        # Act
        result = await use_case.execute("kuki aikikai")

        # Assert
        assert result.success is True
        created_token = mock_token_repository.create.call_args.args[0]
        mock_email_service.send_password_reset_email.assert_awaited_once()
        sent = mock_email_service.send_password_reset_email.await_args.kwargs
        assert sent["to_email"] == "jcarlosarevalo2@gmail.com"
        assert sent["user_name"] == "KUKI AIKIKAI"
        assert created_token.token in sent["reset_url"]

    async def test_execute_issues_one_link_per_account_sharing_a_user_name(
        self, use_case, mock_find_login_accounts, mock_email_service, mock_token_repository
    ):
        """Test the two people in production holding two accounts each."""
        # Arrange
        mock_find_login_accounts.execute.return_value = [
            User(id="a", email="alerivrod@gmail.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="h"),
            User(id="b", email="info@heijoshin.com", username="ALEJANDRO RIVERO RODRIGUEZ", hashed_password="h"),
        ]

        # Act
        await use_case.execute("alejandro rivero rodriguez")

        # Assert
        assert mock_token_repository.create.await_count == 2
        recipients = [
            call.kwargs["to_email"]
            for call in mock_email_service.send_password_reset_email.await_args_list
        ]
        assert recipients == ["alerivrod@gmail.com", "info@heijoshin.com"]

    async def test_execute_invalidates_previous_tokens_of_each_account(
        self, use_case, mock_token_repository
    ):
        """Test that an older link stops working as soon as a new one is issued."""
        # Act
        await use_case.execute("kuki aikikai")

        # Assert
        mock_token_repository.invalidate_user_tokens.assert_awaited_once_with("user123")

    async def test_execute_answers_the_same_for_an_unknown_identifier(
        self, use_case, mock_find_login_accounts, mock_email_service
    ):
        """Test that the anti-enumeration answer is unchanged."""
        # Arrange
        mock_find_login_accounts.execute.return_value = []
        expected = (await use_case.execute("kuki aikikai")).message

        # Act
        result = await use_case.execute("club que no existe")

        # Assert
        assert result.success is True
        assert result.message == expected
        mock_email_service.send_password_reset_email.assert_not_awaited()

    async def test_execute_skips_an_inactive_account(
        self, use_case, mock_find_login_accounts, mock_email_service
    ):
        """Test that a deactivated account receives nothing."""
        # Arrange
        mock_find_login_accounts.execute.return_value = [
            User(id="x", email="gone@example.com", username="OLD CLUB", hashed_password="h", is_active=False)
        ]

        # Act
        result = await use_case.execute("old club")

        # Assert
        assert result.success is True
        mock_email_service.send_password_reset_email.assert_not_awaited()

    async def test_execute_respects_the_daily_limit_per_account(
        self, use_case, mock_find_login_accounts, mock_token_repository, mock_email_service
    ):
        """Test that the rate limit still applies, now counted per account."""
        # Arrange
        mock_token_repository.count_recent_requests.return_value = RequestPasswordResetUseCase.MAX_REQUESTS_PER_DAY

        # Act
        result = await use_case.execute("kuki aikikai")

        # Assert
        assert result.success is True
        mock_email_service.send_password_reset_email.assert_not_awaited()

    async def test_execute_reports_when_the_email_service_is_down(
        self, use_case, mock_email_service
    ):
        """Test that an unavailable mail service is told apart from a bad identifier."""
        # Arrange
        mock_email_service.is_available.return_value = False

        # Act
        result = await use_case.execute("kuki aikikai")

        # Assert
        assert result.success is False
