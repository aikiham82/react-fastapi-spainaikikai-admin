"""FastAPI dependency injection."""

from functools import lru_cache
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from src.infrastructure.adapters.repositories.mongodb_user_repository import MongoDBUserRepository
from src.infrastructure.adapters.repositories.mongodb_club_repository import MongoDBClubRepository
from src.infrastructure.adapters.repositories.mongodb_member_repository import MongoDBMemberRepository
from src.infrastructure.adapters.repositories.mongodb_license_repository import MongoDBLicenseRepository
from src.infrastructure.adapters.repositories.mongodb_seminar_repository import MongoDBSeminarRepository
from src.infrastructure.adapters.repositories.mongodb_payment_repository import MongoDBPaymentRepository
from src.infrastructure.adapters.repositories.mongodb_insurance_repository import MongoDBInsuranceRepository
from src.infrastructure.adapters.repositories.mongodb_price_configuration_repository import MongoDBPriceConfigurationRepository
from src.infrastructure.adapters.repositories.mongodb_invoice_repository import MongoDBInvoiceRepository
from src.infrastructure.adapters.repositories.mongodb_password_reset_token_repository import MongoDBPasswordResetTokenRepository
from src.infrastructure.adapters.repositories.mongodb_member_payment_repository import MongoDBMemberPaymentRepository
from src.infrastructure.adapters.services.redsys_service import RedsysService
from src.infrastructure.adapters.services.email_service import EmailService
from src.infrastructure.adapters.services.pdf_service import PDFService
from src.infrastructure.adapters.services.license_image_service import LicenseImageService
from src.infrastructure.web.security import decode_access_token
from src.infrastructure.web.dto.user_dto import TokenData
from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError
from src.application.use_cases.user_use_cases import (
    GetAllUsersUseCase,
    GetUserByIdUseCase,
    GetUserByEmailUseCase,
    CreateUserUseCase,
    AuthenticateUserUseCase
)
from src.application.use_cases import (
    # Club use cases
    GetClubUseCase,
    GetAllClubsUseCase,
    CreateClubUseCase,
    UpdateClubUseCase,
    DeleteClubUseCase,
    # Member use cases
    GetMemberUseCase,
    GetAllMembersUseCase,
    SearchMembersUseCase,
    CreateMemberUseCase,
    UpdateMemberUseCase,
    DeleteMemberUseCase,
    ChangeMemberStatusUseCase,
    # License use cases
    GetLicenseUseCase,
    GetAllLicensesUseCase,
    GetExpiringLicensesUseCase,
    CreateLicenseUseCase,
    RenewLicenseUseCase,
    UpdateLicenseUseCase,
    DeleteLicenseUseCase,
    GenerateLicenseImageUseCase,
    # Seminar use cases
    GetSeminarUseCase,
    GetAllSeminarsUseCase,
    GetUpcomingSeminarsUseCase,
    CreateSeminarUseCase,
    UpdateSeminarUseCase,
    CancelSeminarUseCase,
    DeleteSeminarUseCase,
)
from src.application.use_cases.seminar.upload_seminar_cover_image_use_case import UploadSeminarCoverImageUseCase
from src.application.use_cases.seminar.delete_seminar_cover_image_use_case import DeleteSeminarCoverImageUseCase
from src.application.use_cases.seminar.initiate_seminar_oficialidad_use_case import InitiateSeminarOfficialidadUseCase
from src.application.use_cases import (
    # Payment use cases
    GetPaymentUseCase,
    GetAllPaymentsUseCase,
    CreatePaymentUseCase,
    InitiateRedsysPaymentUseCase,
    InitiateAnnualPaymentUseCase,
    ProcessRedsysWebhookUseCase,
    RefundPaymentUseCase,
    DeletePaymentUseCase,
    # Insurance use cases
    GetInsuranceUseCase,
    GetAllInsurancesUseCase,
    GetExpiringInsurancesUseCase,
    CreateInsuranceUseCase,
    UpdateInsuranceUseCase,
    DeleteInsuranceUseCase
)
from src.application.use_cases.price_configuration import (
    GetPriceConfigurationUseCase,
    GetAllPricesUseCase,
    CreatePriceConfigurationUseCase,
    UpdatePriceConfigurationUseCase,
    DeletePriceConfigurationUseCase,
    GetLicensePriceUseCase,
    GetAnnualPaymentPricesUseCase,
)
from src.application.use_cases.invoice import (
    GetInvoiceUseCase,
    GetAllInvoicesUseCase,
    GetInvoicesByMemberUseCase,
    DownloadInvoicePDFUseCase,
    RegenerateInvoicePDFUseCase
)
from src.application.use_cases.password_reset import (
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    ValidateResetTokenUseCase
)
from src.application.use_cases.member_payment import (
    GetMemberPaymentStatusUseCase,
    GetMemberPaymentHistoryUseCase,
    GetClubPaymentSummaryUseCase,
    GetUnpaidMembersUseCase
)
from src.application.use_cases.member_payment.get_all_clubs_payment_summary_use_case import GetAllClubsPaymentSummaryUseCase
from src.application.use_cases.payment.prefill_annual_payment_use_case import PrefillAnnualPaymentUseCase
from src.config.settings import get_app_settings

