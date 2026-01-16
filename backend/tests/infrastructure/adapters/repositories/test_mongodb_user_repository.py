"""Tests for MongoDB User Repository."""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime
from bson import ObjectId

from src.domain.entities.user import User
from src.infrastructure.adapters.repositories.mongodb_user_repository import MongoDBUserRepository


@pytest.mark.asyncio
@pytest.mark.repository
@pytest.mark.integration
class TestMongoDBUserRepository:
    """Test suite for MongoDB User Repository."""

    @pytest.fixture
    def repository(self, mock_mongo_collection, mock_database):
        """Create repository instance with mocked database.

        Note: mock_mongo_collection must be created before repository
        so the collection mock is properly set up.
        """
        with patch('src.infrastructure.adapters.repositories.mongodb_user_repository.get_database', return_value=mock_database):
            return MongoDBUserRepository()

    @pytest.mark.unit
    def test_to_domain_converts_document_to_user_entity(self, repository, user_document):
        """Test that _to_domain converts MongoDB document to User entity."""
        # Act
        user = repository._to_domain(user_document)
        
        # Assert
        assert isinstance(user, User)
        assert user.id == str(user_document["_id"])
        assert user.email == user_document["email"]
        assert user.username == user_document["username"]
        assert user.hashed_password == user_document["hashed_password"]
        assert user.is_active == user_document["is_active"]
        assert user.created_at == user_document["created_at"]
        assert user.updated_at == user_document["updated_at"]

    @pytest.mark.unit
    def test_to_domain_returns_none_when_document_is_none(self, repository):
        """Test that _to_domain returns None when document is None."""
        # Act
        result = repository._to_domain(None)
        
        # Assert
        assert result is None

    @pytest.mark.unit
    def test_to_domain_handles_missing_optional_fields(self, repository):
        """Test that _to_domain handles documents with missing optional fields.

        Note: User entity auto-sets created_at/updated_at in __post_init__,
        so they will never be None even if not in source document.
        """
        # Arrange
        minimal_doc = {
            "_id": ObjectId(),
            "email": "test@example.com",
            "username": "testuser"
        }

        # Act
        user = repository._to_domain(minimal_doc)

        # Assert
        assert isinstance(user, User)
        assert user.id == str(minimal_doc["_id"])
        assert user.email == minimal_doc["email"]
        assert user.username == minimal_doc["username"]
        assert user.hashed_password == ""  # Default value
        assert user.is_active is True  # Default value
        # User entity auto-sets timestamps when None is passed
        assert user.created_at is not None
        assert user.updated_at is not None

    @pytest.mark.unit
    def test_to_document_converts_user_entity_to_document(self, repository, user_entity):
        """Test that _to_document converts User entity to MongoDB document."""
        # Act
        doc = repository._to_document(user_entity)
        
        # Assert
        assert doc["email"] == user_entity.email
        assert doc["username"] == user_entity.username
        assert doc["hashed_password"] == user_entity.hashed_password
        assert doc["is_active"] == user_entity.is_active
        assert isinstance(doc["updated_at"], datetime)
        assert "created_at" in doc

    @pytest.mark.unit
    def test_to_document_excludes_id_when_user_has_no_id(self, repository, user_entity):
        """Test that _to_document excludes _id when user has no id."""
        # Arrange
        user_entity.id = None
        
        # Act
        doc = repository._to_document(user_entity)
        
        # Assert
        assert "_id" not in doc

    @pytest.mark.unit
    def test_to_document_includes_object_id_when_user_has_id(self, repository, user_entity_with_id):
        """Test that _to_document includes ObjectId when user has id."""
        # Act
        doc = repository._to_document(user_entity_with_id)
        
        # Assert
        assert "_id" in doc
        assert isinstance(doc["_id"], ObjectId)
        assert str(doc["_id"]) == user_entity_with_id.id

    @pytest.mark.unit
    def test_to_document_sets_created_at_when_none(self, repository, user_entity):
        """Test that _to_document sets created_at when None."""
        # Arrange
        user_entity.created_at = None
        
        # Act
        doc = repository._to_document(user_entity)
        
        # Assert
        assert isinstance(doc["created_at"], datetime)

    @pytest.mark.unit
    async def test_to_document_preserves_created_at_when_set(self, repository, user_entity_with_id):
        """Test that _to_document preserves created_at when already set."""
        # Act
        doc = repository._to_document(user_entity_with_id)
        
        # Assert
        assert doc["created_at"] == user_entity_with_id.created_at

    async def test_find_all_returns_list_of_users(self, repository, mock_mongo_collection, user_documents_list):
        """Test that find_all returns list of User entities."""
        # Arrange
        cursor_mock = mock_mongo_collection.find.return_value
        cursor_mock.to_list.return_value = user_documents_list
        
        # Act
        result = await repository.find_all()
        
        # Assert
        assert len(result) == len(user_documents_list)
        assert all(isinstance(user, User) for user in result)
        mock_mongo_collection.find.assert_called_once()
        cursor_mock.limit.assert_called_once_with(100)
        cursor_mock.to_list.assert_called_once_with(length=100)

    async def test_find_all_with_custom_limit(self, repository, mock_mongo_collection, user_documents_list):
        """Test that find_all respects custom limit parameter."""
        # Arrange
        custom_limit = 50
        cursor_mock = mock_mongo_collection.find.return_value
        cursor_mock.to_list.return_value = user_documents_list[:1]  # Simulate limited results
        
        # Act
        result = await repository.find_all(custom_limit)
        
        # Assert
        assert len(result) == 1
        cursor_mock.limit.assert_called_once_with(custom_limit)
        cursor_mock.to_list.assert_called_once_with(length=custom_limit)

    async def test_find_all_returns_empty_list_when_no_documents(self, repository, mock_mongo_collection):
        """Test that find_all returns empty list when no documents found."""
        # Arrange - use the default empty list from conftest
        pass  # Default cursor mock already returns empty list
        
        # Act
        result = await repository.find_all()
        
        # Assert
        assert result == []

    async def test_find_by_id_returns_user_when_found(self, repository, mock_mongo_collection, user_document):
        """Test that find_by_id returns User when document found."""
        # Arrange
        user_id = str(user_document["_id"])
        mock_mongo_collection.find_one.return_value = user_document
        
        # Act
        result = await repository.find_by_id(user_id)
        
        # Assert
        assert isinstance(result, User)
        assert result.id == user_id
        mock_mongo_collection.find_one.assert_called_once_with({"_id": ObjectId(user_id)})

    async def test_find_by_id_returns_none_when_not_found(self, repository, mock_mongo_collection):
        """Test that find_by_id returns None when document not found."""
        # Arrange
        user_id = "507f1f77bcf86cd799439011"
        mock_mongo_collection.find_one.return_value = None
        
        # Act
        result = await repository.find_by_id(user_id)
        
        # Assert
        assert result is None
        mock_mongo_collection.find_one.assert_called_once_with({"_id": ObjectId(user_id)})

    async def test_find_by_id_returns_none_when_invalid_object_id(self, repository, mock_mongo_collection):
        """Test that find_by_id returns None when ObjectId is invalid."""
        # Arrange
        invalid_id = "invalid_object_id"
        
        # Act
        result = await repository.find_by_id(invalid_id)
        
        # Assert
        assert result is None
        # Should not call find_one if ObjectId creation fails
        mock_mongo_collection.find_one.assert_not_called()

    async def test_find_by_email_returns_user_when_found(self, repository, mock_mongo_collection, user_document):
        """Test that find_by_email returns User when document found."""
        # Arrange
        email = user_document["email"]
        mock_mongo_collection.find_one.return_value = user_document
        
        # Act
        result = await repository.find_by_email(email)
        
        # Assert
        assert isinstance(result, User)
        assert result.email == email
        mock_mongo_collection.find_one.assert_called_once_with({"email": email})

    async def test_find_by_email_returns_none_when_not_found(self, repository, mock_mongo_collection):
        """Test that find_by_email returns None when document not found."""
        # Arrange
        email = "nonexistent@example.com"
        mock_mongo_collection.find_one.return_value = None
        
        # Act
        result = await repository.find_by_email(email)
        
        # Assert
        assert result is None
        mock_mongo_collection.find_one.assert_called_once_with({"email": email})

    async def test_find_by_username_returns_user_when_found(self, repository, mock_mongo_collection, user_document):
        """Test that find_by_username returns User when document found."""
        # Arrange
        username = user_document["username"]
        mock_mongo_collection.find_one.return_value = user_document
        
        # Act
        result = await repository.find_by_username(username)
        
        # Assert
        assert isinstance(result, User)
        assert result.username == username
        mock_mongo_collection.find_one.assert_called_once_with({"username": username})

    async def test_find_by_username_returns_none_when_not_found(self, repository, mock_mongo_collection):
        """Test that find_by_username returns None when document not found."""
        # Arrange
        username = "nonexistent_user"
        mock_mongo_collection.find_one.return_value = None
        
        # Act
        result = await repository.find_by_username(username)
        
        # Assert
        assert result is None
        mock_mongo_collection.find_one.assert_called_once_with({"username": username})

    async def test_create_inserts_new_user_and_returns_created_user(
        self, repository, mock_mongo_collection, user_entity, user_document
    ):
        """Test that create inserts new user and returns created User entity."""
        # Arrange
        inserted_id = ObjectId()
        created_doc = user_document.copy()
        created_doc["_id"] = inserted_id
        
        mock_insert_result = Mock()
        mock_insert_result.inserted_id = inserted_id
        mock_mongo_collection.insert_one.return_value = mock_insert_result
        mock_mongo_collection.find_one.return_value = created_doc
        
        # Act
        result = await repository.create(user_entity)
        
        # Assert
        assert isinstance(result, User)
        assert result.id == str(inserted_id)
        
        # Verify insert_one was called with document without _id
        insert_call = mock_mongo_collection.insert_one.call_args[0][0]
        assert "_id" not in insert_call
        assert insert_call["email"] == user_entity.email
        
        # Verify find_one was called to get the created document
        mock_mongo_collection.find_one.assert_called_once_with({"_id": inserted_id})

    async def test_create_removes_id_from_document_before_insert(self, repository, mock_mongo_collection, user_entity_with_id, user_document):
        """Test that create removes _id from document before inserting."""
        # Arrange
        inserted_id = ObjectId()
        mock_insert_result = Mock()
        mock_insert_result.inserted_id = inserted_id
        mock_mongo_collection.insert_one.return_value = mock_insert_result
        # Return a complete user document, not just the _id
        created_doc = user_document.copy()
        created_doc["_id"] = inserted_id
        mock_mongo_collection.find_one.return_value = created_doc

        # Act
        await repository.create(user_entity_with_id)

        # Assert
        insert_call = mock_mongo_collection.insert_one.call_args[0][0]
        assert "_id" not in insert_call

    async def test_update_updates_existing_user_and_returns_updated_user(
        self, repository, mock_mongo_collection, user_entity_with_id, user_document
    ):
        """Test that update modifies existing user and returns updated User entity."""
        # Arrange
        updated_doc = user_document.copy()
        updated_doc["_id"] = ObjectId(user_entity_with_id.id)
        updated_doc["username"] = "updated_username"
        
        mock_mongo_collection.update_one.return_value = Mock(modified_count=1)
        mock_mongo_collection.find_one.return_value = updated_doc
        
        # Act
        result = await repository.update(user_entity_with_id)
        
        # Assert
        assert isinstance(result, User)
        
        # Verify update_one was called with correct filter and update
        update_call = mock_mongo_collection.update_one.call_args
        filter_dict = update_call[0][0]
        update_dict = update_call[0][1]
        
        assert filter_dict == {"_id": ObjectId(user_entity_with_id.id)}
        assert "$set" in update_dict
        assert "_id" not in update_dict["$set"]  # Should not update _id
        
        # Verify find_one was called to get the updated document
        mock_mongo_collection.find_one.assert_called_once_with({"_id": ObjectId(user_entity_with_id.id)})

    async def test_update_raises_value_error_when_user_has_no_id(self, repository, user_entity):
        """Test that update raises ValueError when user has no ID."""
        # Arrange
        user_entity.id = None
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await repository.update(user_entity)
        
        assert "User ID is required for update" in str(exc_info.value)

    async def test_update_removes_id_from_update_document(self, repository, mock_mongo_collection, user_entity_with_id, user_document):
        """Test that update removes _id from the update document."""
        # Arrange
        mock_mongo_collection.update_one.return_value = Mock(modified_count=1)
        # Return a complete user document, not just the _id
        updated_doc = user_document.copy()
        updated_doc["_id"] = ObjectId(user_entity_with_id.id)
        mock_mongo_collection.find_one.return_value = updated_doc

        # Act
        await repository.update(user_entity_with_id)

        # Assert
        update_call = mock_mongo_collection.update_one.call_args[0][1]
        assert "_id" not in update_call["$set"]

    async def test_delete_removes_user_and_returns_true_when_successful(self, repository, mock_mongo_collection):
        """Test that delete removes user and returns True when successful."""
        # Arrange
        user_id = "507f1f77bcf86cd799439011"
        mock_mongo_collection.delete_one.return_value = Mock(deleted_count=1)
        
        # Act
        result = await repository.delete(user_id)
        
        # Assert
        assert result is True
        mock_mongo_collection.delete_one.assert_called_once_with({"_id": ObjectId(user_id)})

    async def test_delete_returns_false_when_user_not_found(self, repository, mock_mongo_collection):
        """Test that delete returns False when user not found."""
        # Arrange
        user_id = "507f1f77bcf86cd799439011"
        mock_mongo_collection.delete_one.return_value = Mock(deleted_count=0)
        
        # Act
        result = await repository.delete(user_id)
        
        # Assert
        assert result is False

    async def test_delete_returns_false_when_invalid_object_id(self, repository, mock_mongo_collection):
        """Test that delete returns False when ObjectId is invalid."""
        # Arrange
        invalid_id = "invalid_object_id"
        
        # Act
        result = await repository.delete(invalid_id)
        
        # Assert
        assert result is False
        # Should not call delete_one if ObjectId creation fails
        mock_mongo_collection.delete_one.assert_not_called()

    async def test_exists_returns_true_when_user_exists(self, repository, mock_mongo_collection):
        """Test that exists returns True when user exists."""
        # Arrange
        user_id = "507f1f77bcf86cd799439011"
        mock_mongo_collection.count_documents.return_value = 1
        
        # Act
        result = await repository.exists(user_id)
        
        # Assert
        assert result is True
        mock_mongo_collection.count_documents.assert_called_once_with({"_id": ObjectId(user_id)})

    async def test_exists_returns_false_when_user_not_exists(self, repository, mock_mongo_collection):
        """Test that exists returns False when user does not exist."""
        # Arrange
        user_id = "507f1f77bcf86cd799439011"
        mock_mongo_collection.count_documents.return_value = 0
        
        # Act
        result = await repository.exists(user_id)
        
        # Assert
        assert result is False

    async def test_exists_returns_false_when_invalid_object_id(self, repository, mock_mongo_collection):
        """Test that exists returns False when ObjectId is invalid."""
        # Arrange
        invalid_id = "invalid_object_id"
        
        # Act
        result = await repository.exists(invalid_id)
        
        # Assert
        assert result is False
        # Should not call count_documents if ObjectId creation fails
        mock_mongo_collection.count_documents.assert_not_called()

    async def test_repository_handles_database_exceptions_gracefully(self, repository, mock_mongo_collection):
        """Test that repository handles database exceptions gracefully."""
        # Arrange
        database_error = Exception("Database connection failed")
        mock_mongo_collection.find_one.side_effect = database_error
        
        # Act & Assert - Should propagate the exception
        with pytest.raises(Exception) as exc_info:
            await repository.find_by_email("test@example.com")
        
        assert str(exc_info.value) == "Database connection failed"

    @pytest.mark.parametrize("method_name,args,exception_handling", [
        ("find_by_id", ["invalid_id"], "returns_none"),
        ("delete", ["invalid_id"], "returns_false"),
        ("exists", ["invalid_id"], "returns_false"),
    ])
    async def test_methods_handle_invalid_object_id_gracefully(
        self, method_name, args, exception_handling, repository, mock_mongo_collection
    ):
        """Test that methods handle invalid ObjectId gracefully."""
        # Act
        method = getattr(repository, method_name)
        result = await method(*args)
        
        # Assert based on expected behavior
        if exception_handling == "returns_none":
            assert result is None
        elif exception_handling == "returns_false":
            assert result is False


@pytest.mark.repository
@pytest.mark.integration
@pytest.mark.slow
class TestMongoDBUserRepositoryIntegration:
    """Integration tests for MongoDB User Repository with real database operations."""
    
    # Note: These tests would require actual MongoDB connection
    # They are marked as slow and integration tests
    
    @pytest.mark.skip(reason="Requires actual MongoDB connection")
    def test_full_crud_operations_with_real_database(self):
        """Test complete CRUD operations with real MongoDB."""
        # This would test actual database operations
        # Implementation would require MongoDB test instance
        pass
    
    @pytest.mark.skip(reason="Requires actual MongoDB connection")
    def test_concurrent_operations_with_real_database(self):
        """Test concurrent operations with real MongoDB."""
        # This would test concurrent access patterns
        pass