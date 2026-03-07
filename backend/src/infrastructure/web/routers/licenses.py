"""License routes."""

from typing import List, Optional
from io import BytesIO
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from datetime import datetime

from bson import ObjectId
from src.infrastructure.web.dto.license_dto import (
    LicenseCreate,
    LicenseUpdate,
    LicenseRenewRequest,
    LicenseResponse,
    LicenseListResponse
)
from src.infrastructure.database import get_database
from src.infrastructure.web.mappers_license import LicenseMapper
from src.infrastructure.web.dependencies import (
    get_all_licenses_use_case,
    get_license_use_case,
    get_expiring_licenses_use_case,
    get_create_license_use_case,
    get_renew_license_use_case,
    get_update_license_use_case,
    get_delete_license_use_case,
    get_generate_license_image_use_case,
    get_auth_context
)
from src.infrastructure.web.authorization import (
    AuthContext,
    check_club_access_ctx,
    get_club_filter_ctx,
    require_super_admin
)
from src.domain.exceptions.license import LicenseNotFoundError, LicenseImageGenerationError
from src.domain.exceptions.member import MemberNotFoundError

router = APIRouter(prefix="/licenses", tags=["licenses"])

GRADE_GROUP_ORDER = {"shidoin": 0, "fukushidoin": 1, "dan": 2, "kyu": 3, "unknown": 4}


def _get_sort_key(item: LicenseResponse):
    """Sort key: expiry_date desc, grade priority asc, dan_grade desc, member_name asc."""
    expiry_ts = item.expiry_date.timestamp() if item.expiry_date else 0
    if item.instructor_category in ("shidoin", "fukushidoin"):
        grade_group = item.instructor_category
    elif item.dan_grade > 0:
        grade_group = "dan"
    else:
        grade_group = "kyu"
    grade_priority = GRADE_GROUP_ORDER.get(grade_group, 4)
    return (-expiry_ts, grade_priority, -item.dan_grade, (item.member_name or "").lower())


def _generate_license_number() -> str:
    """Generate a unique license number."""
    return f"SA-{datetime.now().year}{str(uuid.uuid4())[:6].upper()}"


def _get_grade_string(license_data: LicenseCreate) -> str:
    """Get grade string from either grade or dan_grade field."""
    if license_data.grade:
        return license_data.grade
    if license_data.dan_grade is not None and license_data.dan_grade > 0:
        if license_data.technical_grade == "kyu":
            return f"{license_data.dan_grade}º Kyu"
        return f"{license_data.dan_grade}º Dan"
    return "Kyu"


def _get_expiration_date(license_data: LicenseCreate) -> Optional[datetime]:
    """Get expiration date from either expiration_date or expiry_date field."""
    return license_data.expiration_date or license_data.expiry_date


async def _get_club_member_ids(club_id: str) -> set:
    """Get the set of member ID strings for a given club."""
    db = get_database()
    member_ids = await db["members"].distinct("_id", {"club_id": club_id})
    return {str(m) for m in member_ids}


async def _populate_member_names(items: List[LicenseResponse]) -> List[LicenseResponse]:
    """Populate member_name for license items."""
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


@router.get("", response_model=LicenseListResponse)
async def get_licenses(
    limit: int = 20,
    offset: int = 0,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    get_all_use_case = Depends(get_all_licenses_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all licenses, optionally filtered by club, member, status, or member name search."""
    # Club admins are forced to their club only
    effective_club_id = get_club_filter_ctx(ctx)

    # Status is computed in-domain (based on expiration_date), so we must
    # fetch all matching licenses from the DB and filter/paginate in memory.
    # Use 0 (unlimited) for the DB query; pagination is applied later.
    db_limit = 0

    # If search is provided, find matching member IDs first
    effective_member_id = member_id
    member_ids_from_search: Optional[List[str]] = None
    if search:
        db = get_database()
        member_query = {
            "$or": [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}}
            ]
        }
        matching_members = await db["members"].find(member_query, {"_id": 1}).to_list(length=None)
        member_ids_from_search = [str(m["_id"]) for m in matching_members]
        if not member_ids_from_search:
            return LicenseListResponse(items=[], total=0, offset=offset, limit=limit)

    if member_ids_from_search is not None:
        # Search by member name - use find_by_member_ids
        licenses = await get_all_use_case.license_repository.find_by_member_ids(member_ids_from_search, db_limit)
        # Apply club filter
        if effective_club_id is not None:
            club_member_ids = await _get_club_member_ids(effective_club_id)
            licenses = [lic for lic in licenses if lic.member_id in club_member_ids]
        elif club_id:
            club_member_ids = await _get_club_member_ids(club_id)
            licenses = [lic for lic in licenses if lic.member_id in club_member_ids]
    elif effective_club_id is not None:
        licenses = await get_all_use_case.execute(db_limit, effective_club_id, effective_member_id)
    elif club_id:
        licenses = await get_all_use_case.execute(db_limit, club_id, effective_member_id)
    else:
        licenses = await get_all_use_case.execute(db_limit, None, effective_member_id)

    # Filter by status after domain conversion (status is computed from expiry date)
    if status:
        licenses = [lic for lic in licenses if lic.status.value == status]

    items = LicenseMapper.to_response_list(licenses)
    items = await _populate_member_names(items)
    items.sort(key=_get_sort_key)
    total = len(items)
    if limit > 0:
        items = items[offset:offset + limit]
    else:
        items = items[offset:]
    return LicenseListResponse(
        items=items,
        total=total,
        offset=offset,
        limit=limit
    )


@router.get("/{license_id}/image")
async def get_license_image(
    license_id: str,
    generate_image_use_case = Depends(get_generate_license_image_use_case),
    get_license_use_case_instance = Depends(get_license_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get license image as PNG.

    Returns a PNG image of the license card with member data overlaid.
    """
    # First verify access to the license
    try:
        license = await get_license_use_case_instance.execute(license_id)
        if license.club_id:
            check_club_access_ctx(ctx, license.club_id)
        elif ctx.is_club_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this license"
            )
    except LicenseNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"License with ID {license_id} not found"
        )

    try:
        result = await generate_image_use_case.execute(license_id)
        return StreamingResponse(
            BytesIO(result.image_bytes),
            media_type=result.content_type,
            headers={
                "Content-Disposition": f"attachment; filename={result.filename}"
            }
        )
    except LicenseNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"License with ID {license_id} not found"
        )
    except MemberNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except LicenseImageGenerationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate license image: {str(e)}"
        )


