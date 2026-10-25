"""Tests for changing who manages a club and removing a member's access."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import Member, ClubRole
from src.domain.entities.user import GlobalRole, User
from src.domain.exceptions.member import LastClubAdminError, MemberNotFoundError
from src.domain.exceptions.user import AccessChangeNotAllowedError, UserNotFoundError
from src.application.use_cases.member_access import (
    GrantMemberAccessUseCase,
    RevokeMemberAccessUseCase,
    SetMemberClubRoleUseCase,
)


def a_member(member_id="member-1", club_role=ClubRole.MEMBER) -> Member:
    return Member(id=member_id, first_name="Ana", last_name="Ejemplo", club_id="club-1", club_role=club_role)


def an_account(**overrides) -> User:
    fields = dict(id="user-1", email="ana@example.com", username="ana@example.com", hashed_password="h", member_id="member-1")
    return User(**{**fields, **overrides})


def member_repository(member: Member, club: list) -> MagicMock:
    repo = MagicMock()
    repo.find_by_id = AsyncMock(return_value=member)
    repo.find_by_club_id = AsyncMock(return_value=club)
    repo.update = AsyncMock(side_effect=lambda m: m)
    return repo


@pytest.fixture
def tokens():
    repo = MagicMock()
    repo.invalidate_user_tokens = AsyncMock(return_value=0)
    repo.create = AsyncMock(side_effect=lambda t: t)
    return repo


@pytest.mark.unit
@pytest.mark.asyncio
class TestSetMemberClubRole:

    async def test_makes_a_member_a_club_admin(self):
        member = a_member()
        members = member_repository(member, [member])

        await SetMemberClubRoleUseCase(members).execute("member-1", ClubRole.ADMIN)

        assert members.update.call_args.args[0].club_role == ClubRole.ADMIN

    async def test_demotes_an_admin_when_another_one_remains(self):
        member = a_member(club_role=ClubRole.ADMIN)
        members = member_repository(member, [member, a_member("member-2", ClubRole.ADMIN)])

        await SetMemberClubRoleUseCase(members).execute("member-1", ClubRole.MEMBER)

        assert members.update.call_args.args[0].club_role == ClubRole.MEMBER

    async def test_refuses_to_leave_the_club_without_admins(self):
        member = a_member(club_role=ClubRole.ADMIN)
        members = member_repository(member, [member, a_member("member-2")])

        with pytest.raises(LastClubAdminError):
            await SetMemberClubRoleUseCase(members).execute("member-1", ClubRole.MEMBER)
        members.update.assert_not_awaited()

    async def test_refuses_an_unknown_member(self):
        members = member_repository(None, [])

        with pytest.raises(MemberNotFoundError):
            await SetMemberClubRoleUseCase(members).execute("missing", ClubRole.ADMIN)


@pytest.mark.unit
@pytest.mark.asyncio
class TestRevokeMemberAccess:

    def use_case(self, member, club, account, tokens):
        users = MagicMock()
        users.find_by_member_id = AsyncMock(return_value=account)
        users.update = AsyncMock(side_effect=lambda u: u)
        return RevokeMemberAccessUseCase(member_repository(member, club), users, tokens), users

    async def test_switches_off_the_account_and_its_links(self, tokens):
        member = a_member()
        use_case, users = self.use_case(member, [member], an_account(), tokens)

        await use_case.execute("member-1", revoked_by_member_id="member-9")

        assert users.update.call_args.args[0].is_active is False
        tokens.invalidate_user_tokens.assert_awaited_once_with("user-1")

    async def test_takes_away_the_club_admin_role(self, tokens):
        member = a_member(club_role=ClubRole.ADMIN)
        use_case, _ = self.use_case(member, [member, a_member("member-2", ClubRole.ADMIN)], an_account(), tokens)

        await use_case.execute("member-1", revoked_by_member_id="member-2")

        assert member.club_role == ClubRole.MEMBER

    async def test_refuses_the_last_admin_of_the_club(self, tokens):
        member = a_member(club_role=ClubRole.ADMIN)
        use_case, users = self.use_case(member, [member], an_account(), tokens)

        with pytest.raises(LastClubAdminError):
            await use_case.execute("member-1", revoked_by_member_id="member-9")
        users.update.assert_not_awaited()

    async def test_refuses_the_callers_own_access(self, tokens):
        member = a_member()
        use_case, users = self.use_case(member, [member], an_account(), tokens)

        with pytest.raises(AccessChangeNotAllowedError):
            await use_case.execute("member-1", revoked_by_member_id="member-1")
        users.update.assert_not_awaited()

    async def test_refuses_the_super_admin_account(self, tokens):
        member = a_member()
        use_case, users = self.use_case(member, [member], an_account(global_role=GlobalRole.SUPER_ADMIN), tokens)

        with pytest.raises(AccessChangeNotAllowedError):
            await use_case.execute("member-1", revoked_by_member_id="member-9")
        users.update.assert_not_awaited()

    async def test_refuses_a_member_without_account(self, tokens):
        member = a_member()
        use_case, _ = self.use_case(member, [member], None, tokens)

        with pytest.raises(UserNotFoundError):
            await use_case.execute("member-1", revoked_by_member_id="member-9")


@pytest.mark.unit
@pytest.mark.asyncio
class TestGivingAccessAgain:

    async def test_reactivates_the_switched_off_account_with_the_new_email(self, tokens):
        member = a_member()
        users = MagicMock()
        users.find_by_member_id = AsyncMock(return_value=an_account(is_active=False))
        users.find_by_email = AsyncMock(return_value=None)
        users.update = AsyncMock(side_effect=lambda u: u)
        users.create = AsyncMock()
        mailer = MagicMock(send_account_invitation_email=AsyncMock(return_value=True))
        use_case = GrantMemberAccessUseCase(
            member_repository=member_repository(member, [member]),
            user_repository=users,
            token_repository=tokens,
            email_service=mailer,
            hash_password=lambda plain: f"hashed:{plain}",
            frontend_base_url="https://admin.example.com",
        )

        link = await use_case.execute("member-1", "Nueva@Example.com", make_club_admin=False)

        reactivated = users.update.call_args.args[0]
        assert reactivated.is_active is True
        assert reactivated.email == "nueva@example.com"
        assert link.email == "nueva@example.com"
        users.create.assert_not_awaited()
