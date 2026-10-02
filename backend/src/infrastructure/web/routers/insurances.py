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
    require_club_access,
    require_club_admin_ctx
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


async def _require_access_to_member(ctx: AuthContext, member_id: Optional[str]) -> None:
    """Allow a super admin, or a club admin when the member belongs to their club."""
    require_club_admin_ctx(ctx)
    if ctx.is_super_admin:
        return
    require_club_access(ctx, await _get_member_club_id(member_id), "Access denied to this insurance")


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
    if not ctx.is_super_admin:
        require_club_access(ctx, ctx.club_id)
        if member_id:
            await _require_access_to_member(ctx, member_id)
        club_id = ctx.club_id

    insurances = await get_all_use_case.execute(limit, club_id, member_id)

    items = InsuranceMapper.to_response_list(insurances)
    items = await _populate_member_names(items)
    return InsuranceListResponse(
        items=items,
        total=len(items),
        offset=offset,
        limit=limit
    )


@router.get("/expiring", response_model=List[InsuranceResponse])
async def get_expiring_insurances(
    days: int = 30,
    limit: int = 0,
    get_expiring_use_case = Depends(get_expiring_insurances_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get insurances expiring soon."""
    if not ctx.is_super_admin:
        require_club_access(ctx, ctx.club_id)
    insurances = await get_expiring_use_case.execute(days, limit)

    if not ctx.is_super_admin:
        insurances = [
            ins for ins in insurances
            if await _get_member_club_id(ins.member_id) == ctx.club_id
        ]

    return InsuranceMapper.to_response_list(insurances)


@router.get("/member/{member_id}", response_model=List[InsuranceResponse])
async def get_insurances_by_member(
    member_id: str,
    limit: int = 0,
    get_all_use_case = Depends(get_all_insurances_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get insurances by member ID."""
    await _require_access_to_member(ctx, member_id)

    insurances = await get_all_use_case.execute(limit, club_id=None, member_id=member_id)
    return InsuranceMapper.to_response_list(insurances)


@router.get("/{insurance_id}", response_model=InsuranceResponse)
async def get_insurance(
    insurance_id: str,
    get_insurance_use_case = Depends(get_insurance_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get insurance by ID."""
    require_club_admin_ctx(ctx)
    insurance = await get_insurance_use_case.execute(insurance_id)
    await _require_access_to_member(ctx, insurance.member_id)

    return InsuranceMapper.to_response_dto(insurance)


@router.post("", response_model=InsuranceResponse, status_code=status.HTTP_201_CREATED)
async def create_insurance(
    insurance_data: InsuranceCreate,
    get_create_use_case = Depends(get_create_insurance_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new insurance."""
    await _require_access_to_member(ctx, insurance_data.member_id)

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
    require_club_admin_ctx(ctx)
    existing_insurance = await get_insurance_use_case_instance.execute(insurance_id)
    await _require_access_to_member(ctx, existing_insurance.member_id)

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
    require_club_admin_ctx(ctx)
    existing_insurance = await get_insurance_use_case_instance.execute(insurance_id)
    await _require_access_to_member(ctx, existing_insurance.member_id)

    await get_delete_use_case.execute(insurance_id)
    return None