@lru_cache()
def get_user_repository() -> MongoDBUserRepository:
    """Get user repository instance."""
    return MongoDBUserRepository()

# Club repository and use cases
@lru_cache()
def get_club_repository() -> MongoDBClubRepository:
    """Get club repository instance."""
    return MongoDBClubRepository()

@lru_cache()
def get_all_clubs_use_case() -> GetAllClubsUseCase:
    """Get all clubs use case."""
    return GetAllClubsUseCase(get_club_repository())

@lru_cache()
def get_club_use_case() -> GetClubUseCase:
    """Get club use case."""
    return GetClubUseCase(get_club_repository())

@lru_cache()
def get_create_club_use_case() -> CreateClubUseCase:
    """Create club use case."""
    return CreateClubUseCase(get_club_repository())

@lru_cache()
def get_update_club_use_case() -> UpdateClubUseCase:
    """Update club use case."""
    return UpdateClubUseCase(get_club_repository())

@lru_cache()
def get_delete_club_use_case() -> DeleteClubUseCase:
    """Delete club use case."""
    return DeleteClubUseCase(get_club_repository())

# Member repository and use cases
@lru_cache()
def get_member_repository() -> MongoDBMemberRepository:
    """Get member repository instance."""
    return MongoDBMemberRepository()

@lru_cache()
def get_all_members_use_case() -> GetAllMembersUseCase:
    """Get all members use case."""
    return GetAllMembersUseCase(get_member_repository())

@lru_cache()
def get_member_use_case() -> GetMemberUseCase:
    """Get member use case."""
    return GetMemberUseCase(get_member_repository())

@lru_cache()
def get_search_members_use_case() -> SearchMembersUseCase:
    """Search members use case."""
    return SearchMembersUseCase(get_member_repository())

@lru_cache()
def get_create_member_use_case() -> CreateMemberUseCase:
    """Create member use case."""
    return CreateMemberUseCase(get_member_repository(), get_club_repository())

@lru_cache()
def get_update_member_use_case() -> UpdateMemberUseCase:
    """Update member use case."""
    return UpdateMemberUseCase(get_member_repository())

@lru_cache()
def get_delete_member_use_case() -> DeleteMemberUseCase:
    """Delete member use case."""
    return DeleteMemberUseCase(get_member_repository())

@lru_cache()
def get_change_member_status_use_case() -> ChangeMemberStatusUseCase:
    """Change member status use case."""
    return ChangeMemberStatusUseCase(get_member_repository())

# License repository and use cases
@lru_cache()
def get_license_repository() -> MongoDBLicenseRepository:
    """Get license repository instance."""
    return MongoDBLicenseRepository()

@lru_cache()
def get_all_licenses_use_case() -> GetAllLicensesUseCase:
    """Get all licenses use case."""
    return GetAllLicensesUseCase(get_license_repository())

