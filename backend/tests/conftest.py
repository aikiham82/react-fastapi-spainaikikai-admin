"""Test configuration for pytest."""

import pytest
from datetime import datetime

from src.infrastructure.database import get_database
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


# User entity fixtures
@pytest.fixture
def valid_user_data():
    """Valid user data for testing."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashed_password_123"
    }


@pytest.fixture
def user_entity():
    """User entity instance for testing."""
    from src.domain.entities.user import User
    return User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_password_123",
        is_active=True
    )


# Member entity fixtures
@pytest.fixture
def valid_member_data():
    """Valid member data for testing."""
    return {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "dni": "12345678A",
        "phone": "+34612345678",
        "club_id": "club-123",
        "birth_date": datetime(1990, 1, 15)
    }


@pytest.fixture
def member_entity():
    """Member entity instance for testing."""
    from src.domain.entities.member import Member, MemberStatus
    return Member(
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        dni="12345678A",
        phone="+34612345678",
        club_id="club-123",
        birth_date=datetime(1990, 1, 15),
        status=MemberStatus.ACTIVE
    )


# Mock database fixtures
@pytest.fixture
def mock_database():
    """Mock MongoDB database for testing."""
    from unittest.mock import AsyncMock, MagicMock
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_collection.find = MagicMock(return_value=AsyncMock())
    mock_collection.find_one = AsyncMock(return_value=None)
    mock_collection.insert_one = AsyncMock()
    mock_collection.update_one = AsyncMock()
    mock_collection.delete_one = AsyncMock()
    mock_collection.count_documents = AsyncMock(return_value=0)
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)
    mock_db.users = mock_collection
    return mock_db


@pytest.fixture
def user_document():
    """Sample user document as stored in MongoDB."""
    from bson import ObjectId
    return {
        "_id": ObjectId("507f1f77bcf86cd799439011"),
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": "hashed_password_123",
        "is_active": True,
        "club_id": None,
        "created_at": datetime(2024, 1, 1, 12, 0, 0),
        "updated_at": datetime(2024, 1, 1, 12, 0, 0)
    }


@pytest.fixture
def user_entity_with_id():
    """User entity with ID for testing."""
    from src.domain.entities.user import User
    return User(
        id="507f1f77bcf86cd799439011",
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_password_123",
        is_active=True,
        created_at=datetime(2024, 1, 1, 12, 0, 0),
        updated_at=datetime(2024, 1, 1, 12, 0, 0)
    )


@pytest.fixture
def user_documents_list():
    """List of user documents for testing find_all."""
    from bson import ObjectId
    return [
        {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "email": "user1@example.com",
            "username": "user1",
            "hashed_password": "hashed_password_1",
            "is_active": True,
            "club_id": None,
            "created_at": datetime(2024, 1, 1, 12, 0, 0),
            "updated_at": datetime(2024, 1, 1, 12, 0, 0)
        },
        {
            "_id": ObjectId("507f1f77bcf86cd799439012"),
            "email": "user2@example.com",
            "username": "user2",
            "hashed_password": "hashed_password_2",
            "is_active": True,
            "club_id": None,
            "created_at": datetime(2024, 1, 2, 12, 0, 0),
            "updated_at": datetime(2024, 1, 2, 12, 0, 0)
        },
        {
            "_id": ObjectId("507f1f77bcf86cd799439013"),
            "email": "user3@example.com",
            "username": "user3",
            "hashed_password": "hashed_password_3",
            "is_active": False,
            "club_id": None,
            "created_at": datetime(2024, 1, 3, 12, 0, 0),
            "updated_at": datetime(2024, 1, 3, 12, 0, 0)
        }
    ]


@pytest.fixture
def mock_mongo_collection(mock_database):
    """Mock MongoDB collection for testing."""
    from unittest.mock import AsyncMock, MagicMock
    mock_collection = MagicMock()

    # Setup cursor mock for find operations
    cursor_mock = MagicMock()
    cursor_mock.limit = MagicMock(return_value=cursor_mock)
    cursor_mock.to_list = AsyncMock(return_value=[])
    mock_collection.find = MagicMock(return_value=cursor_mock)

    # Setup other async methods
    mock_collection.find_one = AsyncMock(return_value=None)
    mock_collection.insert_one = AsyncMock()
    mock_collection.update_one = AsyncMock()
    mock_collection.delete_one = AsyncMock()
    mock_collection.count_documents = AsyncMock(return_value=0)

    # Make the mock_database return this collection
    mock_database.__getitem__ = MagicMock(return_value=mock_collection)
    mock_database.users = mock_collection

    return mock_collection


@pytest.fixture
def mock_user_repository():
    """Mock user repository for use case testing."""
    from unittest.mock import AsyncMock, MagicMock
    mock_repo = MagicMock()
    mock_repo.find_all = AsyncMock(return_value=[])
    mock_repo.find_by_id = AsyncMock(return_value=None)
    mock_repo.find_by_email = AsyncMock(return_value=None)
    mock_repo.find_by_username = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()
    mock_repo.update = AsyncMock()
    mock_repo.delete = AsyncMock(return_value=True)
    mock_repo.exists = AsyncMock(return_value=False)
    return mock_repo


@pytest.fixture
def test_users_list():
    """List of User entities for testing."""
    from src.domain.entities.user import User
    return [
        User(
            id="507f1f77bcf86cd799439011",
            email="user1@example.com",
            username="user1",
            hashed_password="hashed_password_1",
            is_active=True,
            created_at=datetime(2024, 1, 1, 12, 0, 0),
            updated_at=datetime(2024, 1, 1, 12, 0, 0)
        ),
        User(
            id="507f1f77bcf86cd799439012",
            email="user2@example.com",
            username="user2",
            hashed_password="hashed_password_2",
            is_active=True,
            created_at=datetime(2024, 1, 2, 12, 0, 0),
            updated_at=datetime(2024, 1, 2, 12, 0, 0)
        ),
        User(
            id="507f1f77bcf86cd799439013",
            email="user3@example.com",
            username="user3",
            hashed_password="hashed_password_3",
            is_active=False,
            created_at=datetime(2024, 1, 3, 12, 0, 0),
            updated_at=datetime(2024, 1, 3, 12, 0, 0)
        )
    ]


# DTO test fixtures
@pytest.fixture
def user_create_data():
    """Valid UserCreate DTO data for testing."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "password123"
    }


@pytest.fixture
def user_login_data():
    """Valid UserLogin DTO data for testing."""
    return {
        "username": "testuser",
        "password": "password123"
    }


@pytest.fixture
def user_response_data():
    """Valid UserResponse DTO data for testing."""
    return {
        "id": "507f1f77bcf86cd799439011",
        "email": "test@example.com",
        "username": "testuser",
        "is_active": True,
        "club_id": None,
        "created_at": datetime(2024, 1, 1, 12, 0, 0),
        "updated_at": datetime(2024, 1, 1, 12, 0, 0)
    }
