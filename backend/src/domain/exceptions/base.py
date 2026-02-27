"""Base domain exceptions."""


class DomainException(Exception):
    """Base domain exception."""
    pass


class EntityNotFoundError(DomainException):
    """Raised when an entity is not found."""
    
    def __init__(self, entity_type: str, entity_id: str):
        self.entity_type = entity_type
        self.entity_id = entity_id
        super().__init__(f"{entity_type} con ID {entity_id} no encontrado")


class ValidationError(DomainException):
    """Raised when domain validation fails."""
    pass


class BusinessRuleViolationError(DomainException):
    """Raised when a business rule is violated."""
    pass