"""Club routes."""

from dataclasses import asdict
from typing import List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Path, UploadFile, status
from starlette.concurrency import run_in_threadpool

from src.infrastructure.web.dto.club_dto import (
    ClubCreate,
    ClubUpdate,
    ClubResponse,
    DeregisteredClubResponse,
)
from src.infrastructure.web.mappers_club import ClubMapper
from src.infrastructure.web.audit import audit
from src.domain.exceptions.club import ClubNotFoundError
from src.infrastructure.web.dependencies import (
    get_all_clubs_use_case,
    get_club_use_case,
    get_create_club_use_case,
    get_update_club_use_case,
    get_delete_club_use_case,
    get_auth_context,
    get_deregister_club_use_case,
    get_set_club_logo_use_case,
)
from src.infrastructure.web.uploaded_images import UPLOADS_ROOT, read_image_upload, save_atomically, to_jpeg
from src.infrastructure.web.authorization import (
    AuthContext,
    check_club_access_ctx,
    require_super_admin,
)

CLUB_LOGO_DIR = UPLOADS_ROOT / "clubs"

router = APIRouter(prefix="/clubs", tags=["clubs"])


@router.get("", response_model=List[ClubResponse])
async def get_clubs(
    limit: int = 0,
    get_all_use_case = Depends(get_all_clubs_use_case),
    get_single_club_use_case = Depends(get_club_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all clubs."""
    # Club admins only see their own club
    if ctx.is_club_admin and not ctx.is_super_admin:
        if ctx.club_id:
            club = await get_single_club_use_case.execute(ctx.club_id)
            return ClubMapper.to_response_list([club])
        return []

    # Super admins see all clubs
    clubs = await get_all_use_case.execute(limit)
    return ClubMapper.to_response_list(clubs)


@router.get("/{club_id}", response_model=ClubResponse)
async def get_club(
    club_id: str,
    get_club_use_case = Depends(get_club_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get club by ID."""
    check_club_access_ctx(ctx, club_id)
    club = await get_club_use_case.execute(club_id)
    return ClubMapper.to_response_dto(club)


@router.post("", response_model=ClubResponse, status_code=status.HTTP_201_CREATED)
async def create_club(
    club_data: ClubCreate,
    get_create_use_case = Depends(get_create_club_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new club (Super Admin only)."""
    require_super_admin(ctx)
    club = await get_create_use_case.execute(
        name=club_data.name,
        address=club_data.address,
        city=club_data.city,
        province=club_data.province,
        postal_code=club_data.postal_code,
        country=club_data.country,
        phone=club_data.phone,
        email=club_data.email,
        website=club_data.website,
    )
    return ClubMapper.to_response_dto(club)


@router.put("/{club_id}", response_model=ClubResponse)
async def update_club(
    club_id: str,
    club_data: ClubUpdate,
    get_update_use_case = Depends(get_update_club_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Update club (Club Admin for own club, Super Admin for any)."""
    check_club_access_ctx(ctx, club_id)
    club = await get_update_use_case.execute(club_id, **club_data.model_dump(exclude_none=True))
    return ClubMapper.to_response_dto(club)


@router.post("/{club_id}/logo", response_model=ClubResponse)
async def upload_club_logo(
    club_id: str = Path(pattern=r"^[A-Za-z0-9_-]+$"),
    file: UploadFile = File(...),
    set_logo_use_case = Depends(get_set_club_logo_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Upload the club logo (Club Admin for own club, Super Admin for any)."""
    check_club_access_ctx(ctx, club_id)
    content = await read_image_upload(file)
    jpeg = await run_in_threadpool(to_jpeg, content, (256, 256), pad=True)
    save_atomically(CLUB_LOGO_DIR, f"{club_id}.jpg", jpeg)

    logo_url = f"/uploads/clubs/{club_id}.jpg?v={int(datetime.utcnow().timestamp())}"
    try:
        club = await set_logo_use_case.execute(club_id, logo_url)
    except ClubNotFoundError:
        (CLUB_LOGO_DIR / f"{club_id}.jpg").unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club no encontrado")
    return ClubMapper.to_response_dto(club)


@router.delete("/{club_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_club(
    club_id: str,
    get_delete_use_case = Depends(get_delete_club_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete club (Super Admin only)."""
    require_super_admin(ctx)
    await get_delete_use_case.execute(club_id)
    return None


@router.post("/{club_id}/deregister", response_model=DeregisteredClubResponse)
async def deregister_club(
    club_id: str,
    deregister_use_case = Depends(get_deregister_club_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Deregister a club: the club, its members and their logins are switched off (Super Admin only)."""
    require_super_admin(ctx)
    try:
        result = await deregister_use_case.execute(club_id)
    except ClubNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club no encontrado")

    audit("club.deregistered", club_id=club_id, members=result.members, accounts=result.accounts, by=ctx.user.id)
    return DeregisteredClubResponse(**asdict(result))
