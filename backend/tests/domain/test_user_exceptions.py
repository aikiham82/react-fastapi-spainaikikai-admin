"""Tests for User domain exceptions."""

import pytest

from src.domain.exceptions.base import (
    DomainException, 
    EntityNotFoundError, 
    ValidationError, 
    BusinessRuleViolationError
)
from src.domain.exceptions.user import (
    UserNotFoundError,
    InvalidUserDataError, 
    UserAlreadyExistsError,
    InactiveUserError
)


@pytest.mark.domain
@pytest.mark.unit
class TestUserNotFoundError:
    """Test suite for UserNotFoundError exception."""

    def test_user_not_found_error_inherits_from_entity_not_found_error(self):
        """Test that UserNotFoundError inherits from EntityNotFoundError."""
        # Act & Assert
        assert issubclass(UserNotFoundError, EntityNotFoundError)
        assert issubclass(UserNotFoundError, DomainException)

    def test_user_not_found_error_with_user_id_formats_message_correctly(self):
        """Test that UserNotFoundError formats the error message correctly with user ID."""
        # Arrange
        user_id = "507f1f77bcf86cd799439011"
        
        # Act
        error = UserNotFoundError(user_id)
        
        # Assert
        assert str(error) == f"User con ID {user_id} no encontrado"
        assert error.entity_type == "User"
        assert error.entity_id == user_id

    def test_user_not_found_error_with_email_identifier_formats_message_correctly(self):
        """Test that UserNotFoundError works with email-like identifiers."""
        # Arrange
        email_id = "email:test@example.com"
        
        # Act
        error = UserNotFoundError(email_id)
        
        # Assert
        assert str(error) == f"User con ID {email_id} no encontrado"
        assert error.entity_type == "User"
        assert error.entity_id == email_id

    def test_user_not_found_error_attributes_are_accessible(self):
        """Test that UserNotFoundError attributes can be accessed."""
        # Arrange
        user_id = "123456"
        
        # Act
        error = UserNotFoundError(user_id)
        
        # Assert
        assert hasattr(error, 'entity_type')
        assert hasattr(error, 'entity_id')
        assert error.entity_type == "User"
        assert error.entity_id == user_id

    def test_user_not_found_error_can_be_raised_and_caught(self):
        """Test that UserNotFoundError can be raised and caught properly."""
        # Arrange
        user_id = "nonexistent_id"
        
        # Act & Assert
        with pytest.raises(UserNotFoundError) as exc_info:
            raise UserNotFoundError(user_id)
        
        assert exc_info.value.entity_id == user_id
        assert "User con ID nonexistent_id no encontrado" in str(exc_info.value)

    def test_user_not_found_error_inheritance_chain(self):
        """Test the complete inheritance chain of UserNotFoundError."""
        # Arrange
        error = UserNotFoundError("test_id")
        
        # Act & Assert
        assert isinstance(error, UserNotFoundError)
        assert isinstance(error, EntityNotFoundError)
        assert isinstance(error, DomainException)
        assert isinstance(error, Exception)


@pytest.mark.domain
@pytest.mark.unit  
class TestInvalidUserDataError:
    """Test suite for InvalidUserDataError exception."""

    def test_invalid_user_data_error_inherits_from_validation_error(self):
        """Test that InvalidUserDataError inherits from ValidationError."""
        # Act & Assert
        assert issubclass(InvalidUserDataError, ValidationError)
        assert issubclass(InvalidUserDataError, DomainException)

    def test_invalid_user_data_error_can_be_created_with_message(self):
        """Test that InvalidUserDataError can be created with custom message."""
        # Arrange
        message = "User email cannot be empty"
        
        # Act
        error = InvalidUserDataError(message)
        
        # Assert
        assert str(error) == message

    def test_invalid_user_data_error_can_be_created_without_message(self):
        """Test that InvalidUserDataError can be created without message."""
        # Act
        error = InvalidUserDataError()
        
        # Assert
        assert str(error) == ""

    def test_invalid_user_data_error_can_be_raised_and_caught(self):
        """Test that InvalidUserDataError can be raised and caught properly."""
        # Arrange
        message = "Invalid user data provided"
        
        # Act & Assert
        with pytest.raises(InvalidUserDataError) as exc_info:
            raise InvalidUserDataError(message)
        
        assert str(exc_info.value) == message

    def test_invalid_user_data_error_inheritance_chain(self):
        """Test the complete inheritance chain of InvalidUserDataError."""
        # Arrange
        error = InvalidUserDataError("test message")
        
        # Act & Assert
        assert isinstance(error, InvalidUserDataError)
        assert isinstance(error, ValidationError)
        assert isinstance(error, DomainException)
        assert isinstance(error, Exception)


@pytest.mark.domain
@pytest.mark.unit
class TestUserAlreadyExistsError:
    """Test suite for UserAlreadyExistsError exception."""

    def test_user_already_exists_error_inherits_from_business_rule_violation_error(self):
        """Test that UserAlreadyExistsError inherits from BusinessRuleViolationError."""
        # Act & Assert
        assert issubclass(UserAlreadyExistsError, BusinessRuleViolationError)
        assert issubclass(UserAlreadyExistsError, DomainException)

    def test_user_already_exists_error_with_email_message(self):
        """Test UserAlreadyExistsError with email-specific message."""
        # Arrange
        message = "User with this email already exists"
        
        # Act
        error = UserAlreadyExistsError(message)
        
        # Assert
        assert str(error) == message

    def test_user_already_exists_error_with_username_message(self):
        """Test UserAlreadyExistsError with username-specific message."""
        # Arrange
        message = "User with this username already exists"
        
        # Act
        error = UserAlreadyExistsError(message)
        
        # Assert
        assert str(error) == message

    def test_user_already_exists_error_can_be_raised_and_caught(self):
        """Test that UserAlreadyExistsError can be raised and caught properly."""
        # Arrange
        message = "Duplicate user detected"
        
        # Act & Assert
        with pytest.raises(UserAlreadyExistsError) as exc_info:
            raise UserAlreadyExistsError(message)
        
        assert str(exc_info.value) == message

    def test_user_already_exists_error_inheritance_chain(self):
        """Test the complete inheritance chain of UserAlreadyExistsError."""
        # Arrange
        error = UserAlreadyExistsError("test message")
        
        # Act & Assert
        assert isinstance(error, UserAlreadyExistsError)
        assert isinstance(error, BusinessRuleViolationError)
        assert isinstance(error, DomainException)
        assert isinstance(error, Exception)


