"""Insurance routes."""

from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from src.infrastructure.web.dto.insurance_dto import (
    InsuranceCreate,
    InsuranceUpdate,
    InsuranceResponse,
    InsuranceListResponse
)
from src.infrastructure.web.mappers_insurance import InsuranceMapper
from src.infrastructure.web.dependencies import (
    get_all_insurances_use_case,
    get_insurance_use_case,
    get_expiring_insurances_use_case,
    get_create_insurance_use_case,
    get_update_insurance_use_case,
    get_delete_insurance_use_case,
    get_member_repository,
    get_auth_context
)
from src.infrastructure.web.authorization import (
    AuthContext,
    check_club_access_ctx,
    get_club_filter_ctx
)
from src.infrastructure.database import get_database

router = APIRouter(prefix="/insurances", tags=["insurances"])


async def _get_member_club_id(member_id: Optional[str]) -> Optional[str]:
    """Get the club_id for a member from the database."""
    if not member_id:
        return None
    db = get_database()
    try:
        # Try string ID first (current schema), then ObjectId (legacy)
        member = await db["members"].find_one({"_id": member_id})
        if not member:
            member = await db["members"].find_one({"_id": ObjectId(member_id)})
        if member:
            return member.get("club_id")
    except Exception:
        pass
    return None


async def _populate_member_names(items: List[InsuranceResponse]) -> List[InsuranceResponse]:
    """Populate member_name for insurance items."""
    db = get_database()
    for item in items:
        if item.member_id:
            try:
                # Try string ID first (current schema), then ObjectId (legacy)
                member = await db["members"].find_one({"_id": item.member_id})
                if not member:
                    member = await db["members"].find_one({"_id": ObjectId(item.member_id)})
                if member:
                    item.member_name = f"{member.get('first_name', '')} {member.get('last_name', '')}".strip()
            except Exception:
                pass
    return items


@router.get("", response_model=InsuranceListResponse)
async def get_insurances(
    limit: int = 0,
    offset: int = 0,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None,
    get_all_use_case = Depends(get_all_insurances_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all insurances, optionally filtered by club or member."""
    # Club admins are forced to their club only
    effective_club_id = get_club_filter_ctx(ctx)

    if effective_club_id is not None:
        # Club admin - use their club_id (ignore query param)
        insurances = await get_all_use_case.execute(limit, effective_club_id, member_id)
    elif club_id:
        # Super admin with explicit club filter
        insurances = await get_all_use_case.execute(limit, club_id, member_id)
    else:
        # Super admin - see all insurances
        insurances = await get_all_use_case.execute(limit, None, member_id)

    items = InsuranceMapper.to_response_list(insurances)
    items = await _populate_member_names(items)
    return InsuranceListResponse(
        items=items,
        total=len(items),
        offset=offset,
        limit=limit
    )


@router.get("/{insurance_id}", response_model=InsuranceResponse)
async def get_insurance(
    insurance_id: str,
    get_insurance_use_case = Depends(get_insurance_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get insurance by ID."""
    insurance = await get_insurance_use_case.execute(insurance_id)

    # Verify club access through member
    if insurance.member_id and ctx.is_club_admin:
        member_club_id = await _get_member_club_id(insurance.member_id)
        if member_club_id:
            check_club_access_ctx(ctx, member_club_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this insurance"
            )
    elif ctx.is_club_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this insurance"
        )

    return InsuranceMapper.to_response_dto(insurance)


@router.get("/member/{member_id}", response_model=List[InsuranceResponse])
async def get_insurances_by_member(
    member_id: str,
    limit: int = 0,
    get_all_use_case = Depends(get_all_insurances_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get insurances by member ID."""
    # Verify club admin can access this member
    if ctx.is_club_admin:
        member_club_id = await _get_member_club_id(member_id)
        if member_club_id != ctx.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this member's insurances"
            )

    insurances = await get_all_use_case.execute(limit, club_id=None, member_id=member_id)
    return InsuranceMapper.to_response_list(insurances)


@router.get("/expiring", response_model=List[InsuranceResponse])
async def get_expiring_insurances(
    days: int = 30,
    limit: int = 0,
    get_expiring_use_case = Depends(get_expiring_insurances_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get insurances expiring soon."""
    insurances = await get_expiring_use_case.execute(days, limit)

    # Filter for club admins - only show their club's insurances
    if ctx.is_club_admin:
        filtered_insurances = []
        for ins in insurances:
            member_club_id = await _get_member_club_id(ins.member_id)
            if member_club_id == ctx.club_id:
                filtered_insurances.append(ins)
        insurances = filtered_insurances

    return InsuranceMapper.to_response_list(insurances)


@router.post("", response_model=InsuranceResponse, status_code=status.HTTP_201_CREATED)
async def create_insurance(
    insurance_data: InsuranceCreate,
    get_create_use_case = Depends(get_create_insurance_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new insurance."""
    # Verify member access for club admins
    if ctx.is_club_admin and insurance_data.member_id:
        member_club_id = await _get_member_club_id(insurance_data.member_id)
        if member_club_id != ctx.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create insurance for a member in another club"
            )

    insurance = await get_create_use_case.execute(
        member_id=insurance_data.member_id,
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
    get_insurance_use_case_instance = Depends(get_insurance_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Update insurance."""
    # First verify access to the insurance
    existing_insurance = await get_insurance_use_case_instance.execute(insurance_id)

    if existing_insurance.member_id and ctx.is_club_admin:
        member_club_id = await _get_member_club_id(existing_insurance.member_id)
        if member_club_id:
            check_club_access_ctx(ctx, member_club_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this insurance"
            )
    elif ctx.is_club_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this insurance"
        )

    update_data = insurance_data.model_dump(exclude_none=True)
    insurance = await get_update_use_case.execute(insurance_id, **update_data)
    return InsuranceMapper.to_response_dto(insurance)


@router.delete("/{insurance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_insurance(
    insurance_id: str,
    get_delete_use_case = Depends(get_delete_insurance_use_case),
    get_insurance_use_case_instance = Depends(get_insurance_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete insurance."""
    # First verify access to the insurance
    existing_insurance = await get_insurance_use_case_instance.execute(insurance_id)

    if existing_insurance.member_id and ctx.is_club_admin:
        member_club_id = await _get_member_club_id(existing_insurance.member_id)
        if member_club_id:
            check_club_access_ctx(ctx, member_club_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this insurance"
            )
    elif ctx.is_club_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this insurance"
        )

    await get_delete_use_case.execute(insurance_id)
    return None