@lru_cache()
def get_license_use_case() -> GetLicenseUseCase:
    """Get license use case."""
    return GetLicenseUseCase(get_license_repository())

@lru_cache()
def get_expiring_licenses_use_case() -> GetExpiringLicensesUseCase:
    """Get expiring licenses use case."""
    return GetExpiringLicensesUseCase(get_license_repository())

@lru_cache()
def get_create_license_use_case() -> CreateLicenseUseCase:
    """Create license use case."""
    return CreateLicenseUseCase(get_license_repository())

@lru_cache()
def get_renew_license_use_case() -> RenewLicenseUseCase:
    """Renew license use case."""
    return RenewLicenseUseCase(get_license_repository())

@lru_cache()
def get_update_license_use_case() -> UpdateLicenseUseCase:
    """Update license use case."""
    return UpdateLicenseUseCase(get_license_repository())

@lru_cache()
def get_delete_license_use_case() -> DeleteLicenseUseCase:
    """Delete license use case."""
    return DeleteLicenseUseCase(get_license_repository())

@lru_cache()
def get_license_image_service() -> LicenseImageService:
    """Get license image service instance."""
    return LicenseImageService()

@lru_cache()
def get_generate_license_image_use_case() -> GenerateLicenseImageUseCase:
    """Generate license image use case."""
    return GenerateLicenseImageUseCase(
        get_license_repository(),
        get_member_repository(),
        get_license_image_service()
    )

# Seminar repository and use cases
@lru_cache()
def get_seminar_repository() -> MongoDBSeminarRepository:
    """Get seminar repository instance."""
    return MongoDBSeminarRepository()

@lru_cache()
def get_all_seminars_use_case() -> GetAllSeminarsUseCase:
    """Get all seminars use case."""
    return GetAllSeminarsUseCase(get_seminar_repository())

@lru_cache()
def get_seminar_use_case() -> GetSeminarUseCase:
    """Get seminar use case."""
    return GetSeminarUseCase(get_seminar_repository())

@lru_cache()
def get_upcoming_seminars_use_case() -> GetUpcomingSeminarsUseCase:
    """Get upcoming seminars use case."""
    return GetUpcomingSeminarsUseCase(get_seminar_repository())

@lru_cache()
def get_create_seminar_use_case() -> CreateSeminarUseCase:
    """Create seminar use case."""
    return CreateSeminarUseCase(get_seminar_repository())

@lru_cache()
def get_update_seminar_use_case() -> UpdateSeminarUseCase:
    """Update seminar use case."""
    return UpdateSeminarUseCase(get_seminar_repository())

@lru_cache()
def get_cancel_seminar_use_case() -> CancelSeminarUseCase:
    """Cancel seminar use case."""
    return CancelSeminarUseCase(get_seminar_repository())

@lru_cache()
def get_delete_seminar_use_case() -> DeleteSeminarUseCase:
    """Delete seminar use case."""
    return DeleteSeminarUseCase(get_seminar_repository())

@lru_cache()
def get_upload_seminar_cover_image_use_case() -> UploadSeminarCoverImageUseCase:
    """Upload seminar cover image use case."""
    return UploadSeminarCoverImageUseCase(get_seminar_repository())

@lru_cache()
def get_delete_seminar_cover_image_use_case() -> DeleteSeminarCoverImageUseCase:
    """Delete seminar cover image use case."""
    return DeleteSeminarCoverImageUseCase(get_seminar_repository())

@lru_cache()
def get_initiate_seminar_oficialidad_use_case() -> InitiateSeminarOfficialidadUseCase:
    """Initiate seminar oficialidad payment use case."""
    return InitiateSeminarOfficialidadUseCase(
        seminar_repository=get_seminar_repository(),
        payment_repository=get_payment_repository(),
        price_configuration_repository=get_price_configuration_repository(),
        redsys_service=get_redsys_service(),
    )

