"""Delete Price Configuration use case."""

from src.domain.exceptions.price_configuration import PriceConfigurationNotFoundError
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


class DeletePriceConfigurationUseCase:
    """Use case for deleting a price configuration."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(self, price_id: str) -> bool:
        """Execute the use case."""
        if not await self.price_repository.exists(price_id):
            raise PriceConfigurationNotFoundError(price_id)

        return await self.price_repository.delete(price_id)
