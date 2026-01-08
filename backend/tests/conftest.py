"""Test configuration for pytest."""

import pytest
from datetime import datetime

from src.infrastructure.database import get_database
from src.infrastructure.adapters.repositories.mongodb_association_repository import MongoDBAssociationRepository
from src.infrastructure.adapters.repositories.mongodb_club_repository import MongoDBClubRepository
from src.infrastructure.adapters.repositories.mongodb_member_repository import MongoDBMemberRepository
from src.infrastructure.adapters.repositories.mongodb_license_repository import MongoDBLicenseRepository
from src.infrastructure.adapters.repositories.mongodb_seminar_repository import MongoDBSeminarRepository
from src.infrastructure.adapters.repositories.mongodb_payment_repository import MongoDBPaymentRepository
from src.infrastructure.adapters.repositories.mongodb_insurance_repository import MongoDBInsuranceRepository


@pytest.fixture(scope="function")
def db():
    """Database fixture for testing."""
    yield get_database()


@pytest.fixture(scope="function")
def association_repository(db):
    """Association repository fixture."""
    return MongoDBAssociationRepository()


@pytest.fixture(scope="function")
def club_repository(db):
    """Club repository fixture."""
    return MongoDBClubRepository()


@pytest.fixture(scope="function")
def member_repository(db):
    """Member repository fixture."""
    return MongoDBMemberRepository()


@pytest.fixture(scope="function")
def license_repository(db):
    """License repository fixture."""
    return MongoDBLicenseRepository()


@pytest.fixture(scope="function")
def seminar_repository(db):
    """Seminar repository fixture."""
    return MongoDBSeminarRepository()


@pytest.fixture(scope="function")
def payment_repository(db):
    """Payment repository fixture."""
    return MongoDBPaymentRepository()


@pytest.fixture(scope="function")
def insurance_repository(db):
    """Insurance repository fixture."""
    return MongoDBInsuranceRepository()


@pytest.fixture(scope="function")
def current_time():
    """Current time fixture for timestamps."""
    return datetime.utcnow()
