"""Association routes."""

from typing import List

from fastapi import APIRouter, HTTPException, status

from src.infrastructure.web.dto.association_dto import (
    AssociationCreate,
    AssociationUpdate,
    AssociationResponse
)
from src.infrastructure.web.mappers_association import AssociationMapper
from src.infrastructure.web.dependencies import (
    get_all_associations_use_case,
    get_association_use_case,
    get_create_association_use_case,
    get_update_association_use_case,
    get_delete_association_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User

router = APIRouter(prefix="/associations", tags=["associations"])


@router.get("", response_model=List[AssociationResponse])
async def get_associations(
    limit: int = 100,
    get_all_use_case = Depends(get_all_associations_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all associations (Association Admin only)."""
    associations = await get_all_use_case.execute(limit)
    return AssociationMapper.to_response_list(associations)


@router.get("/{association_id}", response_model=AssociationResponse)
async def get_association(
    association_id: str,
    get_association_use_case = Depends(get_association_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get association by ID."""
    association = await get_association_use_case.execute(association_id)
    return AssociationMapper.to_response_dto(association)


@router.post("", response_model=AssociationResponse, status_code=status.HTTP_201_CREATED)
async def create_association(
    association_data: AssociationCreate,
    get_create_use_case = Depends(get_create_association_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new association (Association Admin only)."""
    association = await get_create_use_case.execute(
        name=association_data.name,
        address=association_data.address,
        city=association_data.city,
        province=association_data.province,
        postal_code=association_data.postal_code,
        country=association_data.country,
        phone=association_data.phone,
        email=association_data.email,
        cif=association_data.cif
    )
    return AssociationMapper.to_response_dto(association)


@router.put("/{association_id}", response_model=AssociationResponse)
async def update_association(
    association_id: str,
    association_data: AssociationUpdate,
    get_update_use_case = Depends(get_update_association_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Update association (Association Admin only)."""
    association = await get_update_use_case.execute(association_id, **association_data.model_dump(exclude_none=True))
    return AssociationMapper.to_response_dto(association)


@router.delete("/{association_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_association(
    association_id: str,
    get_delete_use_case = Depends(get_delete_association_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete association (Association Admin only)."""
    await get_delete_use_case.execute(association_id)
    return None
