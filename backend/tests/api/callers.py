"""Authentication contexts shared by the authorization tests."""

from types import SimpleNamespace

from src.domain.entities.member import ClubRole
from src.domain.entities.user import GlobalRole, User
from src.infrastructure.web.authorization import AuthContext

OWN_CLUB = "club-own"
OTHER_CLUB = "club-other"
OWN_MEMBER = "member-own"
FOREIGN_MEMBER = "member-foreign"
CLUB_BY_MEMBER = {OWN_MEMBER: OWN_CLUB, FOREIGN_MEMBER: OTHER_CLUB}


def _user(global_role=GlobalRole.USER, member_id=None) -> User:
    return User(
        id="user-id",
        email="user@example.com",
        username="user",
        hashed_password="hash",
        global_role=global_role,
        member_id=member_id,
    )


def super_admin() -> AuthContext:
    return AuthContext(user=_user(GlobalRole.SUPER_ADMIN))


def club_admin(club_id=OWN_CLUB) -> AuthContext:
    return AuthContext(
        user=_user(member_id="member-admin"),
        member=SimpleNamespace(club_role=ClubRole.ADMIN, club_id=club_id),
    )


def plain_member(member_id=OWN_MEMBER) -> AuthContext:
    return AuthContext(
        user=_user(member_id=member_id),
        member=SimpleNamespace(club_role=ClubRole.MEMBER, club_id=OWN_CLUB),
    )


class MembersByClub:
    """Member repository double that knows which club each member belongs to."""

    async def find_by_id(self, member_id):
        club_id = CLUB_BY_MEMBER.get(member_id)
        return SimpleNamespace(id=member_id, club_id=club_id) if club_id else None

    async def find_by_club_id(self, club_id, limit=0):
        return [
            SimpleNamespace(id=member_id, club_id=club)
            for member_id, club in CLUB_BY_MEMBER.items() if club == club_id
        ]
