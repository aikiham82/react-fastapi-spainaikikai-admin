"""Seminar routes."""

from typing import List, Optional
from pathlib import Path
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from PIL import Image, ImageOps

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
    get_delete_seminar_use_case,
    get_upload_seminar_cover_image_use_case,
    get_delete_seminar_cover_image_use_case,
    get_initiate_seminar_oficialidad_use_case,
)
from src.infrastructure.web.dependencies import get_auth_context
from src.infrastructure.web.authorization import AuthContext, check_club_access_ctx
from src.domain.entities.seminar import SeminarStatus
from src.infrastructure.web.dto.payment_dto import InitiatePaymentResponse
from src.domain.exceptions.seminar import SeminarAlreadyOfficialError
from src.config.settings import get_app_settings

# Upload directory: backend/uploads/seminars/ relative to this file's location
UPLOAD_DIR = Path(__file__).parent.parent.parent.parent.parent / "uploads" / "seminars"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG": "png",
}


def validate_image_magic_bytes(content: bytes) -> None:
    """Validate image format using magic bytes (not file extension)."""
    for signature in MAGIC_BYTES:
        if content[:len(signature)] == signature:
            return
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Formato no permitido. Usa JPEG, PNG o WebP."
    )


def process_image(content: bytes) -> bytes:
    """Resize and convert image to 800x450 JPEG."""
    image = Image.open(BytesIO(content))
    if image.mode not in ("RGB",):
        image = image.convert("RGB")
    image = ImageOps.fit(image, (800, 450), Image.LANCZOS)
    output = BytesIO()
    image.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


router = APIRouter(prefix="/seminars", tags=["seminars"])


