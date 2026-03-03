"""Get All Prices use case."""

from typing import List

from src.domain.entities.price_configuration import PriceConfiguration
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


class GetAllPricesUseCase:
    """Use case for getting all price configurations."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(self, active_only: bool = False, limit: int = 0) -> List[PriceConfiguration]:
        """Execute the use case."""
        if active_only:
            return await self.price_repository.find_active(limit)
        return await self.price_repository.find_all(limit)
