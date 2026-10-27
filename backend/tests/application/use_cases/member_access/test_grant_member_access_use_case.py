"""Tests for GrantMemberAccessUseCase."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import Member, ClubRole
from src.domain.entities.user import User
from src.domain.exceptions.member import MemberNotFoundError
from src.domain.exceptions.user import EmailAlreadyInUseError, UserAlreadyExistsError
from src.application.use_cases.member_access import GrantMemberAccessUseCase


def a_member(**overrides) -> Member:
    fields = dict(id="member-1", first_name="Ana", last_name="Ejemplo", club_id="club-1")
    return Member(**{**fields, **overrides})


@pytest.fixture
def members():
    repo = MagicMock()
    repo.find_by_id = AsyncMock(return_value=a_member())
    repo.update = AsyncMock(side_effect=lambda m: m)
    return repo


@pytest.fixture
def users():
    repo = MagicMock()
    repo.find_by_member_id = AsyncMock(return_value=None)
    repo.find_by_email = AsyncMock(return_value=None)
    repo.create = AsyncMock(side_effect=lambda u: User(**{**u.__dict__, "id": "user-1"}))
    return repo


@pytest.fixture
def tokens():
    repo = MagicMock()
    repo.invalidate_user_tokens = AsyncMock(return_value=0)
    repo.create = AsyncMock(side_effect=lambda t: t)
    return repo


@pytest.fixture
def mailer():
    service = MagicMock()
    service.send_account_invitation_email = AsyncMock(return_value=True)
    return service


@pytest.fixture
def use_case(members, users, tokens, mailer):
    return GrantMemberAccessUseCase(
        member_repository=members,
        user_repository=users,
        token_repository=tokens,
        email_service=mailer,
        hash_password=lambda plain: f"hashed:{plain}",
        frontend_base_url="https://admin.example.com/",
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestGrantMemberAccessUseCase:

    async def test_creates_an_account_linked_to_the_member(self, use_case, users):
        await use_case.execute("member-1", "  Ana@Example.com ", make_club_admin=False)

        created = users.create.call_args.args[0]
        assert created.member_id == "member-1"
        assert created.email == "ana@example.com"
        assert created.username == "ana@example.com"
        assert created.hashed_password.startswith("hashed:")

    async def test_mails_and_returns_a_link_to_set_the_password(self, use_case, mailer):
        link = await use_case.execute("member-1", "ana@example.com", make_club_admin=False)

        assert link.url.startswith("https://admin.example.com/reset-password?token=")
        assert link.email == "ana@example.com"
        mailer.send_account_invitation_email.assert_awaited_once_with(
            to_email="ana@example.com", member_name="Ana Ejemplo", url=link.url
        )

    async def test_still_returns_the_link_when_the_mail_fails(self, use_case, mailer):
        mailer.send_account_invitation_email = AsyncMock(side_effect=RuntimeError("smtp down"))

        link = await use_case.execute("member-1", "ana@example.com", make_club_admin=False)

        assert link.url

    async def test_makes_the_member_a_club_admin_only_when_asked(self, use_case, members):
        member = a_member(email="ana@example.com")
        members.find_by_id = AsyncMock(return_value=member)
        await use_case.execute("member-1", "ana@example.com", make_club_admin=False)
        assert member.club_role == ClubRole.MEMBER

        await use_case.execute("member-1", "ana2@example.com", make_club_admin=True)
        promoted = members.update.call_args.args[0]
        assert promoted.club_role == ClubRole.ADMIN

    async def test_fills_an_empty_member_email_with_the_login_email(self, use_case, members):
        member = a_member(email="")
        members.find_by_id = AsyncMock(return_value=member)

        await use_case.execute("member-1", "ana@example.com", make_club_admin=True)

        assert member.email == "ana@example.com"
        members.update.assert_awaited()

    async def test_refuses_a_member_who_is_de_baja(self, use_case, members, users):
        from src.domain.entities.member import MemberStatus
        from src.domain.exceptions.member import InactiveMemberError
        members.find_by_id = AsyncMock(return_value=a_member(status=MemberStatus.INACTIVE))

        with pytest.raises(InactiveMemberError):
            await use_case.execute("member-1", "ana@example.com", make_club_admin=False)
        users.create.assert_not_awaited()

    async def test_refuses_a_member_that_already_has_an_account(self, use_case, users):
        users.find_by_member_id = AsyncMock(return_value=User(
            id="user-9", email="old@example.com", username="old", hashed_password="h", member_id="member-1"
        ))

        with pytest.raises(UserAlreadyExistsError):
            await use_case.execute("member-1", "ana@example.com", make_club_admin=False)
        users.create.assert_not_awaited()

    async def test_refuses_an_email_another_account_uses(self, use_case, users):
        users.find_by_email = AsyncMock(return_value=User(
            id="user-9", email="family@example.com", username="family", hashed_password="h"
        ))

        with pytest.raises(EmailAlreadyInUseError):
            await use_case.execute("member-1", "family@example.com", make_club_admin=False)
        users.create.assert_not_awaited()

    async def test_refuses_an_unknown_member(self, use_case, members):
        members.find_by_id = AsyncMock(return_value=None)

        with pytest.raises(MemberNotFoundError):
            await use_case.execute("missing", "ana@example.com", make_club_admin=False)
