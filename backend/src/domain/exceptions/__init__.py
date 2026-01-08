"""Domain exceptions module."""

from .base import DomainException, EntityNotFoundError, ValidationError, BusinessRuleViolationError
from .user import UserNotFoundError, InvalidUserDataError, UserAlreadyExistsError, InactiveUserError
from .association import (
    AssociationNotFoundError, InvalidAssociationDataError,
    AssociationAlreadyExistsError, InactiveAssociationError
)
from .club import (
    ClubNotFoundError, InvalidClubDataError,
    ClubAlreadyExistsError, InactiveClubError, ClubHasActiveMembersError
)
from .member import (
    MemberNotFoundError, InvalidMemberDataError,
    MemberAlreadyExistsError, InactiveMemberError,
    MemberHasActiveLicensesError, InvalidClubForMemberError
)
from .license import (
    LicenseNotFoundError, InvalidLicenseDataError,
    LicenseAlreadyExistsError, ExpiredLicenseError,
    RevokedLicenseError, InvalidLicenseRenewalError,
    LicenseAlreadyRenewedError
)
from .seminar import (
    SeminarNotFoundError, InvalidSeminarDataError,
    SeminarAlreadyExistsError, CancelledSeminarError,
    CompletedSeminarError, SeminarIsFullError, InvalidSeminarDatesError
)
from .payment import (
    PaymentNotFoundError, InvalidPaymentDataError,
    PaymentAlreadyExistsError, InvalidPaymentStatusError,
    PaymentAlreadyCompletedError, PaymentNotRefundableError,
    InvalidRefundAmountError, RedsysPaymentError
)
from .insurance import (
    InsuranceNotFoundError, InvalidInsuranceDataError,
    InsuranceAlreadyExistsError, ExpiredInsuranceError,
    CancelledInsuranceError, InvalidInsuranceDatesError,
    InsuranceNotActiveError
)

__all__ = [
    "DomainException",
    "EntityNotFoundError",
    "ValidationError",
    "BusinessRuleViolationError",
    "UserNotFoundError", "InvalidUserDataError", "UserAlreadyExistsError", "InactiveUserError",
    "AssociationNotFoundError", "InvalidAssociationDataError",
    "AssociationAlreadyExistsError", "InactiveAssociationError",
    "ClubNotFoundError", "InvalidClubDataError",
    "ClubAlreadyExistsError", "InactiveClubError", "ClubHasActiveMembersError",
    "MemberNotFoundError", "InvalidMemberDataError",
    "MemberAlreadyExistsError", "InactiveMemberError",
    "MemberHasActiveLicensesError", "InvalidClubForMemberError",
    "LicenseNotFoundError", "InvalidLicenseDataError",
    "LicenseAlreadyExistsError", "ExpiredLicenseError",
    "RevokedLicenseError", "InvalidLicenseRenewalError", "LicenseAlreadyRenewedError",
    "SeminarNotFoundError", "InvalidSeminarDataError",
    "SeminarAlreadyExistsError", "CancelledSeminarError",
    "CompletedSeminarError", "SeminarIsFullError", "InvalidSeminarDatesError",
    "PaymentNotFoundError", "InvalidPaymentDataError",
    "PaymentAlreadyExistsError", "InvalidPaymentStatusError",
    "PaymentAlreadyCompletedError", "PaymentNotRefundableError",
    "InvalidRefundAmountError", "RedsysPaymentError",
    "InsuranceNotFoundError", "InvalidInsuranceDataError",
    "InsuranceAlreadyExistsError", "ExpiredInsuranceError",
    "CancelledInsuranceError", "InvalidInsuranceDatesError", "InsuranceNotActiveError"
]