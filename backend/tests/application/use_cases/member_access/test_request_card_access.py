"""Tests for a member activating their card by themselves."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.member import Member, MemberStatus
from src.domain.entities.user import User
from src.application.use_cases.member_access import RequestCardAccessUseCase


def a_member(member_id="m1", email="ana@example.com", status=MemberStatus.ACTIVE, last_name="Ejemplo") -> Member:
    return Member(id=member_id, first_name="Ana", last_name=last_name, email=email, club_id="club-1", status=status)


def a_login(email="ana@example.com", member_id="other") -> User:
    return User(id="u-old", email=email, username=email, hashed_password="h", member_id=member_id)


def setup(members, logins=()):
    member_repo = MagicMock()
    member_repo.claim_card_access = AsyncMock(return_value=True)
    member_repo.find_all_by_email = AsyncMock(side_effect=lambda email: [m for m in members if m.email.lower() == email and not m.is_club_account_placeholder])
    user_repo = MagicMock()
    user_repo.find_by_email = AsyncMock(side_effect=lambda email: next((u for u in logins if u.email == email), None))
    user_repo.find_by_username_loose = AsyncMock(side_effect=lambda name: [u for u in logins if u.username.lower() == name])
    user_repo.find_by_member_id = AsyncMock(side_effect=lambda mid: next((u for u in logins if u.member_id == mid), None))
    user_repo.create = AsyncMock(side_effect=lambda u: User(**{**u.__dict__, "id": "u-new"}))
    tokens = MagicMock()
    tokens.invalidate_user_tokens = AsyncMock(return_value=0)
    tokens.create = AsyncMock(side_effect=lambda t: t)
    mailer = MagicMock()
    mailer.send_card_activation_email = AsyncMock(return_value=True)
    use_case = RequestCardAccessUseCase(member_repo, user_repo, tokens, mailer, lambda pw: "hashed", "https://admin.example.com")
    return use_case, user_repo, mailer, member_repo


@pytest.mark.unit
@pytest.mark.asyncio
class TestRequestCardAccess:

    async def test_a_member_with_their_own_email_gets_an_account_and_the_link(self):
        use_case, users, mailer, *_ = setup([a_member()])

        await use_case.execute(" Ana@Example.com ")

        created = users.create.await_args.args[0]
        assert (created.email, created.member_id, created.is_active) == ("ana@example.com", "m1", True)
        mailer.send_card_activation_email.assert_awaited_once()
        kwargs = mailer.send_card_activation_email.await_args.kwargs
        assert kwargs["to_email"] == "ana@example.com"
        assert kwargs["url"].startswith("https://admin.example.com/reset-password?token=")

    async def test_the_new_account_does_not_manage_the_club(self):
        member = a_member()
        use_case, *_ = setup([member])

        await use_case.execute("ana@example.com")

        assert member.is_club_admin is False

    @pytest.mark.parametrize("members, logins", [
        ([a_member("m1"), a_member("m2")], ()),
        ([a_member()], (a_login(member_id="m1"),)),
        ([a_member()], (a_login(),)),
        ([a_member()], (User(id="u-x", email="other@example.com", username="Ana@Example.com", hashed_password="h"),)),
        ([], ()),
        ([a_member(status=MemberStatus.INACTIVE)], ()),
        ([a_member(last_name="(Club Admin)")], ()),
    ], ids=["shared email", "member has an account", "email used as a login", "email used as a user name", "unknown email", "member de baja", "club placeholder"])
    async def test_nothing_is_created_otherwise(self, members, logins):
        use_case, users, mailer, *_ = setup(members, logins)

        await use_case.execute("ana@example.com")

        users.create.assert_not_called()
        mailer.send_card_activation_email.assert_not_called()

    async def test_a_member_who_already_manages_the_club_gets_nothing(self):
        from src.domain.entities.member import ClubRole
        manager = a_member()
        manager.club_role = ClubRole.ADMIN
        use_case, users, mailer, *_ = setup([manager])

        await use_case.execute("ana@example.com")

        users.create.assert_not_called()
        mailer.send_card_activation_email.assert_not_called()

    async def test_only_the_request_that_claims_the_member_creates_the_account(self):
        use_case, users, mailer, members = setup([a_member()])
        members.claim_card_access = AsyncMock(return_value=False)

        await use_case.execute("ana@example.com")

        users.create.assert_not_called()
        members.claim_card_access.assert_awaited_once_with("m1")

    async def test_a_failed_delivery_is_not_reported(self):
        use_case, _, mailer, *_ = setup([a_member()])
        mailer.send_card_activation_email = AsyncMock(side_effect=RuntimeError("smtp down"))

        await use_case.execute("ana@example.com")
