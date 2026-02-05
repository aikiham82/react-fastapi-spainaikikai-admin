"""Tests for User DTOs."""

import pytest
from datetime import datetime
from pydantic import ValidationError

from src.infrastructure.web.dto.user_dto import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserLogin,
    Token,
    TokenData
)


@pytest.mark.api
@pytest.mark.unit
class TestUserBase:
    """Test suite for UserBase DTO."""

    def test_user_base_creation_with_valid_data_succeeds(self):
        """Test that UserBase can be created with valid data."""
        # Arrange
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "is_active": True
        }
        
        # Act
        user_base = UserBase(**data)
        
        # Assert
        assert user_base.email == data["email"]
        assert user_base.username == data["username"]
        assert user_base.is_active == data["is_active"]

    def test_user_base_creation_with_default_is_active(self):
        """Test that UserBase uses default is_active value."""
        # Arrange
        data = {
            "email": "test@example.com",
            "username": "testuser"
        }
        
        # Act
        user_base = UserBase(**data)
        
        # Assert
        assert user_base.is_active is True  # Default value

    @pytest.mark.parametrize("invalid_email", [
        "invalid.email",
        "@example.com",
        "test@",
        "plaintext",
        ""
    ])
    def test_user_base_creation_with_invalid_email_raises_validation_error(self, invalid_email):
        """Test that UserBase raises ValidationError for invalid emails."""
        # Arrange
        data = {
            "email": invalid_email,
            "username": "testuser"
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            UserBase(**data)
        
        assert "email" in str(exc_info.value).lower()

    def test_user_base_serialization_to_dict(self):
        """Test that UserBase can be serialized to dictionary."""
        # Arrange
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "is_active": False
        }
        expected = {
            "email": "test@example.com",
            "username": "testuser",
            "is_active": False,
            "global_role": "user",
            "member_id": None,
            "role": None
        }
        user_base = UserBase(**data)

        # Act
        serialized = user_base.model_dump()

        # Assert
        assert serialized == expected

    def test_user_base_json_serialization(self):
        """Test that UserBase can be serialized to JSON."""
        # Arrange
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "is_active": True
        }
        user_base = UserBase(**data)
        
        # Act
        json_str = user_base.model_dump_json()
        
        # Assert
        assert isinstance(json_str, str)
        assert "test@example.com" in json_str
        assert "testuser" in json_str


@pytest.mark.api
@pytest.mark.unit
class TestUserCreate:
    """Test suite for UserCreate DTO."""

    def test_user_create_creation_with_valid_data_succeeds(self, user_create_data):
        """Test that UserCreate can be created with valid data."""
        # Act
        user_create = UserCreate(**user_create_data)
        
        # Assert
        assert user_create.email == user_create_data["email"]
        assert user_create.username == user_create_data["username"]
        assert user_create.password == user_create_data["password"]

    @pytest.mark.parametrize("invalid_email", [
        "invalid.email",
        "@example.com",
        "test@",
        ""
    ])
    def test_user_create_with_invalid_email_raises_validation_error(self, invalid_email):
        """Test that UserCreate raises ValidationError for invalid emails."""
        # Arrange
        data = {
            "email": invalid_email,
            "username": "testuser",
            "password": "password123"
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**data)
        
        assert "email" in str(exc_info.value).lower()

    @pytest.mark.parametrize("short_password", [
        "12345",    # 5 chars
        "pass",     # 4 chars
        "a",        # 1 char
        ""          # Empty
    ])
    def test_user_create_with_short_password_raises_validation_error(self, short_password):
        """Test that UserCreate raises ValidationError for passwords shorter than 6 characters."""
        # Arrange
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": short_password
        }
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**data)
        
        error_message = str(exc_info.value).lower()
        assert "password" in error_message
        assert ("at least 6 characters" in error_message or 
                "string too short" in error_message or 
                "min_length" in error_message)

    def test_user_create_with_minimum_valid_password_succeeds(self):
        """Test that UserCreate accepts exactly 6 character passwords."""
        # Arrange
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "123456"  # Exactly 6 chars
        }
        
        # Act
        user_create = UserCreate(**data)
        
        # Assert
        assert user_create.password == "123456"

    def test_user_create_with_long_password_succeeds(self):
        """Test that UserCreate accepts long passwords."""
        # Arrange
        long_password = "very_long_password_with_special_chars_123!@#"
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": long_password
        }
        
        # Act
        user_create = UserCreate(**data)
        
        # Assert
        assert user_create.password == long_password

    def test_user_create_missing_required_fields_raises_validation_error(self):
        """Test that UserCreate raises ValidationError when required fields are missing."""
        # Test missing email
        with pytest.raises(ValidationError):
            UserCreate(username="testuser", password="password123")
        
        # Test missing username
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com", password="password123")
        
        # Test missing password
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com", username="testuser")