# Payment repository and use cases
@lru_cache()
def get_payment_repository() -> MongoDBPaymentRepository:
    """Get payment repository instance."""
    return MongoDBPaymentRepository()

@lru_cache()
def get_all_payments_use_case() -> GetAllPaymentsUseCase:
    """Get all payments use case."""
    return GetAllPaymentsUseCase(get_payment_repository())

@lru_cache()
def get_payment_use_case() -> GetPaymentUseCase:
    """Get payment use case."""
    return GetPaymentUseCase(get_payment_repository())

@lru_cache()
def get_create_payment_use_case() -> CreatePaymentUseCase:
    """Create payment use case."""
    return CreatePaymentUseCase(get_payment_repository())

@lru_cache()
def get_redsys_service() -> RedsysService:
    """Get Redsys service instance."""
    return RedsysService()

@lru_cache()
def get_email_service() -> EmailService:
    """Get email service instance."""
    return EmailService()

@lru_cache()
def get_pdf_service() -> PDFService:
    """Get PDF service instance."""
    return PDFService()

@lru_cache()
def get_initiate_redsys_payment_use_case() -> InitiateRedsysPaymentUseCase:
    """Initiate Redsys payment use case."""
    return InitiateRedsysPaymentUseCase(
        get_payment_repository(),
        get_redsys_service()
    )

@lru_cache()
def get_initiate_annual_payment_use_case() -> InitiateAnnualPaymentUseCase:
    """Initiate annual payment use case."""
    return InitiateAnnualPaymentUseCase(
        get_payment_repository(),
        get_redsys_service(),
        get_price_configuration_repository(),
        get_member_payment_repository(),
    )

@lru_cache()
def get_prefill_annual_payment_use_case() -> PrefillAnnualPaymentUseCase:
    """Prefill annual payment use case."""
    return PrefillAnnualPaymentUseCase(
        get_member_repository(),
        get_license_repository(),
        get_insurance_repository(),
        get_payment_repository(),
        get_member_payment_repository(),
    )

@lru_cache()
def get_process_redsys_webhook_use_case() -> ProcessRedsysWebhookUseCase:
    """Process Redsys webhook use case."""
    return ProcessRedsysWebhookUseCase(
        payment_repository=get_payment_repository(),
        redsys_service=get_redsys_service(),
        invoice_repository=get_invoice_repository(),
        license_repository=get_license_repository(),
        insurance_repository=get_insurance_repository(),
        member_repository=get_member_repository(),
        member_payment_repository=get_member_payment_repository(),
        email_service=get_email_service(),
        pdf_service=get_pdf_service(),
        price_configuration_repository=get_price_configuration_repository(),
        seminar_repository=get_seminar_repository(),
    )

@lru_cache()
def get_refund_payment_use_case() -> RefundPaymentUseCase:
    """Refund payment use case."""
    return RefundPaymentUseCase(get_payment_repository())

@lru_cache()
def get_delete_payment_use_case() -> DeletePaymentUseCase:
    """Delete payment use case."""
    return DeletePaymentUseCase(get_payment_repository())

# Insurance repository and use cases
@lru_cache()
def get_insurance_repository() -> MongoDBInsuranceRepository:
    """Get insurance repository instance."""
    return MongoDBInsuranceRepository()

@lru_cache()
def get_all_insurances_use_case() -> GetAllInsurancesUseCase:
    """Get all insurances use case."""
    return GetAllInsurancesUseCase(
        get_insurance_repository(),
        get_member_repository()
    )

@lru_cache()
def get_insurance_use_case() -> GetInsuranceUseCase:
    """Get insurance use case."""
    return GetInsuranceUseCase(get_insurance_repository())

@lru_cache()
def get_expiring_insurances_use_case() -> GetExpiringInsurancesUseCase:
    """Get expiring insurances use case."""
    return GetExpiringInsurancesUseCase(get_insurance_repository())

@lru_cache()
def get_create_insurance_use_case() -> CreateInsuranceUseCase:
    """Create insurance use case."""
    return CreateInsuranceUseCase(get_insurance_repository())

