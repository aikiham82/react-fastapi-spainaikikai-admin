"""Get License Price use case."""

from src.domain.entities.price_configuration import PriceConfiguration
from src.domain.exceptions.price_configuration import PriceNotFoundError
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


class GetLicensePriceUseCase:
    """Use case for getting the price for a specific license type combination."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(
        self,
        grado_tecnico: str,
        categoria_instructor: str,
        categoria_edad: str
    ) -> PriceConfiguration:
        """
        Execute the use case.

        Args:
            grado_tecnico: Technical grade (dan/kyu)
            categoria_instructor: Instructor category (none/fukushidoin/shidoin)
            categoria_edad: Age category (infantil/adulto)

        Returns:
            The price configuration for the specified license type.

        Raises:
            PriceNotFoundError: If no price is configured for this combination.
        """
        price_config = await self.price_repository.find_by_license_type(
            grado_tecnico=grado_tecnico,
            categoria_instructor=categoria_instructor,
            categoria_edad=categoria_edad
        )

        if not price_config:
            raise PriceNotFoundError(
                grado_tecnico=grado_tecnico,
                categoria_instructor=categoria_instructor,
                categoria_edad=categoria_edad
            )

        return price_config