@pytest.mark.api
@pytest.mark.unit
class TestUserUpdate:
    """Test suite for UserUpdate DTO."""

    def test_user_update_with_all_optional_fields_succeeds(self):
        """Test that UserUpdate can be created with all optional fields."""
        # Arrange
        data = {
            "email": "updated@example.com",
            "username": "updated_user",
            "is_active": False
        }
        
        # Act
        user_update = UserUpdate(**data)
        
        # Assert
        assert user_update.email == data["email"]
        assert user_update.username == data["username"]
        assert user_update.is_active == data["is_active"]

    def test_user_update_with_partial_fields_succeeds(self):
        """Test that UserUpdate can be created with partial fields."""
        # Test with only email
        update1 = UserUpdate(email="new@example.com")
        assert update1.email == "new@example.com"
        assert update1.username is None
        assert update1.is_active is None
        
        # Test with only username
        update2 = UserUpdate(username="newuser")
        assert update2.email is None
        assert update2.username == "newuser"
        assert update2.is_active is None
        
        # Test with only is_active
        update3 = UserUpdate(is_active=False)
        assert update3.email is None
        assert update3.username is None
        assert update3.is_active is False

    def test_user_update_with_no_fields_succeeds(self):
        """Test that UserUpdate can be created with no fields (all None)."""
        # Act
        user_update = UserUpdate()
        
        # Assert
        assert user_update.email is None
        assert user_update.username is None
        assert user_update.is_active is None

    def test_user_update_with_invalid_email_raises_validation_error(self):
        """Test that UserUpdate raises ValidationError for invalid email."""
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(email="invalid.email")
        
        assert "email" in str(exc_info.value).lower()

    def test_user_update_serialization_excludes_none_values(self):
        """Test that UserUpdate serialization can exclude None values."""
        # Arrange
        user_update = UserUpdate(email="test@example.com")
        
        # Act
        serialized = user_update.model_dump(exclude_none=True)
        
        # Assert
        assert "email" in serialized
        assert "username" not in serialized
        assert "is_active" not in serialized


