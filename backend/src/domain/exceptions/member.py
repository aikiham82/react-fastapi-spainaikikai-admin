"""Member domain exceptions."""

from src.domain.exceptions.base import EntityNotFoundError, ValidationError, BusinessRuleViolationError


class MemberNotFoundError(EntityNotFoundError):
    """Raised when a member is not found."""

    def __init__(self, member_id: str):
        super().__init__("Member", member_id)


class InvalidMemberDataError(ValidationError):
    """Raised when member data is invalid."""
    pass


class MemberAlreadyExistsError(BusinessRuleViolationError):
    """Raised when trying to create a member that already exists."""
    pass


class InactiveMemberError(BusinessRuleViolationError):
    """Raised when trying to perform operations on an inactive member."""
    pass


class MemberHasActiveLicensesError(BusinessRuleViolationError):
    """Raised when trying to deactivate a member with active licenses."""
    pass


class InvalidClubForMemberError(BusinessRuleViolationError):
    """Raised when the specified club is invalid for the member."""
    pass
