"""License routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime

from src.infrastructure.web.dto.license_dto import (
    LicenseCreate,
    LicenseUpdate,
    LicenseRenewRequest,
    LicenseResponse
)
from src.infrastructure.web.mappers_license import LicenseMapper
from src.infrastructure.web.dependencies import (
    get_all_licenses_use_case,
    get_license_use_case,
    get_expiring_licenses_use_case,
    get_create_license_use_case,
    get_renew_license_use_case,
    get_update_license_use_case,
    get_delete_license_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User

router = APIRouter(prefix="/licenses", tags=["licenses"])


@router.get("", response_model=List[LicenseResponse])
async def get_licenses(
    limit: int = 100,
    club_id: Optional[str] = None,
    member_id: Optional[str] = None,
    get_all_use_case = Depends(get_all_licenses_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all licenses, optionally filtered by club or member."""
    licenses = await get_all_use_case.execute(limit, club_id, member_id)
    return LicenseMapper.to_response_list(licenses)


@router.get("/{license_id}", response_model=LicenseResponse)
async def get_license(
    license_id: str,
    get_license_use_case = Depends(get_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get license by ID."""
    license = await get_license_use_case.execute(license_id)
    return LicenseMapper.to_response_dto(license)


@router.get("/member/{member_id}", response_model=List[LicenseResponse])
async def get_licenses_by_member(
    member_id: str,
    limit: int = 100,
    get_all_use_case = Depends(get_all_licenses_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get licenses by member ID."""
    licenses = await get_all_use_case.execute(limit, member_id=member_id)
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
    return LicenseMapper.to_response_list(licenses)


@router.post("", response_model=LicenseResponse, status_code=status.HTTP_201_CREATED)
async def create_license(
    license_data: LicenseCreate,
    get_create_use_case = Depends(get_create_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new license."""
    license = await get_create_use_case.execute(
        license_number=license_data.license_number,
        member_id=license_data.member_id,
        club_id=license_data.club_id,
        association_id=license_data.association_id,
        license_type=license_data.license_type,
        grade=license_data.grade,
        issue_date=license_data.issue_date,
        expiration_date=license_data.expiration_date
    )
    return LicenseMapper.to_response_dto(license)


@router.put("/{license_id}/renew", response_model=LicenseResponse)
async def renew_license(
    license_id: str,
    renew_data: LicenseRenewRequest,
    get_renew_use_case = Depends(get_renew_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Renew license."""
    expiration_date = datetime.fromisoformat(renew_data.expiration_date) if isinstance(renew_data.expiration_date, str) else renew_data.expiration_date
    license = await get_renew_use_case.execute(license_id, expiration_date)
    return LicenseMapper.to_response_dto(license)


@router.put("/{license_id}", response_model=LicenseResponse)
async def update_license(
    license_id: str,
    license_data: LicenseUpdate,
    get_update_use_case = Depends(get_update_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Update license."""
    license = await get_update_use_case.execute(license_id, **license_data.model_dump(exclude_none=True))
    return LicenseMapper.to_response_dto(license)


@router.delete("/{license_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_license(
    license_id: str,
    get_delete_use_case = Depends(get_delete_license_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete license."""
    await get_delete_use_case.execute(license_id)
    return None