@pytest.mark.api
@pytest.mark.unit
class TestUserResponse:
    """Test suite for UserResponse DTO."""

    def test_user_response_creation_with_all_fields_succeeds(self):
        """Test that UserResponse can be created with all required fields."""
        # Arrange
        now = datetime.utcnow()
        data = {
            "id": "507f1f77bcf86cd799439011",
            "email": "test@example.com",
            "username": "testuser",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        # Act
        user_response = UserResponse(**data)
        
        # Assert
        assert user_response.id == data["id"]
        assert user_response.email == data["email"]
        assert user_response.username == data["username"]
        assert user_response.is_active == data["is_active"]
        assert user_response.created_at == data["created_at"]
        assert user_response.updated_at == data["updated_at"]

    def test_user_response_allows_optional_fields_to_be_none(self):
        """Test that UserResponse allows optional fields (id, timestamps) to be None."""
        # Test missing id (should be allowed)
        response = UserResponse(
            email="test@example.com",
            username="testuser",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        assert response.id is None
        
        # Test missing created_at (should be allowed)
        response = UserResponse(
            id="123",
            email="test@example.com", 
            username="testuser",
            is_active=True,
            updated_at=datetime.utcnow()
        )
        assert response.created_at is None

    def test_user_response_inherits_from_user_base(self):
        """Test that UserResponse inherits from UserBase."""
        # Assert
        assert issubclass(UserResponse, UserBase)

    def test_user_response_json_serialization_includes_timestamps(self):
        """Test that UserResponse JSON serialization includes timestamp fields."""
        # Arrange
        now = datetime.utcnow()
        data = {
            "id": "507f1f77bcf86cd799439011",
            "email": "test@example.com",
            "username": "testuser",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        user_response = UserResponse(**data)
        
        # Act
        json_str = user_response.model_dump_json()
        
        # Assert
        assert isinstance(json_str, str)
        assert "507f1f77bcf86cd799439011" in json_str
        assert "created_at" in json_str
        assert "updated_at" in json_str


@pytest.mark.api
@pytest.mark.unit
class TestUserLogin:
    """Test suite for UserLogin DTO."""

    def test_user_login_creation_with_valid_data_succeeds(self, user_login_data):
        """Test that UserLogin can be created with valid data."""
        # Act
        user_login = UserLogin(**user_login_data)
        
        # Assert
        assert user_login.username == user_login_data["username"]
        assert user_login.password == user_login_data["password"]

    def test_user_login_missing_required_fields_raises_validation_error(self):
        """Test that UserLogin raises ValidationError when required fields are missing."""
        # Test missing username
        with pytest.raises(ValidationError):
            UserLogin(password="password123")
        
        # Test missing password
        with pytest.raises(ValidationError):
            UserLogin(username="testuser")

    def test_user_login_with_email_as_username_succeeds(self):
        """Test that UserLogin accepts email as username field."""
        # Arrange
        data = {
            "username": "test@example.com",
            "password": "password123"
        }
        
        # Act
        user_login = UserLogin(**data)
        
        # Assert
        assert user_login.username == "test@example.com"
        assert user_login.password == "password123"

    def test_user_login_with_empty_strings_raises_validation_error(self):
        """Test that UserLogin raises ValidationError for empty strings."""
        # Test empty username
        with pytest.raises(ValidationError):
            UserLogin(username="", password="password123")
        
        # Test empty password
        with pytest.raises(ValidationError):
            UserLogin(username="testuser", password="")


@pytest.mark.api
@pytest.mark.unit
class TestToken:
    """Test suite for Token DTO."""

    def test_token_creation_with_valid_data_succeeds(self):
        """Test that Token can be created with valid data."""
        # Arrange
        data = {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample.token",
            "token_type": "bearer"
        }
        
        # Act
        token = Token(**data)
        
        # Assert
        assert token.access_token == data["access_token"]
        assert token.token_type == data["token_type"]

    def test_token_creation_with_default_token_type_succeeds(self):
        """Test that Token uses default token_type."""
        # Arrange
        data = {
            "access_token": "sample.jwt.token"
        }
        
        # Act
        token = Token(**data)
        
        # Assert
        assert token.access_token == data["access_token"]
        assert token.token_type == "bearer"  # Default value

    def test_token_missing_access_token_raises_validation_error(self):
        """Test that Token raises ValidationError when access_token is missing."""
        # Act & Assert
        with pytest.raises(ValidationError):
            Token(token_type="bearer")

    def test_token_with_custom_token_type_succeeds(self):
        """Test that Token accepts custom token_type."""
        # Arrange
        data = {
            "access_token": "custom.token",
            "token_type": "custom"
        }
        
        # Act
        token = Token(**data)
        
        # Assert
        assert token.token_type == "custom"


@pytest.mark.api
@pytest.mark.unit
class TestTokenData:
    """Test suite for TokenData DTO."""

    def test_token_data_creation_with_username_succeeds(self):
        """Test that TokenData can be created with username."""
        # Arrange
        data = {
            "username": "testuser"
        }
        
        # Act
        token_data = TokenData(**data)
        
        # Assert
        assert token_data.username == data["username"]

    def test_token_data_creation_with_no_username_succeeds(self):
        """Test that TokenData can be created without username (None)."""
        # Act
        token_data = TokenData()
        
        # Assert
        assert token_data.username is None

    def test_token_data_creation_with_explicit_none_succeeds(self):
        """Test that TokenData can be created with explicit None username."""
        # Act
        token_data = TokenData(username=None)
        
        # Assert
        assert token_data.username is None

    def test_token_data_with_email_as_username_succeeds(self):
        """Test that TokenData accepts email as username."""
        # Arrange
        data = {
            "username": "test@example.com"
        }
        
        # Act
        token_data = TokenData(**data)
        
        # Assert
        assert token_data.username == "test@example.com"


@pytest.mark.api
@pytest.mark.unit
class TestUserDTOsIntegration:
    """Integration tests for User DTOs."""

    def test_user_create_to_user_response_data_flow(self):
        """Test data flow from UserCreate to UserResponse."""
        # Arrange
        create_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "password123"
        }
        user_create = UserCreate(**create_data)
        
        # Simulate processing and creating response
        now = datetime.utcnow()
        response_data = {
            "id": "507f1f77bcf86cd799439011",
            "email": user_create.email,
            "username": user_create.username,
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        # Act
        user_response = UserResponse(**response_data)
        
        # Assert
        assert user_response.email == user_create.email
        assert user_response.username == user_create.username
        assert user_response.is_active is True

    def test_user_login_to_token_data_flow(self):
        """Test data flow from UserLogin to TokenData."""
        # Arrange
        login_data = {
            "username": "testuser",
            "password": "password123"
        }
        user_login = UserLogin(**login_data)
        
        # Act - Simulate authentication success
        token_data = TokenData(username=user_login.username)
        
        # Assert
        assert token_data.username == user_login.username

    def test_all_dtos_serialization_compatibility(self):
        """Test that all DTOs can be serialized without issues."""
        # Arrange
        now = datetime.utcnow()
        dtos = [
            UserBase(email="test@example.com", username="testuser"),
            UserCreate(email="test@example.com", username="testuser", password="password123"),
            UserUpdate(email="updated@example.com"),
            UserResponse(
                id="123", 
                email="test@example.com", 
                username="testuser",
                is_active=True,
                created_at=now,
                updated_at=now
            ),
            UserLogin(username="testuser", password="password123"),
            Token(access_token="sample.token"),
            TokenData(username="testuser")
        ]
        
        # Act & Assert
        for dto in dtos:
            # Should not raise any exceptions
            json_str = dto.model_dump_json()
            assert isinstance(json_str, str)
            assert len(json_str) > 0
            
            dict_repr = dto.model_dump()
            assert isinstance(dict_repr, dict)

    @pytest.mark.parametrize("dto_class,test_data", [
        (UserBase, {"email": "test@example.com", "username": "testuser"}),
        (UserCreate, {"email": "test@example.com", "username": "testuser", "password": "password123"}),
        (UserLogin, {"username": "testuser", "password": "password123"}),
        (Token, {"access_token": "sample.token"}),
        (TokenData, {"username": "testuser"})
    ])
    def test_dto_round_trip_serialization(self, dto_class, test_data):
        """Test round-trip serialization (create -> serialize -> deserialize)."""
        # Arrange
        original_dto = dto_class(**test_data)
        
        # Act - Serialize and deserialize
        serialized = original_dto.model_dump()
        recreated_dto = dto_class(**serialized)
        
        # Assert
        assert original_dto.model_dump() == recreated_dto.model_dump()