@lru_cache()
def get_update_insurance_use_case() -> UpdateInsuranceUseCase:
    """Update insurance use case."""
    return UpdateInsuranceUseCase(get_insurance_repository())

@lru_cache()
def get_delete_insurance_use_case() -> DeleteInsuranceUseCase:
    """Delete insurance use case."""
    return DeleteInsuranceUseCase(get_insurance_repository())

# Price configuration repository and use cases
@lru_cache()
def get_price_configuration_repository() -> MongoDBPriceConfigurationRepository:
    """Get price configuration repository instance."""
    return MongoDBPriceConfigurationRepository()

@lru_cache()
def get_all_prices_use_case() -> GetAllPricesUseCase:
    """Get all prices use case."""
    return GetAllPricesUseCase(get_price_configuration_repository())

@lru_cache()
def get_price_configuration_use_case() -> GetPriceConfigurationUseCase:
    """Get price configuration use case."""
    return GetPriceConfigurationUseCase(get_price_configuration_repository())

@lru_cache()
def get_create_price_configuration_use_case() -> CreatePriceConfigurationUseCase:
    """Create price configuration use case."""
    return CreatePriceConfigurationUseCase(get_price_configuration_repository())

@lru_cache()
def get_update_price_configuration_use_case() -> UpdatePriceConfigurationUseCase:
    """Update price configuration use case."""
    return UpdatePriceConfigurationUseCase(get_price_configuration_repository())

@lru_cache()
def get_delete_price_configuration_use_case() -> DeletePriceConfigurationUseCase:
    """Delete price configuration use case."""
    return DeletePriceConfigurationUseCase(get_price_configuration_repository())

@lru_cache()
def get_license_price_use_case() -> GetLicensePriceUseCase:
    """Get license price use case."""
    return GetLicensePriceUseCase(get_price_configuration_repository())

@lru_cache()
def get_annual_payment_prices_use_case() -> GetAnnualPaymentPricesUseCase:
    """Get annual payment prices use case."""
    return GetAnnualPaymentPricesUseCase(get_price_configuration_repository())

# Invoice repository and use cases
@lru_cache()
def get_invoice_repository() -> MongoDBInvoiceRepository:
    """Get invoice repository instance."""
    return MongoDBInvoiceRepository()

@lru_cache()
def get_all_invoices_use_case() -> GetAllInvoicesUseCase:
    """Get all invoices use case."""
    return GetAllInvoicesUseCase(get_invoice_repository())

@lru_cache()
def get_invoice_use_case() -> GetInvoiceUseCase:
    """Get invoice use case."""
    return GetInvoiceUseCase(get_invoice_repository())

@lru_cache()
def get_invoices_by_member_use_case() -> GetInvoicesByMemberUseCase:
    """Get invoices by member use case."""
    return GetInvoicesByMemberUseCase(get_invoice_repository())

@lru_cache()
def get_download_invoice_pdf_use_case() -> DownloadInvoicePDFUseCase:
    """Download invoice PDF use case."""
    return DownloadInvoicePDFUseCase(
        get_invoice_repository(),
        get_pdf_service()
    )

@lru_cache()
def get_regenerate_invoice_pdf_use_case() -> RegenerateInvoicePDFUseCase:
    """Regenerate invoice PDF use case."""
    return RegenerateInvoicePDFUseCase(
        get_invoice_repository(),
        get_pdf_service()
    )

# User use case dependencies
def get_all_users_use_case() -> GetAllUsersUseCase:
    """Get all users use case."""
    return GetAllUsersUseCase(get_user_repository())


def get_user_by_id_use_case() -> GetUserByIdUseCase:
    """Get user by ID use case."""
    return GetUserByIdUseCase(get_user_repository())


def get_user_by_email_use_case() -> GetUserByEmailUseCase:
    """Get user by email use case."""
    return GetUserByEmailUseCase(get_user_repository())


def get_create_user_use_case() -> CreateUserUseCase:
    """Get create user use case."""
    return CreateUserUseCase(get_user_repository())


