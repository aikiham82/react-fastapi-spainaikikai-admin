"""Get Price Configuration use case."""

from typing import Optional

from src.domain.entities.price_configuration import PriceConfiguration
from src.domain.exceptions.price_configuration import PriceConfigurationNotFoundError
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


class GetPriceConfigurationUseCase:
    """Use case for getting a price configuration by ID."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(self, price_id: str) -> PriceConfiguration:
        """Execute the use case."""
        price_config = await self.price_repository.find_by_id(price_id)
        if not price_config:
            raise PriceConfigurationNotFoundError(price_id)
        return price_config
