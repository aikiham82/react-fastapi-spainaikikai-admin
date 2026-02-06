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
    get_delete_member_use_case,
    get_auth_context,
)
from src.infrastructure.web.authorization import (
    AuthContext,
    check_club_access_ctx,
    get_club_filter_ctx,
)

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=List[MemberResponse])
async def get_members(
    limit: int = 100,
    club_id: Optional[str] = Query(None),
    get_all_use_case = Depends(get_all_members_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all members, optionally filtered by club."""
    # Club admins are forced to their club only
    effective_club_id = get_club_filter_ctx(ctx)

    if effective_club_id is not None:
        # Club admin - use their club_id (ignore query param)
        members = await get_all_use_case.execute(limit, effective_club_id)
    elif club_id:
        # Association admin with explicit club filter
        members = await get_all_use_case.execute(limit, club_id)
    else:
        # Association admin - see all members
        members = await get_all_use_case.execute(limit, None)

    return MemberMapper.to_response_list(members)


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: str,
    get_member_use_case = Depends(get_member_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get member by ID."""
    member = await get_member_use_case.execute(member_id)

    # Verify club access
    if member.club_id:
        check_club_access_ctx(ctx, member.club_id)
    elif ctx.is_club_admin:
        # Member has no club, but user is club admin - deny
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this member"
        )

    return MemberMapper.to_response_dto(member)


@router.get("/club/{club_id}", response_model=List[MemberResponse])
async def get_members_by_club(
    club_id: str,
    limit: int = 100,
    get_all_use_case = Depends(get_all_members_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get members by club ID."""
    check_club_access_ctx(ctx, club_id)
    members = await get_all_use_case.execute(limit, club_id)
    return MemberMapper.to_response_list(members)


@router.get("/search", response_model=List[MemberResponse])
async def search_members(
    name: str = Query(...),
    limit: int = 100,
    get_search_use_case = Depends(get_search_members_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Search members by name."""
    members = await get_search_use_case.execute(name, limit)

    # For club admins, filter to only return members from their club
    if ctx.is_club_admin:
        members = [m for m in members if m.club_id == ctx.club_id]

    return MemberMapper.to_response_list(members)


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_data: MemberCreate,
    get_create_use_case = Depends(get_create_member_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new member."""
    # Determine effective club_id
    effective_club_id = member_data.club_id

    if ctx.is_club_admin:
        # Club admin must create members in their own club
        if member_data.club_id and member_data.club_id != ctx.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create member in another club"
            )
        # Force club_id to be the user's club
        effective_club_id = ctx.club_id
    elif member_data.club_id:
        # Association admin with explicit club - verify it exists (optional)
        check_club_access_ctx(ctx, member_data.club_id)

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
        club_id=effective_club_id,
        birth_date=member_data.birth_date
    )
    return MemberMapper.to_response_dto(member)


@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: str,
    member_data: MemberUpdate,
    get_member_use_case_instance = Depends(get_member_use_case),
    get_update_use_case = Depends(get_update_member_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Update member."""
    # First fetch the member to check access
    existing_member = await get_member_use_case_instance.execute(member_id)

    if existing_member.club_id:
        check_club_access_ctx(ctx, existing_member.club_id)
    elif ctx.is_club_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this member"
        )

    # Prevent club_id change by club_admin
    update_data = member_data.model_dump(exclude_none=True)
    if ctx.is_club_admin and 'club_id' in update_data:
        if update_data['club_id'] != ctx.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot transfer member to another club"
            )

    member = await get_update_use_case.execute(member_id, **update_data)
    return MemberMapper.to_response_dto(member)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: str,
    get_member_use_case_instance = Depends(get_member_use_case),
    get_delete_use_case = Depends(get_delete_member_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete member."""
    # First fetch the member to check access
    existing_member = await get_member_use_case_instance.execute(member_id)

    if existing_member.club_id:
        check_club_access_ctx(ctx, existing_member.club_id)
    elif ctx.is_club_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this member"
        )

    await get_delete_use_case.execute(member_id)
    return None
