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
    get_generate_license_image_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.infrastructure.web.authorization import (
    check_club_access,
    get_club_filter,
    is_club_admin
)
from src.domain.entities.user import User
from src.domain.exceptions.license import LicenseNotFoundError, LicenseImageGenerationError
from src.domain.exceptions.member import MemberNotFoundError

router = APIRouter(prefix="/licenses", tags=["licenses"])


def _generate_license_number() -> str:
    """Generate a unique license number."""
    return f"SA-{datetime.now().year}{str(uuid.uuid4())[:6].upper()}"


def _get_grade_string(license_data: LicenseCreate) -> str:
    """Get grade string from either grade or dan_grade field."""
    if license_data.grade:
        return license_data.grade
    if license_data.dan_grade is not None:
        return f"{license_data.dan_grade} Dan" if license_data.dan_grade > 0 else "Kyu"
    return "Kyu"


def _get_expiration_date(license_data: LicenseCreate) -> Optional[datetime]:
    """Get expiration date from either expiration_date or expiry_date field."""
    return license_data.expiration_date or license_data.expiry_date


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
    get_all_use_case = Depends(get_all_licenses_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all licenses, optionally filtered by club or member."""
    # Club admins are forced to their club only
    effective_club_id = get_club_filter(current_user)

    if effective_club_id is not None:
        # Club admin - use their club_id (ignore query param)
        licenses = await get_all_use_case.execute(limit, effective_club_id, member_id)
    elif club_id:
        # Association admin with explicit club filter
        licenses = await get_all_use_case.execute(limit, club_id, member_id)
    else:
        # Association admin - see all licenses
        licenses = await get_all_use_case.execute(limit, None, member_id)

    items = LicenseMapper.to_response_list(licenses)
    items = await _populate_member_names(items)
    return LicenseListResponse(
        items=items,
        total=len(items),
        offset=offset,
        limit=limit
    )


@router.get("/{license_id}/image")
async def get_license_image(
    license_id: str,
    generate_image_use_case = Depends(get_generate_license_image_use_case),
    get_license_use_case_instance = Depends(get_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get license image as PNG.

    Returns a PNG image of the license card with member data overlaid.
    """
    # First verify access to the license
    try:
        license = await get_license_use_case_instance.execute(license_id)
        if license.club_id:
            check_club_access(current_user, license.club_id)
        elif is_club_admin(current_user):
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
    current_user: User = Depends(get_current_active_user)
):
    """Get license by ID."""
    license = await get_license_use_case.execute(license_id)

    # Verify club access
    if license.club_id:
        check_club_access(current_user, license.club_id)
    elif is_club_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this license"
        )

    return LicenseMapper.to_response_dto(license)


@router.get("/member/{member_id}", response_model=List[LicenseResponse])
async def get_licenses_by_member(
    member_id: str,
    limit: int = 100,
    get_all_use_case = Depends(get_all_licenses_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get licenses by member ID."""
    # Club admins are forced to their club only
    effective_club_id = get_club_filter(current_user)
    licenses = await get_all_use_case.execute(limit, club_id=effective_club_id, member_id=member_id)

    # Additional filter for club admins - ensure all licenses belong to their club
    if is_club_admin(current_user):
        licenses = [lic for lic in licenses if lic.club_id == current_user.club_id]

    return LicenseMapper.to_response_list(licenses)


@router.get("/expiring", response_model=List[LicenseResponse])
async def get_expiring_licenses(
    days: int = 30,
    limit: int = 100,
    get_expiring_use_case = Depends(get_expiring_licenses_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get licenses expiring soon."""
    licenses = await get_expiring_use_case.execute(days, limit)

    # Filter for club admins - only show their club's licenses
    if is_club_admin(current_user):
        licenses = [lic for lic in licenses if lic.club_id == current_user.club_id]

    return LicenseMapper.to_response_list(licenses)


@router.post("", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
async def create_license(
    license_data: LicenseCreate,
    get_create_use_case = Depends(get_create_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new license."""
    # Determine effective club_id
    effective_club_id = license_data.club_id

    if is_club_admin(current_user):
        # Club admin must create licenses in their own club
        if license_data.club_id and license_data.club_id != current_user.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create license in another club"
            )
        # Force club_id to be the user's club
        effective_club_id = current_user.club_id
    elif license_data.club_id:
        # Association admin with explicit club - verify access
        check_club_access(current_user, license_data.club_id)

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
    get_license_use_case_instance = Depends(get_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Renew license."""
    # First verify access to the license
    existing_license = await get_license_use_case_instance.execute(license_id)
    if existing_license.club_id:
        check_club_access(current_user, existing_license.club_id)
    elif is_club_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this license"
        )

    expiration_date = datetime.fromisoformat(renew_data.expiration_date) if isinstance(renew_data.expiration_date, str) else renew_data.expiration_date
    license = await get_renew_use_case.execute(license_id, expiration_date)
    return LicenseMapper.to_response_dto(license)


@router.put("/{license_id}", response_model=LicenseResponse)
async def update_license(
    license_id: str,
    license_data: LicenseUpdate,
    get_update_use_case = Depends(get_update_license_use_case),
    get_license_use_case_instance = Depends(get_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Update license."""
    # First verify access to the license
    existing_license = await get_license_use_case_instance.execute(license_id)
    if existing_license.club_id:
        check_club_access(current_user, existing_license.club_id)
    elif is_club_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this license"
        )

    # Prevent club_id change by club_admin
    update_data = license_data.model_dump(exclude_none=True)
    if is_club_admin(current_user) and 'club_id' in update_data:
        if update_data['club_id'] != current_user.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot transfer license to another club"
            )

    license = await get_update_use_case.execute(license_id, **update_data)
    return LicenseMapper.to_response_dto(license)


@router.delete("/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_license(
    license_id: str,
    get_delete_use_case = Depends(get_delete_license_use_case),
    get_license_use_case_instance = Depends(get_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete license."""
    # First verify access to the license
    existing_license = await get_license_use_case_instance.execute(license_id)
    if existing_license.club_id:
        check_club_access(current_user, existing_license.club_id)
    elif is_club_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this license"
        )

    await get_delete_use_case.execute(license_id)
    return None
