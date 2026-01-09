"""FastAPI dependency injection."""

from functools import lru_cache
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from src.infrastructure.adapters.repositories.mongodb_user_repository import MongoDBUserRepository
from src.infrastructure.adapters.repositories.mongodb_news_repository import MongoDBNewsRepository
from src.infrastructure.adapters.repositories.mongodb_association_repository import MongoDBAssociationRepository
from src.infrastructure.adapters.repositories.mongodb_club_repository import MongoDBClubRepository
from src.infrastructure.adapters.repositories.mongodb_member_repository import MongoDBMemberRepository
from src.infrastructure.adapters.repositories.mongodb_license_repository import MongoDBLicenseRepository
from src.infrastructure.adapters.repositories.mongodb_seminar_repository import MongoDBSeminarRepository
from src.infrastructure.adapters.repositories.mongodb_payment_repository import MongoDBPaymentRepository
from src.infrastructure.adapters.repositories.mongodb_insurance_repository import MongoDBInsuranceRepository
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
    # Association use cases
    GetAssociationUseCase,
    GetAllAssociationsUseCase,
    CreateAssociationUseCase,
    UpdateAssociationUseCase,
    DeleteAssociationUseCase,
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
    # License use cases
    GetLicenseUseCase,
    GetAllLicensesUseCase,
    GetExpiringLicensesUseCase,
    CreateLicenseUseCase,
    RenewLicenseUseCase,
    UpdateLicenseUseCase,
    DeleteLicenseUseCase,
    # Seminar use cases
    GetSeminarUseCase,
    GetAllSeminarsUseCase,
    GetUpcomingSeminarsUseCase,
    CreateSeminarUseCase,
    UpdateSeminarUseCase,
    CancelSeminarUseCase,
    DeleteSeminarUseCase,
    # Payment use cases
    GetPaymentUseCase,
    GetAllPaymentsUseCase,
    CreatePaymentUseCase,
    InitiateRedsysPaymentUseCase,
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
from src.infrastructure.database import get_database

@lru_cache()
def get_user_repository() -> MongoDBUserRepository:
    """Get user repository instance."""
    return MongoDBUserRepository()

@lru_cache()
def get_news_repository() -> MongoDBNewsRepository:
    """Get news repository instance."""
    return MongoDBNewsRepository(get_database())

# Association repository and use cases
@lru_cache()
def get_association_repository() -> MongoDBAssociationRepository:
    """Get association repository instance."""
    return MongoDBAssociationRepository()

@lru_cache()
def get_all_associations_use_case() -> GetAllAssociationsUseCase:
    """Get all associations use case."""
    return GetAllAssociationsUseCase(get_association_repository())

@lru_cache()
def get_association_use_case() -> GetAssociationUseCase:
    """Get association use case."""
    return GetAssociationUseCase(get_association_repository())

@lru_cache()
def get_create_association_use_case() -> CreateAssociationUseCase:
    """Create association use case."""
    return CreateAssociationUseCase(get_association_repository())

@lru_cache()
def get_update_association_use_case() -> UpdateAssociationUseCase:
    """Update association use case."""
    return UpdateAssociationUseCase(get_association_repository())

@lru_cache()
def get_delete_association_use_case() -> DeleteAssociationUseCase:
    """Delete association use case."""
    return DeleteAssociationUseCase(get_association_repository())

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
def get_initiate_redsys_payment_use_case() -> InitiateRedsysPaymentUseCase:
    """Initiate Redsys payment use case."""
    return InitiateRedsysPaymentUseCase(get_payment_repository())

@lru_cache()
def get_process_redsys_webhook_use_case() -> ProcessRedsysWebhookUseCase:
    """Process Redsys webhook use case."""
    return ProcessRedsysWebhookUseCase(get_payment_repository())

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
    return GetAllInsurancesUseCase(get_insurance_repository())

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