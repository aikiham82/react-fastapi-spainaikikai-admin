"""Member routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from src.infrastructure.web.dto.member_dto import (
    MemberCreate,
    MemberUpdate,
    MemberResponse
)
from src.infrastructure.web.mappers_member import MemberMapper
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_member_use_case,
    get_search_members_use_case,
    get_create_member_use_case,
    get_update_member_use_case,
    get_delete_member_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=List[MemberResponse])
async def get_members(
    limit: int = 100,
    club_id: Optional[str] = Query(None),
    get_all_use_case = Depends(get_all_members_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all members, optionally filtered by club."""
    members = await get_all_use_case.execute(limit, club_id)
    return MemberMapper.to_response_list(members)


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: str,
    get_member_use_case = Depends(get_member_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get member by ID."""
    member = await get_member_use_case.execute(member_id)
    return MemberMapper.to_response_dto(member)


@router.get("/club/{club_id}", response_model=List[MemberResponse])
async def get_members_by_club(
    club_id: str,
    limit: int = 100,
    get_all_use_case = Depends(get_all_members_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get members by club ID."""
    members = await get_all_use_case.execute(limit, club_id)
    return MemberMapper.to_response_list(members)


@router.get("/search", response_model=List[MemberResponse])
async def search_members(
    name: str = Query(...),
    limit: int = 100,
    get_search_use_case = Depends(get_search_members_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Search members by name."""
    members = await get_search_use_case.execute(name, limit)
    return MemberMapper.to_response_list(members)


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_data: MemberCreate,
    get_create_use_case = Depends(get_create_member_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new member."""
    member = await get_create_use_case.execute(
        first_name=member_data.first_name,
        last_name=member_data.last_name,
        dni=member_data.dni,
        email=member_data.email,
        phone=member_data.phone,
        address=member_data.address,
        city=member_data.city,
        province=member_data.province,
        postal_code=member_data.postal_code,
        country=member_data.country,
        federation_number=member_data.federation_number,
        club_id=member_data.club_id,
        birth_date=member_data.birth_date
    )
    return MemberMapper.to_response_dto(member)


@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: str,
    member_data: MemberUpdate,
    get_update_use_case = Depends(get_update_member_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Update member."""
    member = await get_update_use_case.execute(member_id, **member_data.model_dump(exclude_none=True))
    return MemberMapper.to_response_dto(member)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: str,
    get_delete_use_case = Depends(get_delete_member_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete member."""
    await get_delete_use_case.execute(member_id)
    return None
