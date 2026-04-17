"""Build an upsert action plan from Excel + prod snapshots (no I/O)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from .constants import DEFAULT_SEGURO_RC_AMOUNT, LICENSE_YEAR
from .excel_loader import (
    ExcelFeeRow,
    ExcelInsuranceRow,
    ExcelMemberRow,
)
from .matcher import Matcher
from .normalizers import fuzzy_norm


@dataclass
class ActionPlan:
    member_updates: list[dict[str, Any]] = field(default_factory=list)
    member_inserts: list[dict[str, Any]] = field(default_factory=list)
    license_upserts: list[dict[str, Any]] = field(default_factory=list)
    insurance_upserts: list[dict[str, Any]] = field(default_factory=list)
    payment_upserts: list[dict[str, Any]] = field(default_factory=list)
    club_inserts: list[dict[str, Any]] = field(default_factory=list)
    skipped: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[dict[str, Any]] = field(default_factory=list)


def _grade_label(nivel: int | None, grade_type: str) -> str:
    suffix = {"dan": "Dan", "kyu": "Kyu", "kyu_infantil": "Kyu"}.get(
        (grade_type or "").lower(), "Kyu"
    )
    # Default to lowest kyu rank when level is unknown (domain requires non-empty grade).
    level = nivel if nivel is not None else 6
    return f"{level}º {suffix}"


def _age_category(birth: date | None) -> str:
    if birth is None:
        return "adulto"
    today = date.today()
    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    return "infantil" if age < 14 else "adulto"


def _payment_type_for_license(grade_type: str) -> str:
    gt = (grade_type or "").lower()
    if gt == "dan":
        return "licencia_dan"
    if gt == "kyu_infantil":
        return "licencia_kyu_infantil"
    return "licencia_kyu"


def _norm_for_write(dni_raw: str) -> str:
    from .normalizers import norm_dni
    return norm_dni(dni_raw)


def _prod_birth(prod: dict[str, Any]) -> date | None:
    raw = prod.get("birth_date")
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    return None


def _build_member_update_fields(
    excel: ExcelMemberRow, prod: dict[str, Any]
) -> dict[str, Any]:
    """Only include non-empty Excel values that differ from prod.

    Exception: `dni` is always included when Excel has one, because it is
    the primary identity field and we want writers to normalize/canonicalize
    it even when superficially equal to the prod value.
    """
    fields: dict[str, Any] = {}
    mapping = [
        ("first_name", excel.first_name),
        ("last_name", f"{excel.last1} {excel.last2}".strip()),
        ("email", excel.email),
        ("phone", excel.phone),
        ("address", excel.address),
        ("city", excel.city),
        ("province", excel.province),
        ("postal_code", excel.postal_code),
        ("country", excel.country),
    ]
    for key, val in mapping:
        if val and val != prod.get(key):
            fields[key] = val

    dni_norm = _norm_for_write(excel.dni_raw)
    if dni_norm:
        fields["dni"] = dni_norm

    if excel.birth_date and excel.birth_date != _prod_birth(prod):
        fields["birth_date"] = datetime.combine(
            excel.birth_date, datetime.min.time()
        ).replace(tzinfo=timezone.utc)

    if excel.club_id and excel.club_id != prod.get("club_id"):
        fields["club_id"] = excel.club_id

    if excel.num_socio and excel.num_socio != prod.get("member_number"):
        fields["member_number"] = excel.num_socio

    return fields


def _normalize_instructor(raw: str) -> str:
    r = (raw or "").strip().lower()
    # Domain enum only supports: none, fukushidoin, shidoin.
    # "shihan" collapses to "shidoin" (closest supported rank).
    if "fukushidoin" in r or "fuku" in r:
        return "fukushidoin"
    if "shidoin" in r or "shihan" in r:
        return "shidoin"
    return "none"


class Planner:
    def __init__(
        self,
        excel_members: list[ExcelMemberRow],
        excel_fees: dict[str, ExcelFeeRow],
        excel_insurances: list[ExcelInsuranceRow],
        prod_members: list[dict[str, Any]],
        prod_licenses: dict[str, dict[str, Any]],
        prod_insurances: dict[tuple[str, str], dict[str, Any]],
        prod_payments: dict[tuple[str, int, str], dict[str, Any]],
        prod_clubs: list[dict[str, Any]] | None = None,
    ) -> None:
        self.excel_members = excel_members
        self.excel_fees = excel_fees
        self.excel_insurances = excel_insurances
        self.prod_members = {str(m["_id"]): m for m in prod_members}
        self.prod_licenses = prod_licenses
        self.prod_insurances = prod_insurances
        self.prod_payments = prod_payments
        self._matcher = Matcher(prod_members)

        self._club_by_fuzzy_name: dict[str, str] = {}
        for c in (prod_clubs or []):
            name = c.get("name", "")
            fuzzy = fuzzy_norm(name)
            if fuzzy:
                self._club_by_fuzzy_name[fuzzy] = str(c["_id"])
        self._new_club_names: dict[str, str] = {}

    def _resolve_club_id(
        self, club_name: str, club_id: str
    ) -> tuple[str, bool]:
        """Resolve club identity. Returns (club_id_or_ref, is_new)."""
        if club_id:
            return club_id, False
        if not club_name:
            return "", False
        fuzzy = fuzzy_norm(club_name)
        if fuzzy in self._club_by_fuzzy_name:
            return self._club_by_fuzzy_name[fuzzy], False
        # Track new club by fuzzy name (first original casing wins)
        if fuzzy not in self._new_club_names:
            self._new_club_names[fuzzy] = club_name
        return f"__new_club__:{fuzzy}", True

    def build(self) -> ActionPlan:
        plan = ActionPlan()

        # First pass: resolve club_id for every member, tracking new clubs.
        for ex in self.excel_members:
            resolved, _is_new = self._resolve_club_id(ex.club_name, ex.club_id)
            ex.club_id = resolved

        # Emit one club_insert per unique new club name.
        for fuzzy, original_name in self._new_club_names.items():
            slug = fuzzy.lower().replace(" ", "-")
            plan.club_inserts.append({
                "__ref": f"__new_club__:{fuzzy}",
                "name": original_name.title(),
                "email": f"placeholder+{slug}@spainaikikai.org",
                "phone": "",
                "website": None,
                "address": "",
                "city": "",
                "province": "",
                "postal_code": "",
                "country": "Spain",
                "is_active": True,
            })

        for ex in self.excel_members:
            result = self._matcher.match(ex)
            if result.method == "skip":
                plan.skipped.append({
                    "num_socio": ex.num_socio,
                    "name": f"{ex.first_name} {ex.last1} {ex.last2}".strip(),
                    "reason": result.reason,
                })
                continue

            if result.method == "new":
                member_doc = self._build_insert_doc(ex)
                plan.member_inserts.append(member_doc)
                self._append_dependent_actions(
                    plan, ex, member_id_ref=f"__new__:{ex.num_socio}"
                )
                continue

            prod = self.prod_members[result.prod_id]
            fields = _build_member_update_fields(ex, prod)
            plan.member_updates.append({
                "prod_id": result.prod_id,
                "method": result.method,
                "fields": fields,
            })
            self._append_dependent_actions(plan, ex, member_id_ref=result.prod_id)

        return plan

    def _build_insert_doc(self, ex: ExcelMemberRow) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        birth = None
        if ex.birth_date:
            birth = datetime.combine(ex.birth_date, datetime.min.time()).replace(
                tzinfo=timezone.utc
            )
        return {
            "first_name": ex.first_name,
            "last_name": f"{ex.last1} {ex.last2}".strip(),
            "dni": _norm_for_write(ex.dni_raw),
            "email": ex.email,
            "phone": ex.phone,
            "address": ex.address,
            "city": ex.city,
            "province": ex.province,
            "postal_code": ex.postal_code,
            "country": ex.country or "Spain",
            "birth_date": birth,
            "club_id": ex.club_id,
            "status": "active",
            "club_role": "member",
            "member_number": ex.num_socio,
            "registration_date": None,
            "created_at": now,
            "updated_at": now,
            "__excel_num_socio": ex.num_socio,
        }

    def _append_dependent_actions(
        self, plan: ActionPlan, ex: ExcelMemberRow, member_id_ref: str
    ) -> None:
        fee = self.excel_fees.get(ex.num_socio)
        if fee is None:
            plan.warnings.append({
                "type": "missing_fee_row",
                "num_socio": ex.num_socio,
            })
            return

        grade_label = _grade_label(fee.grade_level, fee.grade_type)
        license_type = fee.grade_type.lower() if fee.grade_type else "kyu"
        if license_type not in {"dan", "kyu"}:
            license_type = "kyu"

        plan.license_upserts.append({
            "member_id": member_id_ref,
            "license_type": license_type,
            "grade": grade_label,
            "technical_grade": license_type,
            "instructor_category": _normalize_instructor(fee.instructor),
            "age_category": _age_category(ex.birth_date),
            "status": "active",
            "issue_date": datetime(LICENSE_YEAR, 1, 1, tzinfo=timezone.utc),
            "expiration_date": datetime(LICENSE_YEAR, 12, 31, 23, 59, 59, tzinfo=timezone.utc),
        })

        payment_license_type = _payment_type_for_license(fee.grade_type)
        if fee.cuota_anual > 0:
            plan.payment_upserts.append({
                "member_id": member_id_ref,
                "payment_year": LICENSE_YEAR,
                "payment_type": payment_license_type,
                "concept": f"{payment_license_type} - {LICENSE_YEAR}",
                "amount": fee.cuota_anual,
                "status": "completed",
            })
        if fee.seguro_accidentes > 0:
            plan.payment_upserts.append({
                "member_id": member_id_ref,
                "payment_year": LICENSE_YEAR,
                "payment_type": "seguro_accidentes",
                "concept": f"seguro_accidentes - {LICENSE_YEAR}",
                "amount": fee.seguro_accidentes,
                "status": "completed",
            })
            plan.insurance_upserts.append({
                "member_id": member_id_ref,
                "insurance_type": "accident",
                "start_date": datetime(LICENSE_YEAR, 1, 1, tzinfo=timezone.utc),
                "end_date": datetime(LICENSE_YEAR, 12, 31, 23, 59, 59, tzinfo=timezone.utc),
                "status": "active",
                "insurance_company": "Spain Aikikai",
                "policy_number": "PENDIENTE",
                "coverage_amount": fee.seguro_accidentes,
            })
        if fee.seguro_rc_flag:
            plan.payment_upserts.append({
                "member_id": member_id_ref,
                "payment_year": LICENSE_YEAR,
                "payment_type": "seguro_rc",
                "concept": f"seguro_rc - {LICENSE_YEAR}",
                "amount": DEFAULT_SEGURO_RC_AMOUNT,
                "status": "completed",
            })
            plan.insurance_upserts.append({
                "member_id": member_id_ref,
                "insurance_type": "civil_liability",
                "start_date": datetime(LICENSE_YEAR, 1, 1, tzinfo=timezone.utc),
                "end_date": datetime(LICENSE_YEAR, 12, 31, 23, 59, 59, tzinfo=timezone.utc),
                "status": "active",
                "insurance_company": "Spain Aikikai",
                "policy_number": "PENDIENTE",
                "coverage_amount": DEFAULT_SEGURO_RC_AMOUNT,
            })
