"""Insurance routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from src.infrastructure.web.dto.insurance_dto import (
    InsuranceCreate,
    InsuranceUpdate,
    InsuranceResponse
)
from src.infrastructure.web.mappers_insurance import InsuranceMapper
from src.infrastructure.web.dependencies import (
    get_all_insurances_use_case,
    get_insurance_use_case,
    get_expiring_insurances_use_case,
    get_create_insurance_use_case,
    get_update_insurance_use_case,
    get_delete_insurance_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User

router = APIRouter(prefix="/insurances", tags=["insurances"])


@router.get("", response_model=List[InsuranceResponse])
async def get_insurances(
    limit: int = 100,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None,
    get_all_use_case = Depends(get_all_insurances_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all insurances, optionally filtered by club or member."""
    insurances = await get_all_use_case.execute(limit, club_id, member_id)
    return InsuranceMapper.to_response_list(insurances)


@router.get("/{insurance_id}", response_model=InsuranceResponse)
async def get_insurance(
    insurance_id: str,
    get_insurance_use_case = Depends(get_insurance_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get insurance by ID."""
    insurance = await get_insurance_use_case.execute(insurance_id)
    return InsuranceMapper.to_response_dto(insurance)


@router.get("/member/{member_id}", response_model=List[InsuranceResponse])
async def get_insurances_by_member(
    member_id: str,
    limit: int = 100,
    get_all_use_case = Depends(get_all_insurances_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get insurances by member ID."""
    insurances = await get_all_use_case.execute(limit, member_id)
    return InsuranceMapper.to_response_list(insurances)


@router.get("/expiring", response_model=List[InsuranceResponse])
async def get_expiring_insurances(
    days: int = 30,
    limit: int = 100,
    get_expiring_use_case = Depends(get_expiring_insurances_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get insurances expiring soon."""
    insurances = await get_expiring_use_case.execute(days, limit)
    return InsuranceMapper.to_response_list(insurances)


@router.post("", response_model=InsuranceResponse, status_code=status.HTTP_201_CREATED)
async def create_insurance(
    insurance_data: InsuranceCreate,
    get_create_use_case = Depends(get_create_insurance_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new insurance."""
    insurance = await get_create_use_case.execute(
        member_id=insurance_data.member_id,
        club_id=insurance_data.club_id,
        insurance_type=insurance_data.insurance_type,
        policy_number=insurance_data.policy_number,
        insurance_company=insurance_data.insurance_company,
        start_date=insurance_data.start_date,
        end_date=insurance_data.end_date,
        coverage_amount=insurance_data.coverage_amount,
        payment_id=insurance_data.payment_id
    )
    return InsuranceMapper.to_response_dto(insurance)


@router.put("/{insurance_id}", response_model=InsuranceResponse)
async def update_insurance(
    insurance_id: str,
    insurance_data: InsuranceUpdate,
    get_update_use_case = Depends(get_update_insurance_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Update insurance."""
    insurance = await get_update_use_case.execute(insurance_id, **insurance_data.model_dump(exclude_none=True))
    return InsuranceMapper.to_response_dto(insurance)


@router.delete("/{insurance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_insurance(
    insurance_id: str,
    get_delete_use_case = Depends(get_delete_insurance_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete insurance."""
    await get_delete_use_case.execute(insurance_id)
    return None
