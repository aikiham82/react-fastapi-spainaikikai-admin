"""Update Price Configuration use case."""

from typing import Optional

from src.domain.entities.price_configuration import PriceConfiguration
from src.domain.exceptions.price_configuration import PriceConfigurationNotFoundError
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


class UpdatePriceConfigurationUseCase:
    """Use case for updating a price configuration."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(
        self,
        price_id: str,
        price: Optional[float] = None,
        description: Optional[str] = None,
        is_active: Optional[bool] = None,
        valid_from: Optional[str] = None,
        valid_until: Optional[str] = None
    ) -> PriceConfiguration:
        """Execute the use case."""
        price_config = await self.price_repository.find_by_id(price_id)
        if not price_config:
            raise PriceConfigurationNotFoundError(price_id)

        # Update fields if provided
        if price is not None:
            price_config.price = price
        if description is not None:
            price_config.description = description
        if is_active is not None:
            price_config.is_active = is_active
        if valid_from is not None:
            price_config.valid_from = valid_from
        if valid_until is not None:
            price_config.valid_until = valid_until

        return await self.price_repository.update(price_config)
