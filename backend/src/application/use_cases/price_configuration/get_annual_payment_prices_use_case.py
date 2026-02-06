"""Get Annual Payment Prices use case."""

from typing import Dict, List

from src.domain.entities.price_configuration import PriceConfiguration
from src.application.ports.price_configuration_repository import PriceConfigurationRepositoryPort


# The 7 price keys required for annual payments
ANNUAL_PAYMENT_PRICE_KEYS = [
    "club_fee",
    "kyu-none-adulto",
    "kyu-none-infantil",
    "dan-none-adulto",
    "dan-fukushidoin_shidoin-adulto",
    "seguro_accidentes",
    "seguro_rc",
]


class GetAnnualPaymentPricesUseCase:
    """Use case for getting all prices needed for the annual payment form."""

    def __init__(self, price_repository: PriceConfigurationRepositoryPort):
        self.price_repository = price_repository

    async def execute(self) -> Dict[str, PriceConfiguration]:
        """Get all 7 annual payment price configurations.

        Returns:
            Dict mapping key -> PriceConfiguration for all annual payment prices.

        Raises:
            ValueError: If any required prices are missing or inactive.
        """
        configs = await self.price_repository.find_by_keys(ANNUAL_PAYMENT_PRICE_KEYS)
        result = {config.key: config for config in configs}

        missing = [key for key in ANNUAL_PAYMENT_PRICE_KEYS if key not in result]
        if missing:
            raise ValueError(
                f"Faltan configuraciones de precios: {', '.join(missing)}"
            )

        return result
