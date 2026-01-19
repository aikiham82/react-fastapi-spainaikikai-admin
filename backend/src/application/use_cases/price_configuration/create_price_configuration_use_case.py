"""Create Price Configuration use case."""

from typing import Optional

from src.domain.entities.price_configuration import PriceConfiguration
from src.domain.exceptions.price_configuration import PriceConfigurationAlreadyExistsError
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


class CreatePriceConfigurationUseCase:
    """Use case for creating a new price configuration."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(
        self,
        key: str,
        price: float,
        description: str = "",
        is_active: bool = True,
        valid_from: Optional[str] = None,
        valid_until: Optional[str] = None
    ) -> PriceConfiguration:
        """Execute the use case."""
        # Check if key already exists
        if await self.price_repository.exists_by_key(key):
            raise PriceConfigurationAlreadyExistsError(key)

        price_config = PriceConfiguration(
            key=key,
            price=price,
            description=description,
            is_active=is_active,
            valid_from=valid_from,
            valid_until=valid_until
        )

        return await self.price_repository.create(price_config)
