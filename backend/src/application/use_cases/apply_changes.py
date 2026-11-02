"""Apply an update through the entity's own validation, so nothing is stored that it would refuse when read."""

from dataclasses import replace
from typing import Any, TypeVar

from src.domain.exceptions.base import ValidationError

Entity = TypeVar("Entity")

INVALID_DATA_MESSAGE = "Hay datos no válidos. Revísalos e inténtalo de nuevo."


def apply_changes(entity: Entity, **changes: Any) -> Entity:
    provided = {name: value for name, value in changes.items() if value is not None}
    try:
        return replace(entity, **provided)
    except ValueError as error:
        raise ValidationError(INVALID_DATA_MESSAGE) from error