def get_authenticate_user_use_case() -> AuthenticateUserUseCase:
    """Get authenticate user use case."""
    return AuthenticateUserUseCase(get_user_repository())


# Authentication dependencies
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_by_email_use_case: GetUserByEmailUseCase = Depends(get_user_by_email_use_case)
) -> User:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    try:
        # In JWT, we store the email as the subject
        user = await user_by_email_use_case.execute(email=username)
    except UserNotFoundError:
        raise credentials_exception
        
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Import AuthContext for the new authentication pattern
from src.infrastructure.web.authorization import AuthContext


async def get_auth_context(
    current_user: User = Depends(get_current_active_user),
    member_repository: MongoDBMemberRepository = Depends(get_member_repository)
) -> AuthContext:
    """Get authentication context with user and linked member.

    This dependency loads the Member associated with the User (if any)
    and returns an AuthContext that can be used for authorization decisions.
    """
    member = None
    if current_user.member_id:
        member = await member_repository.find_by_id(current_user.member_id)

    return AuthContext(user=current_user, member=member)


# Password reset repository and use cases
@lru_cache()
def get_password_reset_token_repository() -> MongoDBPasswordResetTokenRepository:
    """Get password reset token repository instance."""
    return MongoDBPasswordResetTokenRepository()


@lru_cache()
def get_request_password_reset_use_case() -> RequestPasswordResetUseCase:
    """Get request password reset use case."""
    app_settings = get_app_settings()
    return RequestPasswordResetUseCase(
        user_repository=get_user_repository(),
        token_repository=get_password_reset_token_repository(),
        email_service=get_email_service(),
        frontend_base_url=app_settings.frontend_base_url
    )


@lru_cache()
def get_reset_password_use_case() -> ResetPasswordUseCase:
    """Get reset password use case."""
    return ResetPasswordUseCase(
        user_repository=get_user_repository(),
        token_repository=get_password_reset_token_repository()
    )


@lru_cache()
def get_validate_reset_token_use_case() -> ValidateResetTokenUseCase:
    """Get validate reset token use case."""
    return ValidateResetTokenUseCase(
        token_repository=get_password_reset_token_repository()
    )


# Member payment repository and use cases
@lru_cache()
def get_member_payment_repository() -> MongoDBMemberPaymentRepository:
    """Get member payment repository instance."""
    return MongoDBMemberPaymentRepository()


@lru_cache()
def get_member_payment_status_use_case() -> GetMemberPaymentStatusUseCase:
    """Get member payment status use case."""
    return GetMemberPaymentStatusUseCase(
        member_payment_repository=get_member_payment_repository(),
        member_repository=get_member_repository()
    )


@lru_cache()
def get_member_payment_history_use_case() -> GetMemberPaymentHistoryUseCase:
    """Get member payment history use case."""
    return GetMemberPaymentHistoryUseCase(
        member_payment_repository=get_member_payment_repository(),
        member_repository=get_member_repository()
    )


@lru_cache()
def get_club_payment_summary_use_case() -> GetClubPaymentSummaryUseCase:
    """Get club payment summary use case."""
    return GetClubPaymentSummaryUseCase(
        member_payment_repository=get_member_payment_repository(),
        club_repository=get_club_repository(),
        member_repository=get_member_repository(),
        license_repository=get_license_repository(),
    )


@lru_cache()
def get_unpaid_members_use_case() -> GetUnpaidMembersUseCase:
    """Get unpaid members use case."""
    return GetUnpaidMembersUseCase(
        member_payment_repository=get_member_payment_repository(),
        member_repository=get_member_repository()
    )


@lru_cache()
def get_all_clubs_payment_summary_use_case() -> GetAllClubsPaymentSummaryUseCase:
    """Get all clubs payment summary use case."""
    return GetAllClubsPaymentSummaryUseCase(
        member_payment_repository=get_member_payment_repository(),
        club_repository=get_club_repository(),
        member_repository=get_member_repository()
    )