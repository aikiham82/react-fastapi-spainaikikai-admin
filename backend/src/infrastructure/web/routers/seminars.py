"""Seminar routes."""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, status

from src.infrastructure.web.dto.seminar_dto import (
    SeminarCreate,
    SeminarUpdate,
    SeminarResponse
)
from src.infrastructure.web.mappers_seminar import SeminarMapper
from src.infrastructure.web.dependencies import (
    get_all_seminars_use_case,
    get_seminar_use_case,
    get_upcoming_seminars_use_case,
    get_create_seminar_use_case,
    get_update_seminar_use_case,
    get_cancel_seminar_use_case,
    get_delete_seminar_use_case
)
from src.infrastructure.web.dependencies import get_current_active_user
from src.domain.entities.user import User

router = APIRouter(prefix="/seminars", tags=["seminars"])


@router.get("", response_model=List[SeminarResponse])
async def get_seminars(
    limit: int = 100,
    club_id: Optional[str] = None,
    association_id: Optional[str] = None,
    get_all_use_case = Depends(get_all_seminars_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get all seminars, optionally filtered by club or association."""
    seminars = await get_all_use_case.execute(limit, club_id, association_id)
    return SeminarMapper.to_response_list(seminars)


@router.get("/{seminar_id}", response_model=SeminarResponse)
async def get_seminar(
    seminar_id: str,
    get_seminar_use_case = Depends(get_seminar_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get seminar by ID."""
    seminar = await get_seminar_use_case.execute(seminar_id)
    return SeminarMapper.to_response_dto(seminar)


@router.get("/upcoming", response_model=List[SeminarResponse])
async def get_upcoming_seminars(
    limit: int = 100,
    get_upcoming_use_case = Depends(get_upcoming_seminars_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Get upcoming seminars."""
    seminars = await get_upcoming_use_case.execute(limit)
    return SeminarMapper.to_response_list(seminars)


@router.post("", response_model=SeminarResponse, status_code=status.HTTP_201_CREATED)
async def create_seminar(
    seminar_data: SeminarCreate,
    get_create_use_case = Depends(get_create_seminar_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new seminar."""
    seminar = await get_create_use_case.execute(
        title=seminar_data.title,
        description=seminar_data.description,
        instructor_name=seminar_data.instructor_name,
        venue=seminar_data.venue,
        address=seminar_data.address,
        city=seminar_data.city,
        province=seminar_data.province,
        start_date=seminar_data.start_date,
        end_date=seminar_data.end_date,
        price=seminar_data.price,
        max_participants=seminar_data.max_participants,
        club_id=seminar_data.club_id,
        association_id=seminar_data.association_id
    )
    return SeminarMapper.to_response_dto(seminar)


@router.put("/{seminar_id}", response_model=SeminarResponse)
async def update_seminar(
    seminar_id: str,
    seminar_data: SeminarUpdate,
    get_update_use_case = Depends(get_update_seminar_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Update seminar."""
    seminar = await get_update_use_case.execute(seminar_id, **seminar_data.model_dump(exclude_none=True))
    return SeminarMapper.to_response_dto(seminar)


@router.put("/{seminar_id}/cancel", response_model=SeminarResponse)
async def cancel_seminar(
    seminar_id: str,
    get_cancel_use_case = Depends(get_cancel_seminar_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel seminar."""
    seminar = await get_cancel_use_case.execute(seminar_id)
    return SeminarMapper.to_response_dto(seminar)


@router.delete("/{seminar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seminar(
    seminar_id: str,
    get_delete_use_case = Depends(get_delete_seminar_use_case),
    current_user: User = Depends(get_current_active_user)
):
    """Delete seminar."""
    await get_delete_use_case.execute(seminar_id)
    return None
