"""Member routes."""

from collections import defaultdict
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from src.domain.entities.license import (
    License,
    LicenseStatus,
    current_licences,
    grade_licence_among,
    payable_licence_items,
    title_among,
)
from src.domain.entities.insurance import Insurance, InsuranceStatus, InsuranceType, insurance_season_year
from src.domain.entities.member import ClubRole
from src.domain.entities.member_payment import TITLE_PAYMENT_TYPES, MemberPaymentStatus, MemberPaymentType
from src.domain.exceptions.license import LicenseNotFoundError
from src.domain.exceptions.member import LastClubAdminError, InactiveMemberError
from src.domain.exceptions.user import (
    AccessChangeNotAllowedError,
    EmailAlreadyInUseError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from src.infrastructure.web.dto.member_dto import (
    MemberCreate,
    MemberUpdate,
    MemberStatusChange,
    MemberResponse,
    GrantMemberAccessDTO,
    SetClubRoleDTO,
    ChangeGradeDTO,
    LicenseSummary,
    InsuranceSummary,
    MemberStatusRowResponse,
)
from src.infrastructure.web.dto.password_reset_dto import AdminPasswordResetLinkResponseDTO
from src.infrastructure.web.audit import audit
from src.infrastructure.web.mappers_member import MemberMapper
from src.infrastructure.web.dependencies import (
    get_all_members_use_case,
    get_member_use_case,
    get_search_members_use_case,
    get_create_member_use_case,
    get_update_member_use_case,
    get_delete_member_use_case,
    get_change_member_status_use_case,
    get_auth_context,
    get_grant_member_access_use_case,
    get_revoke_member_access_use_case,
    get_set_member_club_role_use_case,
    get_change_member_grade_use_case,
    get_license_repository,
    get_insurance_repository,
    get_club_repository,
    get_member_repository,
    get_member_payment_repository,
)
from src.infrastructure.web.authorization import (
    AuthContext,
    require_club_access,
    require_club_admin_ctx,
    require_super_admin,
)

router = APIRouter(prefix="/members", tags=["members"])


def _require_access_to_club(ctx: AuthContext, club_id: Optional[str]) -> None:
    """Allow a super admin, or a club admin when the club is their own."""
    require_club_access(ctx, club_id, "No tienes acceso a este miembro")


async def _load_member_in_callers_club(ctx: AuthContext, member_id: str, get_member_use_case_instance):
    require_club_admin_ctx(ctx)
    member = await get_member_use_case_instance.execute(member_id)
    _require_access_to_club(ctx, member.club_id)
    return member


def _build_license_summary(licenses: List[License]) -> Optional[LicenseSummary]:
    """Build a LicenseSummary for one member: grade from the grade licence, title from any current licence."""
    current = current_licences(licenses)
    primary = grade_licence_among(current)
    if not primary:
        return None
    return LicenseSummary(
        grade=primary.grade,
        technical_grade=primary.technical_grade.value,
        instructor_category=title_among(current).value,
        status=primary.status.value,
        expiration_date=primary.expiration_date,
    )


def _build_insurance_summary(insurances: List[Insurance]) -> Optional[InsuranceSummary]:
    """Build an InsuranceSummary from a list of insurances for one member."""
    if not insurances:
        return None

    accident_ins = [i for i in insurances if i.insurance_type.value == "accident"]
    rc_ins = [i for i in insurances if i.insurance_type.value == "civil_liability"]

    def _best_status(items: list) -> Optional[str]:
        if not items:
            return None
        if any(i.effective_status.value == "active" for i in items):
            return "active"
        return items[0].effective_status.value

    return InsuranceSummary(
        has_accident=len(accident_ins) > 0,
        accident_status=_best_status(accident_ins),
        has_rc=len(rc_ins) > 0,
        rc_status=_best_status(rc_ins),
    )


async def _enrich_members_with_summaries(
    responses: List[MemberResponse],
    license_repo,
    insurance_repo,
) -> List[MemberResponse]:
    """Batch-enrich member responses with license and insurance summaries (2 queries total)."""
    if not responses:
        return responses

    member_ids = [r.id for r in responses]

    licenses = await license_repo.find_by_member_ids(member_ids, limit=len(member_ids) * 5)
    insurances = await insurance_repo.find_by_member_ids(member_ids, limit=len(member_ids) * 5)

    licenses_by_member = defaultdict(list)
    for lic in licenses:
        if lic.member_id:
            licenses_by_member[lic.member_id].append(lic)

    insurances_by_member = defaultdict(list)
    for ins in insurances:
        if ins.member_id:
            insurances_by_member[ins.member_id].append(ins)

    for resp in responses:
        resp.license_summary = _build_license_summary(licenses_by_member.get(resp.id, []))
        resp.insurance_summary = _build_insurance_summary(insurances_by_member.get(resp.id, []))

    return responses


async def _enrich_members_with_club_names(
    responses: List[MemberResponse],
    club_repo,
) -> List[MemberResponse]:
    """Batch-enrich member responses with club names (1 query total)."""
    if not responses:
        return responses

    club_ids = list({r.club_id for r in responses if r.club_id})
    if not club_ids:
        return responses

    clubs = await club_repo.find_by_ids(club_ids)
    club_map = {c.id: c.name for c in clubs}

    for resp in responses:
        if resp.club_id:
            resp.club_name = club_map.get(resp.club_id)

    return responses


async def _enrich_members_with_own_email(
    responses: List[MemberResponse],
    member_repo,
) -> List[MemberResponse]:
    """Mark who has an email no other member shares: only they can activate their card (1 query total)."""
    counts = await member_repo.count_by_emails([r.email for r in responses if r.email])
    for resp in responses:
        email = (resp.email or "").strip().lower()
        resp.has_own_email = bool(email) and counts.get(email, 0) == 1
    return responses


@router.get("", response_model=List[MemberResponse])
async def get_members(
    limit: int = 0,
    club_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    status: Optional[str] = Query(None),
    license_status: Optional[LicenseStatus] = Query(None),
    get_all_use_case = Depends(get_all_members_use_case),
    get_search_use_case = Depends(get_search_members_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
    club_repo = Depends(get_club_repository),
    member_repo = Depends(get_member_repository),
):
    """Get all members, optionally filtered by club, search term, status, or licence status."""
    if not ctx.is_super_admin:
        _require_access_to_club(ctx, ctx.club_id)
        club_id = ctx.club_id

    filtering = bool(status or license_status)
    fetch_limit = 0 if filtering else limit
    if search:
        members = await get_search_use_case.execute(search, fetch_limit, club_id=club_id)
    else:
        members = await get_all_use_case.execute(fetch_limit, club_id)

    if status:
        members = [m for m in members if m.status.value == status]

    responses = MemberMapper.to_response_list(members)
    responses = await _enrich_members_with_summaries(responses, license_repo, insurance_repo)
    if license_status:
        responses = [r for r in responses if r.license_summary and r.license_summary.status == license_status.value]
    if filtering and limit > 0:
        responses = responses[:limit]
    responses = await _enrich_members_with_own_email(responses, member_repo)
    return await _enrich_members_with_club_names(responses, club_repo)


@router.get("/status-board", response_model=List[MemberStatusRowResponse])
async def get_member_status_board(
    payment_year: int = Query(..., ge=1900, le=2100),
    get_all_use_case = Depends(get_all_members_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
    club_repo = Depends(get_club_repository),
    member_payment_repo = Depends(get_member_payment_repository),
):
    """Every member of every club with the licence of the year paid, member status and what is in force."""
    require_super_admin(ctx)
    return await member_status_rows(
        payment_year, get_all_use_case, license_repo, insurance_repo, club_repo, member_payment_repo
    )


def _licence_item(licences: List[License], birth_date, identified: bool) -> Optional[str]:
    """The licence a tick on the status board pays: the title or grade the member holds; none without a licence."""
    if not licences:
        return None
    items = payable_licence_items(licences, birth_date, datetime.utcnow(), identified)
    return next(iter(items - {"dan"}), "dan")


TICKABLE_INSURANCE_STATUSES = (InsuranceStatus.ACTIVE, InsuranceStatus.CANCELLED)


def _insurance_within_its_dates(insurances: List[Insurance], insurance_type: InsuranceType, today: datetime):
    """The insurance of that type whose dates cover today, in force first: the one a tick annuls or reactivates."""
    current = [
        i for i in insurances
        if i.insurance_type == insurance_type and i.status in TICKABLE_INSURANCE_STATUSES
        and (not i.end_date or i.end_date >= today) and (not i.start_date or i.start_date <= today)
    ]
    return max(
        current, key=lambda i: (i.status == InsuranceStatus.ACTIVE, i.end_date or datetime.max), default=None
    )


def _insurance_tick_fields(insurances: List[Insurance], today: datetime) -> dict:
    fields = {}
    for prefix, insurance_type in (("accident", InsuranceType.ACCIDENT), ("rc", InsuranceType.CIVIL_LIABILITY)):
        insurance = _insurance_within_its_dates(insurances, insurance_type, today)
        fields[f"{prefix}_insurance_id"] = insurance.id if insurance else None
        fields[f"{prefix}_insurance_annulled"] = bool(insurance and insurance.status == InsuranceStatus.CANCELLED)
    return fields


async def member_status_rows(
    payment_year: int, get_all_use_case, license_repo, insurance_repo, club_repo, member_payment_repo
) -> List[MemberStatusRowResponse]:
    members = await get_all_use_case.execute(0, None)
    today = datetime.utcnow()
    member_ids = [m.id for m in members]
    licences = await license_repo.find_by_member_ids(member_ids, limit=len(member_ids) * 5)
    insurances = await insurance_repo.find_by_member_ids(member_ids)
    clubs = {c.id: c.name for c in await club_repo.find_by_ids(list({m.club_id for m in members if m.club_id}))}
    lines = await member_payment_repo.find_by_member_ids_year(
        member_ids, payment_year, status=MemberPaymentStatus.COMPLETED
    )
    season_year = insurance_season_year(today)
    season_lines = lines if season_year == payment_year else await member_payment_repo.find_by_member_ids_year(
        member_ids, season_year, status=MemberPaymentStatus.COMPLETED
    )
    season_paid_by_member = defaultdict(set)
    for mp in season_lines:
        season_paid_by_member[mp.member_id] |= mp.covered_types
    licences_by_member = defaultdict(list)
    for lic in licences:
        licences_by_member[lic.member_id].append(lic)
    insurances_by_member = defaultdict(list)
    for ins in insurances:
        insurances_by_member[ins.member_id].append(ins)
    licence_lines = sorted(
        (mp for mp in lines if mp.is_license_payment), key=lambda mp: mp.payment_type not in TITLE_PAYMENT_TYPES
    )
    licence_line_by_member = {mp.member_id: mp.id for mp in licence_lines}
    return [
        MemberStatusRowResponse(
            member_id=m.id,
            first_name=m.first_name,
            last_name=m.last_name,
            club_id=m.club_id,
            club_name=clubs.get(m.club_id),
            member_status=m.status.value,
            license_summary=_build_license_summary(licences_by_member[m.id]),
            insurance_summary=_build_insurance_summary(insurances_by_member[m.id]),
            license_paid=m.id in licence_line_by_member,
            license_payment_id=licence_line_by_member.get(m.id),
            licence_item=_licence_item(licences_by_member[m.id], m.birth_date, bool(m.dni)),
            **_insurance_tick_fields(insurances_by_member[m.id], today),
            accident_season_paid=MemberPaymentType.SEGURO_ACCIDENTES in season_paid_by_member[m.id],
            rc_season_paid=MemberPaymentType.SEGURO_RC in season_paid_by_member[m.id],
        )
        for m in members
    ]


@router.get("/search", response_model=List[MemberResponse])
async def search_members(
    name: str = Query(..., max_length=100),
    limit: int = 0,
    get_search_use_case = Depends(get_search_members_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
    club_repo = Depends(get_club_repository),
):
    """Search members by name."""
    if not ctx.is_super_admin:
        _require_access_to_club(ctx, ctx.club_id)
    club_id = None if ctx.is_super_admin else ctx.club_id
    members = await get_search_use_case.execute(name, limit, club_id=club_id)

    responses = MemberMapper.to_response_list(members)
    responses = await _enrich_members_with_summaries(responses, license_repo, insurance_repo)
    return await _enrich_members_with_club_names(responses, club_repo)


@router.get("/club/{club_id}", response_model=List[MemberResponse])
async def get_members_by_club(
    club_id: str,
    limit: int = 0,
    get_all_use_case = Depends(get_all_members_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
    club_repo = Depends(get_club_repository),
):
    """Get members by club ID."""
    _require_access_to_club(ctx, club_id)
    members = await get_all_use_case.execute(limit, club_id)
    responses = MemberMapper.to_response_list(members)
    responses = await _enrich_members_with_summaries(responses, license_repo, insurance_repo)
    return await _enrich_members_with_club_names(responses, club_repo)


@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: str,
    get_member_use_case = Depends(get_member_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
    club_repo = Depends(get_club_repository),
):
    """Get member by ID."""
    require_club_admin_ctx(ctx)
    member = await get_member_use_case.execute(member_id)
    _require_access_to_club(ctx, member.club_id)

    response = MemberMapper.to_response_dto(member)
    enriched = await _enrich_members_with_summaries([response], license_repo, insurance_repo)
    enriched = await _enrich_members_with_club_names(enriched, club_repo)
    return enriched[0]


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_member(
    member_data: MemberCreate,
    get_create_use_case = Depends(get_create_member_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Create a new member."""
    effective_club_id = member_data.club_id

    if not ctx.is_super_admin:
        _require_access_to_club(ctx, ctx.club_id)
        if member_data.club_id and member_data.club_id != ctx.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes crear un miembro en otro club"
            )
        effective_club_id = ctx.club_id

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
        birth_date=member_data.birth_date,
        registration_date=member_data.registration_date,
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
    require_club_admin_ctx(ctx)
    existing_member = await get_member_use_case_instance.execute(member_id)
    _require_access_to_club(ctx, existing_member.club_id)

    update_data = member_data.model_dump(exclude_none=True)
    if not ctx.is_super_admin and 'club_id' in update_data:
        if update_data['club_id'] != ctx.club_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes transferir un miembro a otro club"
            )

    member = await get_update_use_case.execute(member_id, **update_data)
    return MemberMapper.to_response_dto(member)


@router.patch("/{member_id}/status", response_model=MemberResponse)
async def change_member_status(
    member_id: str,
    status_data: MemberStatusChange,
    get_member_use_case_instance = Depends(get_member_use_case),
    change_status_use_case = Depends(get_change_member_status_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
):
    """Change member status (activate/deactivate)."""
    require_club_admin_ctx(ctx)
    existing_member = await get_member_use_case_instance.execute(member_id)
    _require_access_to_club(ctx, existing_member.club_id)

    member = await change_status_use_case.execute(member_id, status_data.status)
    response = MemberMapper.to_response_dto(member)
    enriched = await _enrich_members_with_summaries([response], license_repo, insurance_repo)
    return enriched[0]


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: str,
    get_member_use_case_instance = Depends(get_member_use_case),
    get_delete_use_case = Depends(get_delete_member_use_case),
    ctx: AuthContext = Depends(get_auth_context)
):
    """Delete member."""
    require_club_admin_ctx(ctx)
    existing_member = await get_member_use_case_instance.execute(member_id)
    _require_access_to_club(ctx, existing_member.club_id)

    await get_delete_use_case.execute(member_id)
    return None


@router.post(
    "/{member_id}/account",
    response_model=AdminPasswordResetLinkResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def grant_member_access(
    member_id: str,
    request: GrantMemberAccessDTO,
    get_member_use_case_instance = Depends(get_member_use_case),
    grant_use_case = Depends(get_grant_member_access_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Give a member of the caller's club their own login to the admin web."""
    member = await _load_member_in_callers_club(ctx, member_id, get_member_use_case_instance)

    try:
        link = await grant_use_case.execute(
            member_id=member_id,
            email=request.email,
            make_club_admin=request.club_admin,
            issued_by=ctx.user.id,
        )
    except EmailAlreadyInUseError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese correo ya lo usa otra cuenta")
    except UserAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este socio ya tiene acceso a la web")
    except AccessChangeNotAllowedError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No puedes dar acceso a esta cuenta")
    except InactiveMemberError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Este socio está de baja")

    audit("access.granted", member_id=member_id, club_id=member.club_id, club_admin=request.club_admin, by=ctx.user.id)
    return AdminPasswordResetLinkResponseDTO(url=link.url, email=link.email, expires_at=link.expires_at)


LAST_CLUB_ADMIN = "El club tiene que tener al menos un responsable"


@router.patch("/{member_id}/club-role", response_model=MemberResponse)
async def set_member_club_role(
    member_id: str,
    request: SetClubRoleDTO,
    get_member_use_case_instance = Depends(get_member_use_case),
    set_role_use_case = Depends(get_set_member_club_role_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Make a member of the caller's club a club admin, or take the role away."""
    existing = await _load_member_in_callers_club(ctx, member_id, get_member_use_case_instance)

    try:
        member = await set_role_use_case.execute(
            member_id, ClubRole(request.club_role), changed_by_member_id=ctx.member_id
        )
    except LastClubAdminError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=LAST_CLUB_ADMIN)
    except AccessChangeNotAllowedError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No puedes cambiar el rol de este socio")

    audit("access.role_changed", member_id=member_id, club_id=existing.club_id, club_role=request.club_role, by=ctx.user.id)
    return MemberMapper.to_response_dto(member)


@router.put("/{member_id}/grade", response_model=MemberResponse)
async def change_member_grade(
    member_id: str,
    request: ChangeGradeDTO,
    get_member_use_case_instance = Depends(get_member_use_case),
    change_grade_use_case = Depends(get_change_member_grade_use_case),
    ctx: AuthContext = Depends(get_auth_context),
    license_repo = Depends(get_license_repository),
    insurance_repo = Depends(get_insurance_repository),
):
    """Change the kyu or dan number of a member of the caller's club."""
    member = await _load_member_in_callers_club(ctx, member_id, get_member_use_case_instance)
    changed_by = None if ctx.is_super_admin else ctx.member_id
    try:
        await change_grade_use_case.execute(member.id, request.grade_number, changed_by)
    except AccessChangeNotAllowedError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu grado lo cambia la federación")
    except InactiveMemberError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El grado de un socio de baja no se cambia")
    except LicenseNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Este socio aún no tiene licencia en vigor")

    audit("member.grade_changed", member_id=member_id, club_id=member.club_id, grade_number=request.grade_number, by=ctx.user.id)
    response = MemberMapper.to_response_dto(member)
    enriched = await _enrich_members_with_summaries([response], license_repo, insurance_repo)
    return enriched[0]


@router.delete("/{member_id}/account", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_member_access(
    member_id: str,
    get_member_use_case_instance = Depends(get_member_use_case),
    revoke_use_case = Depends(get_revoke_member_access_use_case),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Switch off the account a member of the caller's club signs in with."""
    member = await _load_member_in_callers_club(ctx, member_id, get_member_use_case_instance)

    try:
        await revoke_use_case.execute(member_id, revoked_by_member_id=ctx.member_id)
    except LastClubAdminError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=LAST_CLUB_ADMIN)
    except AccessChangeNotAllowedError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No puedes quitar este acceso")
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Este socio no tiene acceso a la web")

    audit("access.revoked", member_id=member_id, club_id=member.club_id, by=ctx.user.id)
    return None