@pytest.mark.domain
@pytest.mark.unit
class TestInactiveUserError:
    """Test suite for InactiveUserError exception."""

    def test_inactive_user_error_inherits_from_business_rule_violation_error(self):
        """Test that InactiveUserError inherits from BusinessRuleViolationError."""
        # Act & Assert
        assert issubclass(InactiveUserError, BusinessRuleViolationError)
        assert issubclass(InactiveUserError, DomainException)

    def test_inactive_user_error_can_be_created_with_message(self):
        """Test that InactiveUserError can be created with custom message."""
        # Arrange
        message = "Cannot perform operation on inactive user"
        
        # Act
        error = InactiveUserError(message)
        
        # Assert
        assert str(error) == message

    def test_inactive_user_error_can_be_created_without_message(self):
        """Test that InactiveUserError can be created without message."""
        # Act
        error = InactiveUserError()
        
        # Assert
        assert str(error) == ""

    def test_inactive_user_error_can_be_raised_and_caught(self):
        """Test that InactiveUserError can be raised and caught properly."""
        # Arrange
        message = "User account is deactivated"
        
        # Act & Assert
        with pytest.raises(InactiveUserError) as exc_info:
            raise InactiveUserError(message)
        
        assert str(exc_info.value) == message

    def test_inactive_user_error_inheritance_chain(self):
        """Test the complete inheritance chain of InactiveUserError."""
        # Arrange
        error = InactiveUserError("test message")
        
        # Act & Assert
        assert isinstance(error, InactiveUserError)
        assert isinstance(error, BusinessRuleViolationError)
        assert isinstance(error, DomainException)
        assert isinstance(error, Exception)


@pytest.mark.domain
@pytest.mark.unit
class TestUserExceptionsIntegration:
    """Integration tests for all user exceptions."""

    def test_all_user_exceptions_inherit_from_domain_exception(self):
        """Test that all user exceptions inherit from DomainException."""
        # Arrange
        user_exceptions = [
            UserNotFoundError("test"),
            InvalidUserDataError("test"),
            UserAlreadyExistsError("test"),
            InactiveUserError("test")
        ]
        
        # Act & Assert
        for exception in user_exceptions:
            assert isinstance(exception, DomainException)

    def test_user_exceptions_can_be_distinguished_by_type(self):
        """Test that different user exceptions can be distinguished by type."""
        # Arrange & Act
        not_found = UserNotFoundError("test")
        invalid_data = InvalidUserDataError("test")
        already_exists = UserAlreadyExistsError("test")
        inactive = InactiveUserError("test")
        
        # Assert
        assert type(not_found) is UserNotFoundError
        assert type(invalid_data) is InvalidUserDataError
        assert type(already_exists) is UserAlreadyExistsError
        assert type(inactive) is InactiveUserError
        
        # Test type checking
        assert isinstance(not_found, EntityNotFoundError)
        assert isinstance(invalid_data, ValidationError)
        assert isinstance(already_exists, BusinessRuleViolationError)
        assert isinstance(inactive, BusinessRuleViolationError)

    def test_user_exceptions_can_be_caught_by_base_types(self):
        """Test that user exceptions can be caught by their base exception types."""
        # Test catching by EntityNotFoundError
        with pytest.raises(EntityNotFoundError):
            raise UserNotFoundError("test")
        
        # Test catching by ValidationError
        with pytest.raises(ValidationError):
            raise InvalidUserDataError("test")
        
        # Test catching by BusinessRuleViolationError
        with pytest.raises(BusinessRuleViolationError):
            raise UserAlreadyExistsError("test")
            
        with pytest.raises(BusinessRuleViolationError):
            raise InactiveUserError("test")
        
        # Test catching by DomainException
        with pytest.raises(DomainException):
            raise UserNotFoundError("test")

    @pytest.mark.parametrize("exception_class,base_class", [
        (UserNotFoundError, EntityNotFoundError),
        (InvalidUserDataError, ValidationError),
        (UserAlreadyExistsError, BusinessRuleViolationError),
        (InactiveUserError, BusinessRuleViolationError)
    ])
    def test_exception_inheritance_parametrized(self, exception_class, base_class):
        """Parametrized test for exception inheritance relationships."""
        # Act & Assert
        assert issubclass(exception_class, base_class)
        assert issubclass(exception_class, DomainException)

    def test_exception_message_preservation_through_inheritance(self):
        """Test that exception messages are preserved through inheritance chain."""
        # Arrange
        test_message = "Test exception message"
        
        # Act
        exceptions = [
            UserNotFoundError("test_id"),  # Special constructor
            InvalidUserDataError(test_message),
            UserAlreadyExistsError(test_message),
            InactiveUserError(test_message)
        ]
        
        # Assert
        assert "User con ID test_id no encontrado" in str(exceptions[0])
        assert str(exceptions[1]) == test_message
        assert str(exceptions[2]) == test_message
        assert str(exceptions[3]) == test_message