@router.get("/{license_id}", response_model=LicenseResponse)
async def get_license(
    license_id: str,
    get_license_use_case = Depends(get_license_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get license by ID."""
    license = await get_license_use_case.execute(license_id)

    # Verify club access
    if license.club_id:
        check_club_access_ctx(ctx, license.club_id)
    elif ctx.is_club_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this license"
        )

    return LicenseMapper.to_response_dto(license)


@router.get("/member/{member_id}", response_model=List[LicenseResponse])
async def get_licenses_by_member(
    member_id: str,
    limit: int = 0,
    get_all_use_case = Depends(get_all_licenses_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get licenses by member ID."""
    # Club admins are forced to their club only
    effective_club_id = get_club_filter_ctx(ctx)
    licenses = await get_all_use_case.execute(limit, club_id=effective_club_id, member_id=member_id)

    # Additional filter for club admins - ensure all licenses belong to their club
    if ctx.is_club_admin:
        licenses = [lic for lic in licenses if lic.club_id == ctx.club_id]

    return LicenseMapper.to_response_list(licenses)


@router.get("/expiring", response_model=List[LicenseResponse])
async def get_expiring_licenses(
    days: int = 30,
    limit: int = 0,
    get_expiring_use_case = Depends(get_expiring_licenses_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get licenses expiring soon."""
    licenses = await get_expiring_use_case.execute(days, limit)

    # Filter for club admins - only show their club's licenses
    if ctx.is_club_admin:
        licenses = [lic for lic in licenses if lic.club_id == ctx.club_id]

    return LicenseMapper.to_response_list(licenses)


@router.post("", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
async def create_license(
    license_data: LicenseCreate,
    get_create_use_case = Depends(get_create_license_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new license (Super Admin only)."""
    require_super_admin(ctx)

    effective_club_id = license_data.club_id

    license = await get_create_use_case.execute(
        license_number=license_data.license_number or _generate_license_number(),
        member_id=license_data.member_id,
        club_id=effective_club_id,
        association_id=license_data.association_id,
        license_type=license_data.license_type,
        grade=_get_grade_string(license_data),
        issue_date=license_data.issue_date,
        expiration_date=_get_expiration_date(license_data)
    )
    return LicenseMapper.to_response_dto(license)


@router.put("/{license_id}/renew", response_model=LicenseResponse)
async def renew_license(
    license_id: str,
    renew_data: LicenseRenewRequest,
    get_renew_use_case = Depends(get_renew_license_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Renew license (Super Admin only)."""
    require_super_admin(ctx)

    expiration_date = datetime.fromisoformat(renew_data.expiration_date) if isinstance(renew_data.expiration_date, str) else renew_data.expiration_date
    license = await get_renew_use_case.execute(license_id, expiration_date)
    return LicenseMapper.to_response_dto(license)


@router.put("/{license_id}", response_model=LicenseResponse)
async def update_license(
    license_id: str,
    license_data: LicenseUpdate,
    get_update_use_case = Depends(get_update_license_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Update license (Super Admin only)."""
    require_super_admin(ctx)

    update_data = license_data.model_dump(exclude_none=True)
    license = await get_update_use_case.execute(license_id, **update_data)
    return LicenseMapper.to_response_dto(license)


@router.delete("/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_license(
    license_id: str,
    get_delete_use_case = Depends(get_delete_license_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete license (Super Admin only)."""
    require_super_admin(ctx)

    await get_delete_use_case.execute(license_id)
    return None