@router.get("", response_model=List[SeminarResponse])
async def get_seminars(
    limit: int = 100,
    club_id: Optional[str] = None,
    association_id: Optional[str] = None,
    get_all_use_case = Depends(get_all_seminars_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get all seminars, optionally filtered by club or association."""
    if not ctx.is_super_admin:
        effective_club_id = ctx.club_id
        if not effective_club_id:
            return []
        seminars = await get_all_use_case.execute(limit, effective_club_id)
    else:
        seminars = await get_all_use_case.execute(limit, club_id, association_id)
    return SeminarMapper.to_response_list(seminars)


@router.get("/upcoming", response_model=List[SeminarResponse])
async def get_upcoming_seminars(
    limit: int = 100,
    get_upcoming_use_case = Depends(get_upcoming_seminars_use_case),
    get_all_use_case = Depends(get_all_seminars_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get upcoming seminars."""
    if not ctx.is_super_admin:
        effective_club_id = ctx.club_id
        if not effective_club_id:
            return []
        seminars = await get_all_use_case.execute(limit, effective_club_id)
        seminars = [s for s in seminars if s.status == SeminarStatus.UPCOMING]
    else:
        seminars = await get_upcoming_use_case.execute(limit)
    return SeminarMapper.to_response_list(seminars)


@router.get("/{seminar_id}", response_model=SeminarResponse)
async def get_seminar(
    seminar_id: str,
    get_seminar_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Get seminar by ID."""
    seminar = await get_seminar_use_case.execute(seminar_id)
    if not ctx.is_super_admin:
        check_club_access_ctx(ctx, seminar.club_id or "")
    return SeminarMapper.to_response_dto(seminar)


@router.post("", response_model=SeminarResponse, status_code=status.HTTP_201_CREATED)
async def create_seminar(
    seminar_data: SeminarCreate,
    get_create_use_case = Depends(get_create_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new seminar."""
    effective_club_id = seminar_data.club_id
    if not ctx.is_super_admin:
        effective_club_id = ctx.club_id

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
        club_id=effective_club_id,
        association_id=seminar_data.association_id
    )
    return SeminarMapper.to_response_dto(seminar)


@router.put("/{seminar_id}", response_model=SeminarResponse)
async def update_seminar(
    seminar_id: str,
    seminar_data: SeminarUpdate,
    get_update_use_case = Depends(get_update_seminar_use_case),
    get_one_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Update seminar."""
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")
        update_data = seminar_data.model_dump(exclude_none=True)
        update_data.pop("club_id", None)
    else:
        update_data = seminar_data.model_dump(exclude_none=True)
    seminar = await get_update_use_case.execute(seminar_id, **update_data)
    return SeminarMapper.to_response_dto(seminar)


@router.put("/{seminar_id}/cancel", response_model=SeminarResponse)
async def cancel_seminar(
    seminar_id: str,
    get_cancel_use_case = Depends(get_cancel_seminar_use_case),
    get_one_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Cancel seminar."""
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")
    seminar = await get_cancel_use_case.execute(seminar_id)
    return SeminarMapper.to_response_dto(seminar)


@router.delete("/{seminar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seminar(
    seminar_id: str,
    get_delete_use_case = Depends(get_delete_seminar_use_case),
    get_one_use_case = Depends(get_seminar_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete seminar."""
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")
    await get_delete_use_case.execute(seminar_id)
    return None


@router.post("/{seminar_id}/cover-image", response_model=SeminarResponse)
async def upload_cover_image(
    seminar_id: str,
    file: UploadFile = File(...),
    get_one_use_case = Depends(get_seminar_use_case),
    upload_use_case = Depends(get_upload_seminar_cover_image_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Upload cover image for a seminar."""
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 5MB."
        )
    validate_image_magic_bytes(content)

    jpeg_content = process_image(content)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    tmp_path = UPLOAD_DIR / f"{seminar_id}.tmp"
    output_path = UPLOAD_DIR / f"{seminar_id}.jpg"
    tmp_path.write_bytes(jpeg_content)
    tmp_path.rename(output_path)

    image_url = f"/uploads/seminars/{seminar_id}.jpg"
    seminar = await upload_use_case.execute(seminar_id, image_url)
    return SeminarMapper.to_response_dto(seminar)


@router.delete("/{seminar_id}/cover-image", response_model=SeminarResponse)
async def delete_cover_image(
    seminar_id: str,
    get_one_use_case = Depends(get_seminar_use_case),
    delete_cover_use_case = Depends(get_delete_seminar_cover_image_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Remove cover image from a seminar."""
    if not ctx.is_super_admin:
        existing = await get_one_use_case.execute(seminar_id)
        check_club_access_ctx(ctx, existing.club_id or "")

    file_path = UPLOAD_DIR / f"{seminar_id}.jpg"
    if file_path.exists():
        file_path.unlink()

    seminar = await delete_cover_use_case.execute(seminar_id)
    return SeminarMapper.to_response_dto(seminar)


@router.post("/{seminar_id}/oficialidad/initiate", response_model=InitiatePaymentResponse)
async def initiate_seminar_oficialidad(
    seminar_id: str,
    get_one_use_case = Depends(get_seminar_use_case),
    initiate_use_case = Depends(get_initiate_seminar_oficialidad_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Initiate oficialidad payment for a seminar via Redsys.

    Returns Redsys form data for the frontend to submit.
    Returns 409 if the seminar is already official.
    """
    # Auth: club admin can only initiate for their own club's seminars
    existing = await get_one_use_case.execute(seminar_id)
    if not ctx.is_super_admin:
        check_club_access_ctx(ctx, existing.club_id or "")

    app_settings = get_app_settings()
    frontend_url = app_settings.frontend_base_url
    backend_url = app_settings.backend_base_url

    try:
        result = await initiate_use_case.execute(
            seminar_id=seminar_id,
            club_id=existing.club_id or "",
            success_url=f"{frontend_url}/seminars?oficialidad=ok&seminar_id={seminar_id}",
            failure_url=f"{frontend_url}/seminars?oficialidad=cancelled&seminar_id={seminar_id}",
            webhook_url=f"{backend_url}/api/v1/payments/webhook",
        )
    except SeminarAlreadyOfficialError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este seminario ya es oficial",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return InitiatePaymentResponse(
        payment_id=result.payment_id,
        order_id=result.order_id,
        payment_url=result.form_data.payment_url,
        ds_signature_version=result.form_data.ds_signature_version,
        ds_merchant_parameters=result.form_data.ds_merchant_parameters,
        ds_signature=result.form_data.ds_signature,
    )
