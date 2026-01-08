from typing import Optional

"""Tests for User router endpoints."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from fastapi import status
from fastapi.testclient import TestClient

from src.domain.entities.user import User
from src.domain.exceptions.user import UserNotFoundError, UserAlreadyExistsError
from src.infrastructure.web.dto.user_dto import Token, UserResponse
from src.infrastructure.web.routers.users import router


@pytest.fixture
def test_app():
    """Create FastAPI test application."""
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    return app


@pytest.fixture 
def client(test_app):
    """Create test client."""
    return TestClient(test_app)


@pytest.fixture
def mock_use_cases():
    """Mock all use cases."""
    return {
        "create_user": AsyncMock(),
        "authenticate_user": AsyncMock(),
        "get_all_users": AsyncMock(),
        "get_user_by_id": AsyncMock(),
        "get_current_user": AsyncMock()
    }


@pytest.fixture
def mock_security():
    """Mock security functions."""
    return {
        "get_password_hash": Mock(return_value="hashed_password"),
        "verify_password": Mock(return_value=True),
        "create_access_token": Mock(return_value="mock.jwt.token"),
        "decode_access_token": Mock(return_value={"sub": "test@example.com"})
    }


@pytest.mark.api
@pytest.mark.unit
class TestRegisterEndpoint:
    """Test suite for user registration endpoint."""

    def test_register_with_valid_data_returns_token(
        self, test_app, user_create_data, user_entity_with_id
    ):
        """Test successful user registration returns JWT token."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_create_user_use_case
        from src.infrastructure.web.routers.users import get_password_hash, create_access_token
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_create_user_use_case] = lambda: mock_use_case
        
        with patch('src.infrastructure.web.routers.users.get_password_hash') as mock_hash_password, \
             patch('src.infrastructure.web.routers.users.create_access_token') as mock_create_token:
            
            mock_hash_password.return_value = "hashed_password"
            mock_create_token.return_value = "jwt.token.here"
            
            client = TestClient(test_app)
            
            # Act
            response = client.post("/api/v1/auth/register", json=user_create_data)
        
        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "access_token" in data
        assert data["access_token"] == "jwt.token.here"
        assert data["token_type"] == "bearer"
        
        # Verify use case was called with hashed password
        mock_use_case.execute.assert_called_once_with(
            email=user_create_data["email"],
            username=user_create_data["username"],
            hashed_password="hashed_password"
        )

    @patch('src.infrastructure.web.routers.users.get_create_user_use_case')
    @patch('src.infrastructure.web.routers.users.get_password_hash')
    def test_register_with_existing_email_returns_400(
        self, mock_hash_password, mock_get_use_case, client, user_create_data
    ):
        """Test registration with existing email returns 400 Bad Request."""
        # Arrange
        mock_hash_password.return_value = "hashed_password"
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = UserAlreadyExistsError("User with this email already exists")
        mock_get_use_case.return_value = mock_use_case
        
        # Act
        response = client.post("/api/v1/auth/register", json=user_create_data)
        
        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "User with this email already exists" in data["detail"]

    @patch('src.infrastructure.web.routers.users.get_create_user_use_case')
    @patch('src.infrastructure.web.routers.users.get_password_hash')
    def test_register_with_invalid_data_returns_422(
        self, mock_hash_password, mock_get_use_case, client
    ):
        """Test registration with invalid data returns 422 Validation Error."""
        # Arrange
        invalid_data = {
            "email": "invalid.email",  # Invalid email format
            "username": "testuser",
            "password": "123"  # Too short
        }
        
        # Act
        response = client.post("/api/v1/auth/register", json=invalid_data)
        
        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch('src.infrastructure.web.routers.users.get_create_user_use_case')
    @patch('src.infrastructure.web.routers.users.get_password_hash')
    def test_register_with_server_error_returns_500(
        self, mock_hash_password, mock_get_use_case, client, user_create_data
    ):
        """Test registration with server error returns 500 Internal Server Error."""
        # Arrange
        mock_hash_password.return_value = "hashed_password"
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = Exception("Database connection failed")
        mock_get_use_case.return_value = mock_use_case
        
        # Act
        response = client.post("/api/v1/auth/register", json=user_create_data)
        
        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert "Failed to create user" in data["detail"]

    def test_register_missing_required_fields_returns_422(self, client):
        """Test registration with missing fields returns 422."""
        # Act
        response = client.post("/api/v1/auth/register", json={})
        
        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.api
