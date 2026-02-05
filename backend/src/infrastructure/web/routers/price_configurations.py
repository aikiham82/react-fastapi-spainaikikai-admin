"""Price Configuration routes."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from src.infrastructure.web.dto.price_configuration_dto import (
    PriceConfigurationCreate,
    PriceConfigurationUpdate,
    PriceConfigurationResponse,
    LicensePriceQuery,
    LicensePriceResponse
)
from src.infrastructure.web.dependencies import (
    get_all_prices_use_case,
    get_price_configuration_use_case,
    get_create_price_configuration_use_case,
    get_update_price_configuration_use_case,
    get_delete_price_configuration_use_case,
    get_license_price_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User
from src.domain.exceptions.price_configuration import (
    PriceConfigurationNotFoundError,
    PriceConfigurationAlreadyExistsError,
    PriceNotFoundError
)

router = APIRouter(prefix="/price-configurations", tags=["price-configurations"])


@router.get("", response_model=List[PriceConfigurationResponse])
async def get_all_prices(
    active_only: bool = False,
    limit: int = 100,
    get_all_use_case = Depends(get_all_prices_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all price configurations."""
    prices = await get_all_use_case.execute(active_only=active_only, limit=limit)
    return [
        PriceConfigurationResponse(
            id=p.id,
            key=p.key,
            price=p.price,
            description=p.description,
            is_active=p.is_active,
            valid_from=p.valid_from,
            valid_until=p.valid_until,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in prices
    ]


@router.get("/license-price", response_model=LicensePriceResponse)
async def get_license_price(
    technical_grade: str,
    instructor_category: str,
    age_category: str,
    get_price_use_case = Depends(get_license_price_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get the price for a specific license type combination."""
    try:
        price_config = await get_price_use_case.execute(
            technical_grade=technical_grade,
            instructor_category=instructor_category,
            age_category=age_category
        )
        return LicensePriceResponse(
            key=price_config.key,
            price=price_config.price,
            description=price_config.description
        )
    except PriceNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/{price_id}", response_model=PriceConfigurationResponse)
async def get_price_configuration(
    price_id: str,
    get_price_use_case = Depends(get_price_configuration_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get price configuration by ID."""
    try:
        price_config = await get_price_use_case.execute(price_id)
        return PriceConfigurationResponse(
            id=price_config.id,
            key=price_config.key,
            price=price_config.price,
            description=price_config.description,
            is_active=price_config.is_active,
            valid_from=price_config.valid_from,
            valid_until=price_config.valid_until,
            created_at=price_config.created_at,
            updated_at=price_config.updated_at
        )
    except PriceConfigurationNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("", response_model=PriceConfigurationResponse, status_code=status.HTTP_201_CREATED)
async def create_price_configuration(
    price_data: PriceConfigurationCreate,
    create_use_case = Depends(get_create_price_configuration_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new price configuration."""
    try:
        price_config = await create_use_case.execute(
            key=price_data.key,
            price=price_data.price,
            description=price_data.description,
            is_active=price_data.is_active,
            valid_from=price_data.valid_from,
            valid_until=price_data.valid_until
        )
        return PriceConfigurationResponse(
            id=price_config.id,
            key=price_config.key,
            price=price_config.price,
            description=price_config.description,
            is_active=price_config.is_active,
            valid_from=price_config.valid_from,
            valid_until=price_config.valid_until,
            created_at=price_config.created_at,
            updated_at=price_config.updated_at
        )
    except PriceConfigurationAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )


@router.put("/{price_id}", response_model=PriceConfigurationResponse)
async def update_price_configuration(
    price_id: str,
    price_data: PriceConfigurationUpdate,
    update_use_case = Depends(get_update_price_configuration_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Update a price configuration."""
    try:
        price_config = await update_use_case.execute(
            price_id=price_id,
            price=price_data.price,
            description=price_data.description,
            is_active=price_data.is_active,
            valid_from=price_data.valid_from,
            valid_until=price_data.valid_until
        )
        return PriceConfigurationResponse(
            id=price_config.id,
            key=price_config.key,
            price=price_config.price,
            description=price_config.description,
            is_active=price_config.is_active,
            valid_from=price_config.valid_from,
            valid_until=price_config.valid_until,
            created_at=price_config.created_at,
            updated_at=price_config.updated_at
        )
    except PriceConfigurationNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{price_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_price_configuration(
    price_id: str,
    delete_use_case = Depends(get_delete_price_configuration_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a price configuration."""
    try:
        await delete_use_case.execute(price_id)
        return None
    except PriceConfigurationNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
