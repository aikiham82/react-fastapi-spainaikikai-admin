# Ports - Interfaces for adapters

from .repositories import UserRepositoryPort
from .news_repository import NewsRepository
from .association_repository import AssociationRepositoryPort
from .club_repository import ClubRepositoryPort
from .member_repository import MemberRepositoryPort
from .license_repository import LicenseRepositoryPort
from .seminar_repository import SeminarRepositoryPort
from .payment_repository import PaymentRepositoryPort
from .insurance_repository import InsuranceRepositoryPort

__all__ = [
    "UserRepositoryPort",
    "NewsRepository",
    "AssociationRepositoryPort",
    "ClubRepositoryPort",
    "MemberRepositoryPort",
    "LicenseRepositoryPort",
    "SeminarRepositoryPort",
    "PaymentRepositoryPort",
    "InsuranceRepositoryPort"
]
