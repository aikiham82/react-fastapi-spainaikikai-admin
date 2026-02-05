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
        technical_grade: str,
        instructor_category: str,
        age_category: str
    ) -> PriceConfiguration:
        """
        Execute the use case.

        Args:
            technical_grade: Technical grade (dan/kyu)
            instructor_category: Instructor category (none/fukushidoin/shidoin)
            age_category: Age category (infantil/adulto)

        Returns:
            The price configuration for the specified license type.

        Raises:
            PriceNotFoundError: If no price is configured for this combination.
        """
        price_config = await self.price_repository.find_by_license_type(
            technical_grade=technical_grade,
            instructor_category=instructor_category,
            age_category=age_category
        )

        if not price_config:
            raise PriceNotFoundError(
                technical_grade=technical_grade,
                instructor_category=instructor_category,
                age_category=age_category
            )

        return price_config
