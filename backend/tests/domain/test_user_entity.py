"""Tests for User domain entity."""

import pytest
from datetime import datetime

from src.domain.entities.user import User


@pytest.mark.domain
@pytest.mark.unit
class TestUserEntity:
    """Test suite for User entity validation and behavior."""

    def test_user_creation_with_valid_data_succeeds(self, valid_user_data):
        """Test that User entity can be created with valid data."""
        # Arrange & Act
        user = User(**valid_user_data)

        # Assert
        assert user.email == valid_user_data["email"]
        assert user.username == valid_user_data["username"]
        assert user.hashed_password == valid_user_data["hashed_password"]
        assert user.is_active is True  # Default value
        assert user.id is None  # Default value
        assert user.created_at is not None  # Auto-set in __post_init__
        assert user.updated_at is not None  # Auto-set in __post_init__

    def test_user_creation_with_all_fields_succeeds(self):
        """Test User entity creation with all fields provided."""
        # Arrange
        now = datetime.utcnow()
        user_data = {
            "id": "507f1f77bcf86cd799439011",
            "email": "test@example.com",
            "username": "testuser",
            "hashed_password": "hashed_123",
            "is_active": False,
            "created_at": now,
            "updated_at": now
        }
        
        # Act
        user = User(**user_data)
        
        # Assert
        assert user.id == user_data["id"]
        assert user.email == user_data["email"]
        assert user.username == user_data["username"]
        assert user.hashed_password == user_data["hashed_password"]
        assert user.is_active == user_data["is_active"]
        assert user.created_at == user_data["created_at"]
        assert user.updated_at == user_data["updated_at"]

    @pytest.mark.parametrize("invalid_email", ["", "   ", "invalid.email"])
    def test_user_creation_with_invalid_email_raises_value_error(self, invalid_email, valid_user_data):
        """Test that invalid email formats raise ValueError."""
        # Arrange
        invalid_data = valid_user_data.copy()
        invalid_data["email"] = invalid_email
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            User(**invalid_data)
        
        if not invalid_email.strip():
            assert "User email cannot be empty" in str(exc_info.value)
        else:
            assert "Invalid email format" in str(exc_info.value)

    @pytest.mark.parametrize("valid_email_with_at", ["@example.com", "test@", "user@domain"])  
    def test_user_creation_with_minimal_valid_email_succeeds(self, valid_email_with_at, valid_user_data):
        """Test that emails with @ symbol are considered valid (minimal validation)."""
        # Arrange
        valid_data = valid_user_data.copy()
        valid_data["email"] = valid_email_with_at
        
        # Act - Should not raise exception
        user = User(**valid_data)
        
        # Assert
        assert user.email == valid_email_with_at

    @pytest.mark.parametrize("invalid_username", ["", "   "])
    def test_user_creation_with_invalid_username_raises_value_error(self, invalid_username, valid_user_data):
        """Test that invalid usernames raise ValueError."""
        # Arrange
        invalid_data = valid_user_data.copy()
        invalid_data["username"] = invalid_username
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            User(**invalid_data)
        
        assert "User username cannot be empty" in str(exc_info.value)

    def test_user_creation_with_missing_required_fields_uses_defaults(self):
        """Test User creation with minimal required fields."""
        # Act
        user = User(email="test@example.com", username="testuser")
        
        # Assert
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.hashed_password == ""  # Default empty string
        assert user.is_active is True

    def test_activate_sets_is_active_to_true(self, user_entity):
        """Test that activate() sets is_active to True."""
        # Arrange
        user_entity.is_active = False
        
        # Act
        user_entity.activate()
        
        # Assert
        assert user_entity.is_active is True

    def test_activate_on_already_active_user_remains_true(self, user_entity):
        """Test that activate() on already active user keeps is_active True."""
        # Arrange
        user_entity.is_active = True
        
        # Act
        user_entity.activate()
        
        # Assert
        assert user_entity.is_active is True

    def test_deactivate_sets_is_active_to_false(self, user_entity):
        """Test that deactivate() sets is_active to False."""
        # Arrange
        user_entity.is_active = True
        
        # Act
        user_entity.deactivate()
        
        # Assert
        assert user_entity.is_active is False

    def test_deactivate_on_already_inactive_user_remains_false(self, user_entity):
        """Test that deactivate() on already inactive user keeps is_active False."""
        # Arrange
        user_entity.is_active = False
        
        # Act  
        user_entity.deactivate()
        
        # Assert
        assert user_entity.is_active is False

    def test_update_password_with_valid_password_succeeds(self, user_entity):
        """Test that update_password() updates the hashed password."""
        # Arrange
        new_password = "new_hashed_password_456"
        original_password = user_entity.hashed_password
        
        # Act
        user_entity.update_password(new_password)
        
        # Assert
        assert user_entity.hashed_password == new_password
        assert user_entity.hashed_password != original_password

    @pytest.mark.parametrize("invalid_password", ["", "   "])
    def test_update_password_with_invalid_password_raises_value_error(self, invalid_password, user_entity):
        """Test that update_password() with invalid password raises ValueError."""
        # Arrange
        original_password = user_entity.hashed_password
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            user_entity.update_password(invalid_password)
        
        assert "Password cannot be empty" in str(exc_info.value)
        # Ensure password was not changed
        assert user_entity.hashed_password == original_password

    def test_user_entity_equality_comparison(self, valid_user_data):
        """Test User entity equality based on key attributes."""
        # Arrange - Create users with same timestamps
        from datetime import datetime
        now = datetime.now()
        data_with_timestamps = {
            **valid_user_data,
            "created_at": now,
            "updated_at": now
        }
        user1 = User(**data_with_timestamps)
        user2 = User(**data_with_timestamps)

        # Act & Assert
        assert user1 == user2

    def test_user_entity_inequality_comparison(self, valid_user_data):
        """Test User entity inequality when attributes differ."""
        # Arrange
        user1 = User(**valid_user_data)
        different_data = valid_user_data.copy()
        different_data["username"] = "different_user"
        user2 = User(**different_data)
        
        # Act & Assert
        assert user1 != user2

    def test_user_entity_string_representation_includes_key_info(self, user_entity):
        """Test that User entity string representation is meaningful."""
        # Act
        user_str = str(user_entity)
        
        # Assert
        assert "User" in user_str
        assert user_entity.email in user_str
        assert user_entity.username in user_str

    def test_user_entity_repr_representation_includes_key_info(self, user_entity):
        """Test that User entity repr representation is meaningful."""
        # Act
        user_repr = repr(user_entity)
        
        # Assert
        assert "User" in user_repr
        assert user_entity.email in user_repr
        assert user_entity.username in user_repr

    def test_user_dataclass_field_assignment(self, user_entity):
        """Test that User dataclass fields can be directly modified."""
        # Arrange
        original_email = user_entity.email
        new_email = "newemail@example.com"
        
        # Act
        user_entity.email = new_email
        
        # Assert
        assert user_entity.email == new_email
        assert user_entity.email != original_email

    def test_user_business_methods_do_not_affect_other_fields(self, user_entity):
        """Test that business methods only change intended fields."""
        # Arrange
        original_email = user_entity.email
        original_username = user_entity.username
        original_password = user_entity.hashed_password
        
        # Act
        user_entity.activate()
        user_entity.deactivate()
        user_entity.update_password("new_password")
        
        # Assert - other fields unchanged
        assert user_entity.email == original_email
        assert user_entity.username == original_username
        # Password should have changed
        assert user_entity.hashed_password == "new_password"

    def test_user_entity_handles_unicode_characters(self):
        """Test User entity with unicode characters in fields."""
        # Arrange
        unicode_data = {
            "email": "tëst@éxample.com",
            "username": "tëstüser",
            "hashed_password": "hášhëd_123"
        }
        
        # Act
        user = User(**unicode_data)
        
        # Assert
        assert user.email == unicode_data["email"]
        assert user.username == unicode_data["username"]
        assert user.hashed_password == unicode_data["hashed_password"]

    def test_user_validation_in_post_init_called_on_creation(self, valid_user_data):
        """Test that __post_init__ validation is executed during creation."""
        # This test ensures __post_init__ is called by testing invalid data
        # Arrange
        invalid_data = valid_user_data.copy()
        invalid_data["email"] = ""  # This should trigger __post_init__ validation
        
        # Act & Assert
        with pytest.raises(ValueError):
            User(**invalid_data)

    def test_user_validation_not_called_on_field_modification(self, user_entity):
        """Test that validation is not re-run when modifying existing entity fields."""
        # This test verifies that __post_init__ validation only runs during initialization
        # Arrange & Act - Directly modify field to invalid value (bypassing __post_init__)
        user_entity.email = ""  # This should NOT trigger validation
        
        # Assert - No exception should be raised
        assert user_entity.email == ""

    @pytest.mark.parametrize("email,username,password,expected_valid", [
        ("test@example.com", "testuser", "hashed123", True),
        ("", "testuser", "hashed123", False),  # Invalid email
        ("test@example.com", "", "hashed123", False),  # Invalid username  
        ("invalid.email", "testuser", "hashed123", False),  # Invalid email format
        ("test@example.com", "testuser", "", True),  # Empty password allowed during creation
    ])
    def test_user_validation_combinations(self, email, username, password, expected_valid):
        """Test various combinations of user data validation."""
        if expected_valid:
            # Should not raise an exception
            user = User(email=email, username=username, hashed_password=password)
            assert user.email == email
            assert user.username == username
            assert user.hashed_password == password
        else:
            # Should raise ValueError
            with pytest.raises(ValueError):
                User(email=email, username=username, hashed_password=password)