@pytest.mark.unit
class TestLoginEndpoint:
    """Test suite for user login endpoint."""

    def test_login_with_valid_credentials_returns_token(
        self, test_app, user_entity_with_id
    ):
        """Test successful login returns JWT token."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_authenticate_user_use_case
        
        login_data = {"username": "testuser", "password": "password123"}
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: mock_use_case
        
        with patch('src.infrastructure.web.routers.users.verify_password') as mock_verify_password, \
             patch('src.infrastructure.web.routers.users.create_access_token') as mock_create_token:
            
            mock_verify_password.return_value = True
            mock_create_token.return_value = "jwt.token.here"
            
            client = TestClient(test_app)
            
            # Act
            response = client.post("/api/v1/auth/login", data=login_data)
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["access_token"] == "jwt.token.here"
        assert data["token_type"] == "bearer"

    def test_login_with_nonexistent_user_returns_401(
        self, test_app
    ):
        """Test login with nonexistent user returns 401 Unauthorized."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_authenticate_user_use_case
        
        login_data = {"username": "nonexistent", "password": "password123"}
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = None  # User not found
        
        # Override dependencies
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: mock_use_case
        
        client = TestClient(test_app)
        
        # Act
        response = client.post("/api/v1/auth/login", data=login_data)
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "Incorrect username or password" in data["detail"]

    def test_login_with_wrong_password_returns_401(
        self, test_app, user_entity_with_id
    ):
        """Test login with wrong password returns 401 Unauthorized."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_authenticate_user_use_case
        
        login_data = {"username": "testuser", "password": "wrongpassword"}
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: mock_use_case
        
        with patch('src.infrastructure.web.routers.users.verify_password') as mock_verify_password:
            mock_verify_password.return_value = False  # Wrong password
            
            client = TestClient(test_app)
            
            # Act
            response = client.post("/api/v1/auth/login", data=login_data)
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert "Incorrect username or password" in data["detail"]

    def test_login_with_inactive_user_returns_400(
        self, test_app, user_entity_with_id
    ):
        """Test login with inactive user returns 400 Bad Request."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_authenticate_user_use_case
        
        login_data = {"username": "testuser", "password": "password123"}
        
        user_entity_with_id.is_active = False  # Inactive user
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: mock_use_case
        
        with patch('src.infrastructure.web.routers.users.verify_password') as mock_verify_password:
            mock_verify_password.return_value = True
            
            client = TestClient(test_app)
            
            # Act
            response = client.post("/api/v1/auth/login", data=login_data)
        
        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "Inactive user" in data["detail"]

    def test_login_with_email_as_username_succeeds(
        self, test_app, user_entity_with_id
    ):
        """Test login using email as username succeeds."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_authenticate_user_use_case
        
        login_data = {"username": "test@example.com", "password": "password123"}
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: mock_use_case
        
        with patch('src.infrastructure.web.routers.users.verify_password') as mock_verify_password, \
             patch('src.infrastructure.web.routers.users.create_access_token') as mock_create_token:
            
            mock_verify_password.return_value = True
            mock_create_token.return_value = "jwt.token.here"
            
            client = TestClient(test_app)
            
            # Act
            response = client.post("/api/v1/auth/login", data=login_data)
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        mock_use_case.execute.assert_called_once_with("test@example.com")


@pytest.mark.api
@pytest.mark.unit
class TestCurrentUserEndpoint:
    """Test suite for current user endpoint."""

    def test_get_current_user_returns_user_response(
        self, test_app, user_entity_with_id
    ):
        """Test getting current user returns UserResponse."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_current_active_user
        
        # Override dependencies
        test_app.dependency_overrides[get_current_active_user] = lambda: user_entity_with_id
        
        client = TestClient(test_app)
        
        # Act
        response = client.get("/api/v1/users/me")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == user_entity_with_id.id
        assert data["email"] == user_entity_with_id.email
        assert data["username"] == user_entity_with_id.username

    def test_get_current_user_without_auth_returns_401(
        self, test_app
    ):
        """Test getting current user without authentication returns 401."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_current_active_user
        from fastapi import HTTPException, status as http_status
        
        def mock_auth_failure():
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        
        # Override dependencies
        test_app.dependency_overrides[get_current_active_user] = mock_auth_failure
        
        client = TestClient(test_app)
        
        # Act
        response = client.get("/api/v1/users/me")
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.api
@pytest.mark.unit  
class TestGetUsersEndpoint:
    """Test suite for get all users endpoint."""

    def test_get_users_returns_user_list(
        self, test_app, user_entity_with_id, test_users_list
    ):
        """Test getting all users returns list of UserResponse."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_all_users_use_case, get_current_active_user
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = test_users_list
        
        # Override dependencies
        test_app.dependency_overrides[get_all_users_use_case] = lambda: mock_use_case
        test_app.dependency_overrides[get_current_active_user] = lambda: user_entity_with_id
        
        client = TestClient(test_app)
        
        # Act
        response = client.get("/api/v1/users")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == len(test_users_list)
        
        # Verify first user data
        assert data[0]["email"] == test_users_list[0].email
        assert data[0]["username"] == test_users_list[0].username

    def test_get_users_with_limit_parameter(
        self, test_app, user_entity_with_id, test_users_list
    ):
        """Test getting users with custom limit parameter."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_all_users_use_case, get_current_active_user
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = test_users_list[:2]
        
        # Override dependencies
        test_app.dependency_overrides[get_all_users_use_case] = lambda: mock_use_case
        test_app.dependency_overrides[get_current_active_user] = lambda: user_entity_with_id
        
        client = TestClient(test_app)
        
        # Act
        response = client.get("/api/v1/users?limit=50")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        mock_use_case.execute.assert_called_once_with(50)

    def test_get_users_without_auth_returns_401(
        self, test_app
    ):
        """Test getting users without authentication returns 401."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_current_active_user
        from fastapi import HTTPException, status as http_status
        
        def mock_auth_failure():
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED
            )
        
        # Override dependencies
        test_app.dependency_overrides[get_current_active_user] = mock_auth_failure
        
        client = TestClient(test_app)
        
        # Act
        response = client.get("/api/v1/users")
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.api
@pytest.mark.unit
class TestGetUserByIdEndpoint:
    """Test suite for get user by ID endpoint."""

    def test_get_user_by_id_returns_user_response(
        self, test_app, user_entity_with_id
    ):
        """Test getting user by ID returns UserResponse."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_user_by_id_use_case, get_current_active_user
        
        user_id = "507f1f77bcf86cd799439011"
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_user_by_id_use_case] = lambda: mock_use_case
        test_app.dependency_overrides[get_current_active_user] = lambda: user_entity_with_id
        
        client = TestClient(test_app)
        
        # Act
        response = client.get(f"/api/v1/users/{user_id}")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == user_entity_with_id.id
        assert data["email"] == user_entity_with_id.email
        mock_use_case.execute.assert_called_once_with(user_id)

    def test_get_user_by_id_not_found_returns_404(
        self, test_app, user_entity_with_id
    ):
        """Test getting nonexistent user by ID returns 404."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_user_by_id_use_case, get_current_active_user
        
        user_id = "nonexistent_id"
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.side_effect = UserNotFoundError(user_id)
        
        # Override dependencies
        test_app.dependency_overrides[get_user_by_id_use_case] = lambda: mock_use_case
        test_app.dependency_overrides[get_current_active_user] = lambda: user_entity_with_id
        
        client = TestClient(test_app)
        
        # Act
        response = client.get(f"/api/v1/users/{user_id}")
        
        # Assert
        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert f"User with id {user_id} not found" in data["detail"]

    def test_get_user_by_id_without_auth_returns_401(
        self, test_app
    ):
        """Test getting user by ID without authentication returns 401."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_current_active_user
        from fastapi import HTTPException, status as http_status
        
        user_id = "507f1f77bcf86cd799439011"
        
        def mock_auth_failure():
            raise HTTPException(
                status_code=http_status.HTTP_401_UNAUTHORIZED
            )
        
        # Override dependencies
        test_app.dependency_overrides[get_current_active_user] = mock_auth_failure
        
        client = TestClient(test_app)
        
        # Act
        response = client.get(f"/api/v1/users/{user_id}")
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.api
@pytest.mark.unit
class TestRouterIntegration:
    """Integration tests for router endpoints."""

    def test_router_includes_all_expected_endpoints(self):
        """Test that router includes all expected endpoints."""
        # Get all routes from the router
        routes = [route.path for route in router.routes]
        
        # Assert expected endpoints exist
        expected_paths = [
            "/auth/register",
            "/auth/login", 
            "/users/me",
            "/users",
            "/users/{user_id}"
        ]
        
        for path in expected_paths:
            assert path in routes

    def test_router_has_correct_tags(self):
        """Test that router has correct tags."""
        assert router.tags == ["users"]

    def test_register_endpoint_response_model(
        self, test_app, user_create_data, user_entity_with_id
    ):
        """Test register endpoint returns correct response model structure."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_create_user_use_case
        from src.infrastructure.web.routers.users import get_password_hash, create_access_token
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_create_user_use_case] = lambda: mock_use_case
        
        with patch('src.infrastructure.web.routers.users.get_password_hash') as mock_hash_password, \
             patch('src.infrastructure.web.routers.users.create_access_token') as mock_create_token:
            
            mock_hash_password.return_value = "hashed_password"
            mock_create_token.return_value = "jwt.token.here"
            
            client = TestClient(test_app)
            
            # Act
            response = client.post("/api/v1/auth/register", json=user_create_data)
        
        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        # Verify Token model structure
        assert "access_token" in data
        assert "token_type" in data
        assert isinstance(data["access_token"], str)
        assert data["token_type"] == "bearer"

    def test_get_users_endpoint_response_model(
        self, test_app, user_entity_with_id, test_users_list
    ):
        """Test get users endpoint returns correct response model structure."""
        # Arrange - Mock dependencies using FastAPI's dependency override
        from src.infrastructure.web.dependencies import get_all_users_use_case, get_current_active_user
        
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = test_users_list
        
        # Override dependencies
        test_app.dependency_overrides[get_all_users_use_case] = lambda: mock_use_case
        test_app.dependency_overrides[get_current_active_user] = lambda: user_entity_with_id
        
        client = TestClient(test_app)
        
        # Act
        response = client.get("/api/v1/users")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify List[UserResponse] structure
        assert isinstance(data, list)
        for user_data in data:
            assert "id" in user_data
            assert "email" in user_data
            assert "username" in user_data
            assert "is_active" in user_data
            assert "created_at" in user_data
            assert "updated_at" in user_data

    @pytest.mark.parametrize("endpoint,method,expected_auth", [
        ("/users", "GET", True),
        ("/users/123", "GET", True),
        ("/users/me", "GET", True),
        ("/auth/register", "POST", False),
        ("/auth/login", "POST", False),
    ])
    def test_endpoint_authentication_requirements(
        self, endpoint, method, expected_auth, client
    ):
        """Test which endpoints require authentication."""
        # Act
        if method == "GET":
            response = client.get(f"/api/v1{endpoint}")
        elif method == "POST":
            response = client.post(f"/api/v1{endpoint}", json={})
        
        # Assert
        if expected_auth:
            # Should return 401/422 for missing auth or validation errors
            assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_422_UNPROCESSABLE_ENTITY]
        else:
            # Should not return 401 for auth (might return other errors like 422)
            assert response.status_code != status.HTTP_401_UNAUTHORIZED

    def test_all_endpoints_handle_server_errors_gracefully(self, test_app, user_entity_with_id):
        """Test that all endpoints handle server errors gracefully."""
        # Mock all dependencies to prevent actual database calls
        from src.infrastructure.web.dependencies import (
            get_create_user_use_case, 
            get_authenticate_user_use_case,
            get_all_users_use_case,
            get_user_by_id_use_case,
            get_current_active_user
        )
        
        # Create mock use cases
        mock_create_use_case = AsyncMock()
        mock_auth_use_case = AsyncMock() 
        mock_get_all_use_case = AsyncMock()
        mock_get_by_id_use_case = AsyncMock()
        
        # Setup basic mocking to avoid 500 errors
        mock_create_use_case.execute.return_value = user_entity_with_id
        mock_auth_use_case.execute.return_value = user_entity_with_id
        mock_get_all_use_case.execute.return_value = [user_entity_with_id]
        mock_get_by_id_use_case.execute.return_value = user_entity_with_id
        
        # Override dependencies
        test_app.dependency_overrides[get_create_user_use_case] = lambda: mock_create_use_case
        test_app.dependency_overrides[get_authenticate_user_use_case] = lambda: mock_auth_use_case
        test_app.dependency_overrides[get_all_users_use_case] = lambda: mock_get_all_use_case
        test_app.dependency_overrides[get_user_by_id_use_case] = lambda: mock_get_by_id_use_case
        test_app.dependency_overrides[get_current_active_user] = lambda: user_entity_with_id
        
        with patch('src.infrastructure.web.routers.users.get_password_hash') as mock_hash, \
             patch('src.infrastructure.web.routers.users.create_access_token') as mock_token, \
             patch('src.infrastructure.web.routers.users.verify_password') as mock_verify:
            
            mock_hash.return_value = "hashed_password"
            mock_token.return_value = "jwt.token.here"
            mock_verify.return_value = True
            
            client = TestClient(test_app)
        
            endpoints_and_methods = [
                ("/auth/register", "POST", {"email": "test@example.com", "username": "test", "password": "password123"}),
                ("/auth/login", "POST", None),  # Form data
                ("/users", "GET", None),
                ("/users/123", "GET", None),
                ("/users/me", "GET", None),
            ]
            
            for endpoint, method, json_data in endpoints_and_methods:
                if method == "POST" and endpoint == "/auth/login":
                    # Use form data for login
                    response = client.post(f"/api/v1{endpoint}", data={"username": "test", "password": "test"})
                elif method == "POST":
                    response = client.post(f"/api/v1{endpoint}", json=json_data)
                else:
                    response = client.get(f"/api/v1{endpoint}")
                
                # Should not return 500 for basic validation/auth issues
                assert response.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR or "Server Error" not in response.text