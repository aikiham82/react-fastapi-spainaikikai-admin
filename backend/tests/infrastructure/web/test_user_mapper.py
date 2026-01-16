"""Tests for User mappers."""

import pytest
from datetime import datetime
from typing import List

from src.domain.entities.user import User
from src.infrastructure.web.dto.user_dto import UserResponse
from src.infrastructure.web.mappers import UserMapper


@pytest.mark.api
@pytest.mark.unit
class TestUserMapper:
    """Test suite for UserMapper."""

    def test_to_response_converts_user_entity_to_user_response_dto(self, user_entity_with_id):
        """Test that to_response converts User entity to UserResponse DTO."""
        # Act
        response = UserMapper.to_response(user_entity_with_id)
        
        # Assert
        assert isinstance(response, UserResponse)
        assert response.id == user_entity_with_id.id
        assert response.email == user_entity_with_id.email
        assert response.username == user_entity_with_id.username
        assert response.is_active == user_entity_with_id.is_active
        assert response.created_at == user_entity_with_id.created_at
        assert response.updated_at == user_entity_with_id.updated_at

    def test_to_response_with_user_without_id_handles_none_id(self, user_entity):
        """Test that to_response handles User entity without ID."""
        # Arrange
        user_entity.id = None
        
        # Act
        response = UserMapper.to_response(user_entity)
        
        # Assert
        assert isinstance(response, UserResponse)
        assert response.id is None
        assert response.email == user_entity.email
        assert response.username == user_entity.username

    def test_to_response_with_user_without_timestamps_handles_none_timestamps(self, user_entity):
        """Test that to_response handles User entity without timestamps."""
        # Arrange
        user_entity.created_at = None
        user_entity.updated_at = None
        
        # Act
        response = UserMapper.to_response(user_entity)
        
        # Assert
        assert isinstance(response, UserResponse)
        assert response.created_at is None
        assert response.updated_at is None

    def test_to_response_with_active_user(self, user_entity_with_id):
        """Test that to_response correctly maps active user."""
        # Arrange
        user_entity_with_id.is_active = True
        
        # Act
        response = UserMapper.to_response(user_entity_with_id)
        
        # Assert
        assert response.is_active is True

    def test_to_response_with_inactive_user(self, user_entity_with_id):
        """Test that to_response correctly maps inactive user."""
        # Arrange
        user_entity_with_id.is_active = False
        
        # Act
        response = UserMapper.to_response(user_entity_with_id)
        
        # Assert
        assert response.is_active is False

    def test_to_response_preserves_all_user_data_exactly(self):
        """Test that to_response preserves all user data without modification."""
        # Arrange
        now = datetime.utcnow()
        user = User(
            id="507f1f77bcf86cd799439011",
            email="specific@example.com",
            username="specific_user",
            hashed_password="specific_hash_123",
            is_active=False,
            created_at=now,
            updated_at=now
        )
        
        # Act
        response = UserMapper.to_response(user)
        
        # Assert - Verify exact data preservation
        assert response.id == "507f1f77bcf86cd799439011"
        assert response.email == "specific@example.com"
        assert response.username == "specific_user"
        assert response.is_active is False
        assert response.created_at == now
        assert response.updated_at == now

    def test_to_response_with_unicode_characters(self):
        """Test that to_response handles unicode characters properly."""
        # Arrange
        user = User(
            id="123",
            email="tëst@éxample.com",
            username="tëstüser",
            hashed_password="hash",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Act
        response = UserMapper.to_response(user)
        
        # Assert
        assert response.email == "tëst@éxample.com"
        assert response.username == "tëstüser"

    def test_to_response_list_converts_empty_list(self):
        """Test that to_response_list converts empty list correctly."""
        # Arrange
        empty_list = []
        
        # Act
        response_list = UserMapper.to_response_list(empty_list)
        
        # Assert
        assert isinstance(response_list, list)
        assert len(response_list) == 0

    def test_to_response_list_converts_single_user_list(self, user_entity_with_id):
        """Test that to_response_list converts single-item list correctly."""
        # Arrange
        user_list = [user_entity_with_id]
        
        # Act
        response_list = UserMapper.to_response_list(user_list)
        
        # Assert
        assert isinstance(response_list, list)
        assert len(response_list) == 1
        assert isinstance(response_list[0], UserResponse)
        assert response_list[0].id == user_entity_with_id.id
        assert response_list[0].email == user_entity_with_id.email

    def test_to_response_list_converts_multiple_users_list(self, test_users_list):
        """Test that to_response_list converts multiple users correctly."""
        # Act
        response_list = UserMapper.to_response_list(test_users_list)
        
        # Assert
        assert isinstance(response_list, list)
        assert len(response_list) == len(test_users_list)
        
        for i, response in enumerate(response_list):
            assert isinstance(response, UserResponse)
            assert response.id == test_users_list[i].id
            assert response.email == test_users_list[i].email
            assert response.username == test_users_list[i].username
            assert response.is_active == test_users_list[i].is_active

    def test_to_response_list_preserves_order(self, test_users_list):
        """Test that to_response_list preserves the order of users."""
        # Act
        response_list = UserMapper.to_response_list(test_users_list)
        
        # Assert
        for i, response in enumerate(response_list):
            assert response.email == test_users_list[i].email
            assert response.username == test_users_list[i].username

    def test_to_response_list_with_mixed_user_states(self):
        """Test to_response_list with users in different states."""
        # Arrange
        now = datetime.utcnow()
        users = [
            User(
                id="1", 
                email="active@example.com", 
                username="active_user",
                hashed_password="hash1",
                is_active=True,
                created_at=now,
                updated_at=now
            ),
            User(
                id="2", 
                email="inactive@example.com", 
                username="inactive_user",
                hashed_password="hash2",
                is_active=False,
                created_at=now,
                updated_at=now
            ),
            User(
                id=None,  # User without ID
                email="no-id@example.com", 
                username="no_id_user",
                hashed_password="hash3",
                is_active=True,
                created_at=None,
                updated_at=None
            )
        ]
        
        # Act
        response_list = UserMapper.to_response_list(users)
        
        # Assert
        assert len(response_list) == 3
        
        # First user (active with ID)
        assert response_list[0].id == "1"
        assert response_list[0].is_active is True
        
        # Second user (inactive with ID)
        assert response_list[1].id == "2"
        assert response_list[1].is_active is False
        
        # Third user (no ID)
        assert response_list[2].id is None
        assert response_list[2].is_active is True

    def test_to_response_list_with_large_list_performance(self):
        """Test to_response_list performance with large list of users."""
        # Arrange - Create large list of users
        large_user_list = []
        now = datetime.utcnow()
        
        for i in range(100):
            user = User(
                id=f"user_{i}",
                email=f"user{i}@example.com",
                username=f"user{i}",
                hashed_password=f"hash_{i}",
                is_active=i % 2 == 0,  # Alternate active/inactive
                created_at=now,
                updated_at=now
            )
            large_user_list.append(user)
        
        # Act
        response_list = UserMapper.to_response_list(large_user_list)
        
        # Assert
        assert len(response_list) == 100
        assert all(isinstance(response, UserResponse) for response in response_list)
        
        # Spot check a few items
        assert response_list[0].username == "user0"
        assert response_list[50].username == "user50"
        assert response_list[99].username == "user99"

    def test_to_response_static_method_does_not_require_instance(self):
        """Test that to_response is a static method and doesn't require instance."""
        # Arrange
        user = User(
            id="123",
            email="test@example.com",
            username="testuser",
            hashed_password="hash",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Act - Call without creating UserMapper instance
        response = UserMapper.to_response(user)
        
        # Assert
        assert isinstance(response, UserResponse)
        assert response.email == "test@example.com"

    def test_to_response_list_static_method_does_not_require_instance(self, test_users_list):
        """Test that to_response_list is a static method and doesn't require instance."""
        # Act - Call without creating UserMapper instance
        response_list = UserMapper.to_response_list(test_users_list)
        
        # Assert
        assert isinstance(response_list, list)
        assert len(response_list) == len(test_users_list)

    @pytest.mark.parametrize("field_name,field_value", [
        ("id", "custom_id_123"),
        ("email", "custom@email.com"),
        ("username", "custom_username"),
        ("is_active", False),
    ])
    def test_to_response_field_mapping_accuracy(self, field_name, field_value):
        """Parametrized test for accurate field mapping."""
        # Arrange
        now = datetime.utcnow()
        user_data = {
            "id": "default_id",
            "email": "default@example.com",
            "username": "default_user",
            "hashed_password": "hash",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        user_data[field_name] = field_value
        user = User(**user_data)
        
        # Act
        response = UserMapper.to_response(user)
        
        # Assert
        assert getattr(response, field_name) == field_value

    def test_mapper_handles_user_with_all_none_optional_fields(self):
        """Test that mapper handles User with optional fields.

        Note: User entity auto-sets created_at and updated_at in __post_init__,
        so they will never actually be None after entity creation.
        """
        # Arrange
        user = User(
            id=None,
            email="test@example.com",
            username="testuser",
            hashed_password="hash",
            is_active=True,  # Required field
            created_at=None,
            updated_at=None
        )

        # Act
        response = UserMapper.to_response(user)

        # Assert
        assert response.id is None
        # User entity auto-sets timestamps in __post_init__, so they won't be None
        assert response.created_at is not None
        assert response.updated_at is not None
        assert response.email == "test@example.com"
        assert response.username == "testuser"
        assert response.is_active is True


@pytest.mark.api
@pytest.mark.unit
class TestUserMapperErrorHandling:
    """Test suite for UserMapper error handling."""

    def test_to_response_with_none_user_raises_attribute_error(self):
        """Test that to_response raises AttributeError when user is None."""
        # Act & Assert
        with pytest.raises(AttributeError):
            UserMapper.to_response(None)

    def test_to_response_list_with_none_list_raises_type_error(self):
        """Test that to_response_list raises TypeError when list is None."""
        # Act & Assert
        with pytest.raises(TypeError):
            UserMapper.to_response_list(None)

    def test_to_response_list_with_list_containing_none_raises_attribute_error(self, user_entity_with_id):
        """Test that to_response_list raises AttributeError when list contains None."""
        # Arrange
        user_list = [user_entity_with_id, None]
        
        # Act & Assert
        with pytest.raises(AttributeError):
            UserMapper.to_response_list(user_list)

    def test_to_response_list_with_non_user_objects_raises_attribute_error(self):
        """Test that to_response_list raises AttributeError with non-User objects."""
        # Arrange
        invalid_list = ["not_a_user", {"also": "not_a_user"}]
        
        # Act & Assert
        with pytest.raises(AttributeError):
            UserMapper.to_response_list(invalid_list)


@pytest.mark.api
@pytest.mark.unit
class TestUserMapperIntegration:
    """Integration tests for UserMapper with different scenarios."""

    def test_mapper_round_trip_data_integrity(self, user_entity_with_id):
        """Test data integrity through mapping operations."""
        # Act
        response = UserMapper.to_response(user_entity_with_id)
        
        # Assert - All data should be preserved exactly
        assert response.id == user_entity_with_id.id
        assert response.email == user_entity_with_id.email
        assert response.username == user_entity_with_id.username
        assert response.is_active == user_entity_with_id.is_active
        assert response.created_at == user_entity_with_id.created_at
        assert response.updated_at == user_entity_with_id.updated_at

    def test_mapper_with_real_world_user_data_patterns(self):
        """Test mapper with realistic user data patterns."""
        # Arrange - Various realistic user scenarios
        users = [
            # New user (no timestamps)
            User(id="1", email="new@example.com", username="newuser", hashed_password="hash"),
            # Established user (with timestamps)
            User(
                id="2", 
                email="old@example.com", 
                username="olduser", 
                hashed_password="hash",
                created_at=datetime(2023, 1, 1),
                updated_at=datetime(2023, 6, 1)
            ),
            # Inactive user
            User(
                id="3", 
                email="inactive@example.com", 
                username="inactive", 
                hashed_password="hash",
                is_active=False
            ),
            # User with special characters
            User(
                id="4", 
                email="spëcial@éxample.com", 
                username="spëcial_user", 
                hashed_password="hash"
            )
        ]
        
        # Act
        responses = UserMapper.to_response_list(users)
        
        # Assert
        assert len(responses) == 4

        # New user - timestamps are auto-set by User entity __post_init__
        assert responses[0].id == "1"
        assert responses[0].created_at is not None

        # Established user
        assert responses[1].created_at == datetime(2023, 1, 1)
        assert responses[1].updated_at == datetime(2023, 6, 1)
        
        # Inactive user
        assert responses[2].is_active is False
        
        # Special characters
        assert responses[3].email == "spëcial@éxample.com"
        assert responses[3].username == "spëcial_user"

    def test_mapper_performance_with_concurrent_operations(self, test_users_list):
        """Test mapper performance and correctness with concurrent-like operations."""
        # Act - Simulate multiple simultaneous mapping operations
        results = []
        for _ in range(10):
            response_list = UserMapper.to_response_list(test_users_list)
            results.append(response_list)
        
        # Assert - All results should be identical
        first_result = results[0]
        for result in results[1:]:
            assert len(result) == len(first_result)
            for i, response in enumerate(result):
                assert response.id == first_result[i].id
                assert response.email == first_result[i].email
                assert response.username == first_result[i].username

    def test_mapper_memory_efficiency_with_large_datasets(self):
        """Test that mapper doesn't hold references to original objects."""
        # Arrange
        original_users = [
            User(
                id=f"user_{i}",
                email=f"user{i}@example.com",
                username=f"user{i}",
                hashed_password="hash",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            for i in range(50)
        ]
        
        # Act
        responses = UserMapper.to_response_list(original_users)
        
        # Modify original users
        for user in original_users:
            user.email = "modified@example.com"
        
        # Assert - Responses should not be affected by original user modifications
        for response in responses:
            assert "user" in response.email  # Should still have original email pattern
            assert response.email != "modified@example.com"