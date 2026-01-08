"""Application use cases for all entities."""

# Association Use Cases
from .association.get_association_use_case import GetAssociationUseCase
from .association.get_all_associations_use_case import GetAllAssociationsUseCase
from .association.create_association_use_case import CreateAssociationUseCase
from .association.update_association_use_case import UpdateAssociationUseCase
from .association.delete_association_use_case import DeleteAssociationUseCase

# Club Use Cases
from .club.get_club_use_case import GetClubUseCase
from .club.get_all_clubs_use_case import GetAllClubsUseCase
from .club.create_club_use_case import CreateClubUseCase
from .club.update_club_use_case import UpdateClubUseCase
from .club.delete_club_use_case import DeleteClubUseCase

# Member Use Cases
from .member.get_member_use_case import GetMemberUseCase
from .member.get_all_members_use_case import GetAllMembersUseCase
from .member.search_members_use_case import SearchMembersUseCase
from .member.create_member_use_case import CreateMemberUseCase
from .member.update_member_use_case import UpdateMemberUseCase
from .member.delete_member_use_case import DeleteMemberUseCase

# License Use Cases
from .license.get_license_use_case import GetLicenseUseCase
from .license.get_all_licenses_use_case import GetAllLicensesUseCase
from .license.get_expiring_licenses_use_case import GetExpiringLicensesUseCase
from .license.create_license_use_case import CreateLicenseUseCase
from .license.renew_license_use_case import RenewLicenseUseCase
from .license.update_license_use_case import UpdateLicenseUseCase
from .license.delete_license_use_case import DeleteLicenseUseCase

# Seminar Use Cases
from .seminar.get_seminar_use_case import GetSeminarUseCase
from .seminar.get_all_seminars_use_case import GetAllSeminarsUseCase
from .seminar.get_upcoming_seminars_use_case import GetUpcomingSeminarsUseCase
from .seminar.create_seminar_use_case import CreateSeminarUseCase
from .seminar.update_seminar_use_case import UpdateSeminarUseCase
from .seminar.cancel_seminar_use_case import CancelSeminarUseCase
from .seminar.delete_seminar_use_case import DeleteSeminarUseCase

# Payment Use Cases
from .payment.get_payment_use_case import GetPaymentUseCase
from .payment.get_all_payments_use_case import GetAllPaymentsUseCase
from .payment.create_payment_use_case import CreatePaymentUseCase
from .payment.initiate_redsys_payment_use_case import InitiateRedsysPaymentUseCase
from .payment.process_redsys_webhook_use_case import ProcessRedsysWebhookUseCase
from .payment.refund_payment_use_case import RefundPaymentUseCase
from .payment.delete_payment_use_case import DeletePaymentUseCase

# Insurance Use Cases
from .insurance.get_insurance_use_case import GetInsuranceUseCase
from .insurance.get_all_insurances_use_case import GetAllInsurancesUseCase
from .insurance.get_expiring_insurances_use_case import GetExpiringInsurancesUseCase
from .insurance.create_insurance_use_case import CreateInsuranceUseCase
from .insurance.update_insurance_use_case import UpdateInsuranceUseCase
from .insurance.delete_insurance_use_case import DeleteInsuranceUseCase

__all__ = [
    # Association
    "GetAssociationUseCase", "GetAllAssociationsUseCase",
    "CreateAssociationUseCase", "UpdateAssociationUseCase",
    "DeleteAssociationUseCase",
    # Club
    "GetClubUseCase", "GetAllClubsUseCase",
    "CreateClubUseCase", "UpdateClubUseCase",
    "DeleteClubUseCase",
    # Member
    "GetMemberUseCase", "GetAllMembersUseCase",
    "SearchMembersUseCase",
    "CreateMemberUseCase", "UpdateMemberUseCase",
    "DeleteMemberUseCase",
    # License
    "GetLicenseUseCase", "GetAllLicensesUseCase",
    "GetExpiringLicensesUseCase",
    "CreateLicenseUseCase", "RenewLicenseUseCase",
    "UpdateLicenseUseCase", "DeleteLicenseUseCase",
    # Seminar
    "GetSeminarUseCase", "GetAllSeminarsUseCase",
    "GetUpcomingSeminarsUseCase",
    "CreateSeminarUseCase", "UpdateSeminarUseCase",
    "CancelSeminarUseCase", "DeleteSeminarUseCase",
    # Payment
    "GetPaymentUseCase", "GetAllPaymentsUseCase",
    "CreatePaymentUseCase", "InitiateRedsysPaymentUseCase",
    "ProcessRedsysWebhookUseCase", "RefundPaymentUseCase",
    "DeletePaymentUseCase",
    # Insurance
    "GetInsuranceUseCase", "GetAllInsurancesUseCase",
    "GetExpiringInsurancesUseCase",
    "CreateInsuranceUseCase", "UpdateInsuranceUseCase",
    "DeleteInsuranceUseCase"
]
