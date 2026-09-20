# Excel → Production Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync authoritative ASA 2025-2026 member/license/insurance/fees data from Excel into MongoDB production via a dry-run-first script that upserts safely without corrupting existing records.

**Architecture:** Single standalone Python script (`backend/scripts/sync_excel_to_prod.py`) using Motor async driver. Two-phase: matching (DNI → fuzzy name+club → insert-new) builds an in-memory action plan, then either writes a JSON dry-run report or executes upserts against `members`, `licenses`, `insurances`, `member_payments` collections.

**Tech Stack:** Python 3.11, Motor (async MongoDB), openpyxl, pydantic, python-dotenv, pytest for unit tests of pure helpers.

---

## Design Reference

Read the design spec at `docs/plans/2026-04-17-excel-prod-sync-design.md` before starting implementation. It contains the matching analysis results (527 Excel rows: 276 DNI-matched, 111 name-matched, 140 unmatched) and the data issues catalog (TAIO remap, birth-date corruption, accent loss).

## File Structure

- **Create**: `backend/scripts/sync_excel_to_prod.py` — orchestrator CLI (main entry)
- **Create**: `backend/scripts/sync/__init__.py` — package marker
- **Create**: `backend/scripts/sync/normalizers.py` — pure functions: `norm_dni`, `norm_name`, `fuzzy_norm`
- **Create**: `backend/scripts/sync/excel_loader.py` — openpyxl parsing for the 3 needed sheets
- **Create**: `backend/scripts/sync/matcher.py` — matching logic (DNI → fuzzy name+club → new)
- **Create**: `backend/scripts/sync/planner.py` — builds action plan from Excel + prod data
- **Create**: `backend/scripts/sync/writer.py` — executes upserts against MongoDB
- **Create**: `backend/scripts/sync/reporter.py` — generates JSON + stdout reports
- **Create**: `backend/scripts/sync/constants.py` — known mappings (TAIO remap, price config defaults)
- **Create**: `backend/tests/scripts/__init__.py`
- **Create**: `backend/tests/scripts/test_normalizers.py`
- **Create**: `backend/tests/scripts/test_matcher.py`
- **Create**: `backend/tests/scripts/test_planner.py`

No modifications to existing production code. No modifications to domain/application/web layers.

## Required Environment

The script reads `MONGODB_URL` and `DATABASE_NAME` from `backend/.env`. For production, the operator exports a `.env.production` with the prod Mongo URL before running; the script accepts `--env-file PATH` to load that file.

---

## Task 1: Normalizers (pure functions, TDD)

**Files:**
- Create: `backend/scripts/__init__.py` (empty)
- Create: `backend/scripts/sync/__init__.py` (empty)
- Create: `backend/scripts/sync/normalizers.py`
- Test: `backend/tests/scripts/test_normalizers.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/scripts/test_normalizers.py
import pytest
from scripts.sync.normalizers import norm_dni, norm_name, fuzzy_norm


class TestNormDni:
    def test_strips_dots_dashes_spaces(self):
        assert norm_dni("24.178.035 K") == "24178035K"
        assert norm_dni("48568424-Z") == "48568424Z"

    def test_uppercase(self):
        assert norm_dni("52270935p") == "52270935P"

    def test_empty_and_none(self):
        assert norm_dni("") == ""
        assert norm_dni(None) == ""

    def test_zero_is_empty(self):
        assert norm_dni("0") == ""

    def test_handles_nie(self):
        assert norm_dni("X8740471B") == "X8740471B"


class TestNormName:
    def test_strips_accents(self):
        assert norm_name("Martínez") == "MARTINEZ"
        assert norm_name("Compañy") == "COMPANY"

    def test_uppercase(self):
        assert norm_name("josé") == "JOSE"

    def test_empty(self):
        assert norm_name("") == ""
        assert norm_name(None) == ""


class TestFuzzyNorm:
    def test_removes_non_alpha(self):
        assert fuzzy_norm("O'Donnel") == "ODONNEL"
        assert fuzzy_norm("Martín-Sánchez") == "MARTINSANCHEZ"

    def test_strips_corrupted_accents(self):
        # Prod has "Martnez" (missing í) vs Excel "MARTÍNEZ"
        assert fuzzy_norm("Martnez") == "MARTNEZ"
        assert fuzzy_norm("MARTÍNEZ") == "MARTINEZ"

    def test_collapses_whitespace(self):
        assert fuzzy_norm("  Juan   Carlos  ") == "JUAN CARLOS"
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd backend && poetry run pytest tests/scripts/test_normalizers.py -v
```
Expected: `ModuleNotFoundError: No module named 'scripts.sync.normalizers'`

- [ ] **Step 3: Implement normalizers**

```python
# backend/scripts/sync/normalizers.py
"""Pure string normalization helpers for matching Excel rows to prod documents."""

import re
import unicodedata


def norm_dni(raw: str | None) -> str:
    """Normalize DNI/NIE: strip punctuation+spaces, uppercase, treat '0' as empty."""
    if not raw:
        return ""
    cleaned = re.sub(r"[\.\-\s]", "", str(raw)).upper().strip()
    if cleaned == "0":
        return ""
    return cleaned


def norm_name(raw: str | None) -> str:
    """Strip accents (NFKD) and uppercase."""
    if not raw:
        return ""
    decomposed = unicodedata.normalize("NFKD", str(raw))
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    return ascii_only.upper().strip()


def fuzzy_norm(raw: str | None) -> str:
    """Aggressive normalization: strip accents, non-alpha, collapse whitespace."""
    if not raw:
        return ""
    decomposed = unicodedata.normalize("NFKD", str(raw))
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    alpha_only = re.sub(r"[^A-Za-z\s]", "", ascii_only)
    collapsed = re.sub(r"\s+", " ", alpha_only).strip()
    return collapsed.upper()
```

- [ ] **Step 4: Create empty `__init__.py` files**

```bash
touch backend/scripts/__init__.py backend/scripts/sync/__init__.py backend/tests/scripts/__init__.py
```

- [ ] **Step 5: Run tests, verify they pass**

```bash
cd backend && poetry run pytest tests/scripts/test_normalizers.py -v
```
Expected: 11 passed

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/__init__.py backend/scripts/sync/__init__.py backend/scripts/sync/normalizers.py backend/tests/scripts/__init__.py backend/tests/scripts/test_normalizers.py
git commit -m "feat: add normalizers for Excel-prod DNI/name matching"
```

---

## Task 2: Constants and mapping tables

**Files:**
- Create: `backend/scripts/sync/constants.py`

- [ ] **Step 1: Write constants file**

```python
# backend/scripts/sync/constants.py
"""Known mappings and defaults for the Excel-to-prod sync."""

# Excel has ~9 TAIO rows with wrong club_id (6c6b = Roseraie España).
# Correct TAIO club_id is 6c86.
TAIO_REMAP = {
    ("TAIO", "6985f6004dca105b754e6c6b"): "6985f6004dca105b754e6c86",
}

# Excel sheet names we actually consume.
SHEET_MEMBERS = "MIEMBROS APP CON NOMBRE CLUB"
SHEET_FEES = "2026 SIN SUMA CUOTAS"
SHEET_INSURANCES = "Seguro de accidentes APP"

# Target MongoDB collections.
COLL_MEMBERS = "members"
COLL_LICENSES = "licenses"
COLL_INSURANCES = "insurances"
COLL_PAYMENTS = "member_payments"

# Defaults for fees when Excel Seguro RC == "RC" (price taken from price_configurations
# in prod if available; this is the fallback).
DEFAULT_SEGURO_RC_AMOUNT = 10

# License expiration for season 2026.
LICENSE_YEAR = 2026
SEASON_START_ISO = "2026-01-01T00:00:00Z"
SEASON_END_ISO = "2026-12-31T23:59:59Z"
```

- [ ] **Step 2: Commit**

```bash
git add backend/scripts/sync/constants.py
git commit -m "feat: add sync constants and TAIO remap"
```

---

## Task 3: Excel loader

**Files:**
- Create: `backend/scripts/sync/excel_loader.py`

- [ ] **Step 1: Implement loader**

```python
# backend/scripts/sync/excel_loader.py
"""Load and normalize Excel rows for sync."""

from __future__ import annotations

import datetime
from dataclasses import dataclass
from pathlib import Path

from openpyxl import load_workbook

from .constants import SHEET_FEES, SHEET_INSURANCES, SHEET_MEMBERS, TAIO_REMAP
from .normalizers import norm_dni


@dataclass
class ExcelMemberRow:
    num_socio: str
    first_name: str
    last1: str
    last2: str
    dni_raw: str
    email: str
    phone: str
    birth_date: datetime.date | None
    address: str
    city: str
    province: str
    postal_code: str
    country: str
    club_id: str
    club_name: str


@dataclass
class ExcelFeeRow:
    num_socio: str
    grade_level: int | None  # "Nivel" column
    grade_type: str  # "dan" | "kyu" | "kyu_infantil" | ""
    instructor: str
    cuota_anual: float
    seguro_accidentes: float
    seguro_rc_flag: bool
    send_date: datetime.datetime | None


@dataclass
class ExcelInsuranceRow:
    num_socio_hint: str
    first_name: str
    last1: str
    last2: str
    dni_raw: str
    club_name: str
    tipo_seguro: str  # e.g., "seguro_accidentes - 2026"
    start_date: datetime.datetime | None
    end_date: datetime.datetime | None


def _s(v) -> str:
    if v is None:
        return ""
    return str(v).strip()


def _to_date(v) -> datetime.date | None:
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, datetime.date):
        return v
    return None


def _apply_taio_remap(club_name: str, club_id: str) -> str:
    return TAIO_REMAP.get((club_name.upper(), club_id), club_id)


def load_members(path: Path) -> list[ExcelMemberRow]:
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb[SHEET_MEMBERS]
    rows: list[ExcelMemberRow] = []
    for row in ws.iter_rows(min_row=3, values_only=True):
        if row[0] is None:
            continue
        club_name = _s(row[16])
        club_id = _s(row[13])
        club_id = _apply_taio_remap(club_name, club_id)
        rows.append(
            ExcelMemberRow(
                num_socio=_s(row[0]),
                first_name=_s(row[1]),
                last1=_s(row[2]),
                last2=_s(row[3]),
                dni_raw=_s(row[4]),
                email=_s(row[5]),
                phone=_s(row[6]),
                birth_date=_to_date(row[7]),
                address=_s(row[8]),
                city=_s(row[9]),
                province=_s(row[10]),
                postal_code=_s(row[11]),
                country=_s(row[12]) or "Spain",
                club_id=club_id,
                club_name=club_name,
            )
        )
    return rows


def load_fees(path: Path) -> dict[str, ExcelFeeRow]:
    """Returns {num_socio: ExcelFeeRow}."""
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb[SHEET_FEES]
    rows: dict[str, ExcelFeeRow] = {}
    for row in ws.iter_rows(min_row=3, values_only=True):
        if row[0] is None:
            continue
        num = _s(row[0])
        nivel = row[4] if isinstance(row[4], (int, float)) else None
        grade_type = _s(row[5]).lower()
        cuota = float(row[7]) if isinstance(row[7], (int, float)) else 0.0
        seg_acc = float(row[8]) if isinstance(row[8], (int, float)) else 0.0
        rc_flag = _s(row[9]).upper() == "RC"
        send_date = row[20] if isinstance(row[20], datetime.datetime) else None
        rows[num] = ExcelFeeRow(
            num_socio=num,
            grade_level=int(nivel) if nivel is not None else None,
            grade_type=grade_type,
            instructor=_s(row[6]),
            cuota_anual=cuota,
            seguro_accidentes=seg_acc,
            seguro_rc_flag=rc_flag,
            send_date=send_date,
        )
    return rows


def load_insurances(path: Path) -> list[ExcelInsuranceRow]:
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb[SHEET_INSURANCES]
    rows: list[ExcelInsuranceRow] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[1] is None and row[4] is None:
            continue
        rows.append(
            ExcelInsuranceRow(
                num_socio_hint=_s(row[0]),
                first_name=_s(row[1]),
                last1=_s(row[2]),
                last2=_s(row[3]),
                dni_raw=_s(row[4]),
                club_name=_s(row[5]),
                tipo_seguro=_s(row[6]),
                start_date=row[10] if isinstance(row[10], datetime.datetime) else None,
                end_date=row[11] if isinstance(row[11], datetime.datetime) else None,
            )
        )
    return rows


def member_has_matchable_identity(r: ExcelMemberRow) -> bool:
    """Returns True if we have anything to match on (DNI or club+name)."""
    return bool(norm_dni(r.dni_raw)) or (bool(r.club_id) and bool(r.first_name))
```

- [ ] **Step 2: Quick smoke-test with real Excel**

```bash
cd backend && poetry run python -c "
from pathlib import Path
from scripts.sync.excel_loader import load_members, load_fees, load_insurances
p = Path('/home/abraham/Descargas/Adaptación envio datos ASA 2025-2026 a subidas a APP.xlsx')
m = load_members(p); print(f'members: {len(m)}')
f = load_fees(p); print(f'fees: {len(f)}')
i = load_insurances(p); print(f'insurances: {len(i)}')
print('sample member:', m[0])
"
```
Expected: `members: 527`, `fees: ~523`, `insurances: ~370`.

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/sync/excel_loader.py
git commit -m "feat: load Excel sheets for member/fee/insurance sync"
```

---

## Task 4: Matcher (TDD)

**Files:**
- Create: `backend/scripts/sync/matcher.py`
- Test: `backend/tests/scripts/test_matcher.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/scripts/test_matcher.py
from scripts.sync.matcher import MatchResult, Matcher


def make_excel(num="1", first="Juan", last1="Garcia", last2="Lopez",
               dni="12345678A", club_id="club_a"):
    from scripts.sync.excel_loader import ExcelMemberRow
    return ExcelMemberRow(
        num_socio=num, first_name=first, last1=last1, last2=last2,
        dni_raw=dni, email="", phone="", birth_date=None,
        address="", city="", province="", postal_code="", country="Spain",
        club_id=club_id, club_name="Club A",
    )


def make_prod(_id="p1", first="Juan", last="Garcia Lopez",
              dni="12345678A", club_id="club_a"):
    return {"_id": _id, "first_name": first, "last_name": last,
            "dni": dni, "club_id": club_id}


def test_match_by_dni():
    m = Matcher([make_prod()])
    result = m.match(make_excel())
    assert result.method == "dni"
    assert result.prod_id == "p1"


def test_match_by_dni_with_punctuation():
    m = Matcher([make_prod(dni="12345678A")])
    excel = make_excel(dni="12.345.678-A")
    assert m.match(excel).method == "dni"


def test_match_by_name_when_dni_missing():
    m = Matcher([make_prod(dni="")])
    excel = make_excel(dni="")
    result = m.match(excel)
    assert result.method == "name+club"
    assert result.prod_id == "p1"


def test_match_by_name_with_corrupted_accents():
    # Prod has "Martnez" (corrupt), Excel has "MARTÍNEZ"
    m = Matcher([make_prod(first="Isabel", last="Martnez Moya", dni="")])
    excel = make_excel(first="ISABEL", last1="MARTÍNEZ", last2="MOYA", dni="")
    assert m.match(excel).method == "name+club"


def test_no_match_inserts_new():
    m = Matcher([make_prod()])
    excel = make_excel(num="999", dni="99999999Z", club_id="other")
    result = m.match(excel)
    assert result.method == "new"
    assert result.prod_id is None


def test_skipped_when_no_club_and_no_dni():
    m = Matcher([make_prod()])
    excel = make_excel(dni="", club_id="")
    result = m.match(excel)
    assert result.method == "skip"
    assert result.reason == "empty_club_no_dni"


def test_prefers_dni_over_name():
    # Two prod candidates: same name different DNI. Should match DNI exactly.
    m = Matcher([
        make_prod(_id="p1", dni="11111111A"),
        make_prod(_id="p2", dni="22222222B"),
    ])
    excel = make_excel(dni="22222222B")
    assert m.match(excel).prod_id == "p2"
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd backend && poetry run pytest tests/scripts/test_matcher.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement matcher**

```python
# backend/scripts/sync/matcher.py
"""Match Excel member rows against production members."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .excel_loader import ExcelMemberRow
from .normalizers import fuzzy_norm, norm_dni


@dataclass
class MatchResult:
    method: str  # "dni" | "name+club" | "new" | "skip"
    prod_id: str | None
    reason: str = ""


class Matcher:
    def __init__(self, prod_members: list[dict[str, Any]]) -> None:
        self._prod = prod_members
        self._by_dni: dict[str, dict[str, Any]] = {}
        self._by_name_club: dict[tuple[str, str], dict[str, Any]] = {}
        for m in prod_members:
            d = norm_dni(m.get("dni"))
            if d:
                self._by_dni[d] = m
            full = fuzzy_norm(
                f"{m.get('first_name', '')} {m.get('last_name', '')}"
            )
            club = m.get("club_id", "")
            if full and club:
                self._by_name_club[(full, club)] = m

    def match(self, row: ExcelMemberRow) -> MatchResult:
        dni = norm_dni(row.dni_raw)
        if dni and dni in self._by_dni:
            return MatchResult(method="dni", prod_id=str(self._by_dni[dni]["_id"]))

        if not row.club_id:
            if not dni:
                return MatchResult(
                    method="skip", prod_id=None, reason="empty_club_no_dni"
                )
            return MatchResult(method="new", prod_id=None)

        full = fuzzy_norm(f"{row.first_name} {row.last1} {row.last2}")
        key = (full, row.club_id)
        if key in self._by_name_club:
            return MatchResult(
                method="name+club",
                prod_id=str(self._by_name_club[key]["_id"]),
            )

        return MatchResult(method="new", prod_id=None)
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd backend && poetry run pytest tests/scripts/test_matcher.py -v
```
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/sync/matcher.py backend/tests/scripts/test_matcher.py
git commit -m "feat: add Matcher with DNI-then-fuzzy-name strategy"
```

---

## Task 5: Action Planner (TDD)

**Files:**
- Create: `backend/scripts/sync/planner.py`
- Test: `backend/tests/scripts/test_planner.py`

The planner takes loaded Excel data + prod snapshots and produces a structured action plan: which `members` to update/insert, which `member_payments` to upsert, etc. No MongoDB I/O in this module.

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/scripts/test_planner.py
from datetime import date

from scripts.sync.excel_loader import (
    ExcelFeeRow,
    ExcelInsuranceRow,
    ExcelMemberRow,
)
from scripts.sync.planner import Planner


def excel_member(num="100", dni="12345678A", first="Juan", last1="Garcia",
                 last2="Lopez", club_id="club_a", birth=None, email=""):
    return ExcelMemberRow(
        num_socio=num, first_name=first, last1=last1, last2=last2,
        dni_raw=dni, email=email, phone="", birth_date=birth,
        address="", city="", province="", postal_code="", country="Spain",
        club_id=club_id, club_name="Club A",
    )


def excel_fee(num="100", cuota=70, seg_acc=15, rc=True, grade_type="dan", nivel=1):
    return ExcelFeeRow(
        num_socio=num, grade_level=nivel, grade_type=grade_type,
        instructor="", cuota_anual=cuota, seguro_accidentes=seg_acc,
        seguro_rc_flag=rc, send_date=None,
    )


def prod_member(_id="p1", dni="12345678A", first="Juan", last="Garcia Lopez",
                club_id="club_a"):
    return {"_id": _id, "first_name": first, "last_name": last,
            "dni": dni, "club_id": club_id}


def test_matched_member_produces_update_action():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee()},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.member_updates) == 1
    assert plan.member_updates[0]["prod_id"] == "p1"
    assert plan.member_updates[0]["fields"]["dni"] == "12345678A"


def test_unmatched_member_with_dni_produces_insert():
    p = Planner(
        excel_members=[excel_member(dni="99999999Z", club_id="new_club")],
        excel_fees={"100": excel_fee()},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.member_inserts) == 1
    assert plan.member_inserts[0]["dni"] == "99999999Z"
    assert plan.member_inserts[0]["status"] == "active"


def test_empty_club_no_dni_is_skipped():
    p = Planner(
        excel_members=[excel_member(dni="", club_id="")],
        excel_fees={}, excel_insurances=[],
        prod_members=[], prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.skipped) == 1
    assert plan.skipped[0]["reason"] == "empty_club_no_dni"


def test_empty_excel_field_does_not_overwrite_prod():
    # Excel has empty email; prod has "real@x.es". Should NOT include email in update.
    p = Planner(
        excel_members=[excel_member(email="")],
        excel_fees={"100": excel_fee()}, excel_insurances=[],
        prod_members=[{**prod_member(), "email": "real@x.es"}],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert "email" not in plan.member_updates[0]["fields"]


def test_payments_created_for_matched_member():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee(cuota=70, seg_acc=15, rc=True, grade_type="dan")},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    types = sorted(a["payment_type"] for a in plan.payment_upserts)
    assert types == ["licencia_dan", "seguro_accidentes", "seguro_rc"]
    amounts = {a["payment_type"]: a["amount"] for a in plan.payment_upserts}
    assert amounts["licencia_dan"] == 70
    assert amounts["seguro_accidentes"] == 15


def test_rc_payment_omitted_when_flag_false():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee(rc=False)},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    types = {a["payment_type"] for a in plan.payment_upserts}
    assert "seguro_rc" not in types


def test_license_upsert_for_matched_member():
    p = Planner(
        excel_members=[excel_member()],
        excel_fees={"100": excel_fee(grade_type="dan", nivel=3)},
        excel_insurances=[],
        prod_members=[prod_member()],
        prod_licenses={}, prod_insurances={}, prod_payments={},
    )
    plan = p.build()
    assert len(plan.license_upserts) == 1
    lic = plan.license_upserts[0]
    assert lic["license_type"] == "dan"
    assert lic["grade"] == "3º Dan"
    assert lic["technical_grade"] == "dan"
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
cd backend && poetry run pytest tests/scripts/test_planner.py -v
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Implement planner**

```python
# backend/scripts/sync/planner.py
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


@dataclass
class ActionPlan:
    member_updates: list[dict[str, Any]] = field(default_factory=list)
    member_inserts: list[dict[str, Any]] = field(default_factory=list)
    license_upserts: list[dict[str, Any]] = field(default_factory=list)
    insurance_upserts: list[dict[str, Any]] = field(default_factory=list)
    payment_upserts: list[dict[str, Any]] = field(default_factory=list)
    skipped: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[dict[str, Any]] = field(default_factory=list)


def _grade_label(nivel: int | None, grade_type: str) -> str:
    if nivel is None:
        return ""
    suffix = {"dan": "Dan", "kyu": "Kyu", "kyu_infantil": "Kyu"}.get(
        grade_type.lower(), "Kyu"
    )
    return f"{nivel}º {suffix}"


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


def _build_member_update_fields(
    excel: ExcelMemberRow, prod: dict[str, Any]
) -> dict[str, Any]:
    """Only include non-empty Excel values that differ from prod."""
    fields: dict[str, Any] = {}
    mapping = [
        ("first_name", excel.first_name),
        ("last_name", f"{excel.last1} {excel.last2}".strip()),
        ("dni", _norm_for_write(excel.dni_raw)),
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

    if excel.birth_date and excel.birth_date != _prod_birth(prod):
        fields["birth_date"] = datetime.combine(
            excel.birth_date, datetime.min.time()
        ).replace(tzinfo=timezone.utc)

    if excel.club_id and excel.club_id != prod.get("club_id"):
        fields["club_id"] = excel.club_id

    if excel.num_socio and excel.num_socio != prod.get("member_number"):
        fields["member_number"] = excel.num_socio

    return fields


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


class Planner:
    def __init__(
        self,
        excel_members: list[ExcelMemberRow],
        excel_fees: dict[str, ExcelFeeRow],
        excel_insurances: list[ExcelInsuranceRow],
        prod_members: list[dict[str, Any]],
        prod_licenses: dict[str, dict[str, Any]],  # keyed by member_id
        prod_insurances: dict[tuple[str, str], dict[str, Any]],  # (member_id, type)
        prod_payments: dict[tuple[str, int, str], dict[str, Any]],  # (mid, year, type)
    ) -> None:
        self.excel_members = excel_members
        self.excel_fees = excel_fees
        self.excel_insurances = excel_insurances
        self.prod_members = {str(m["_id"]): m for m in prod_members}
        self.prod_licenses = prod_licenses
        self.prod_insurances = prod_insurances
        self.prod_payments = prod_payments
        self._matcher = Matcher(prod_members)

    def build(self) -> ActionPlan:
        plan = ActionPlan()
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
                # For inserts we cannot produce license/payment actions yet because
                # member_id is unknown until write time. The writer resolves those
                # after inserting. Store correlation by num_socio.
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
            "__excel_num_socio": ex.num_socio,  # correlation key for writer
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
            "expiration_date": "2026-12-31T23:59:59Z",
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
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z",
                "status": "active",
                "insurance_company": "Spain Aikikai",
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
                "start_date": "2026-01-01T00:00:00Z",
                "end_date": "2026-12-31T23:59:59Z",
                "status": "active",
                "insurance_company": "Spain Aikikai",
            })


def _normalize_instructor(raw: str) -> str:
    r = (raw or "").strip().lower()
    if "shihan" in r:
        return "shihan"
    if "shidoin" in r:
        return "shidoin"
    if "fukushidoin" in r or "fuku" in r:
        return "fukushidoin"
    return "none"
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
cd backend && poetry run pytest tests/scripts/test_planner.py -v
```
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/sync/planner.py backend/tests/scripts/test_planner.py
git commit -m "feat: add action Planner that builds upsert plan from Excel+prod"
```

---

## Task 6: Writer (MongoDB upserts)

**Files:**
- Create: `backend/scripts/sync/writer.py`

No unit tests for the writer — it is a thin Motor layer. It will be exercised via the dry-run smoke test (Task 8) and the final execute run.

- [ ] **Step 1: Implement writer**

```python
# backend/scripts/sync/writer.py
"""Execute the ActionPlan against MongoDB."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from .constants import (
    COLL_INSURANCES,
    COLL_LICENSES,
    COLL_MEMBERS,
    COLL_PAYMENTS,
    LICENSE_YEAR,
)
from .planner import ActionPlan


async def execute_plan(db: AsyncIOMotorDatabase, plan: ActionPlan) -> dict[str, int]:
    """Apply all actions. Returns counts per collection."""
    counts = {
        "member_updates": 0,
        "member_inserts": 0,
        "license_upserts": 0,
        "insurance_upserts": 0,
        "payment_upserts": 0,
    }

    # 1. Resolve inserts first to get member_id for dependent actions.
    new_id_by_num_socio: dict[str, str] = {}
    for doc in plan.member_inserts:
        num_socio = doc.pop("__excel_num_socio", None)
        doc["updated_at"] = datetime.now(timezone.utc)
        result = await db[COLL_MEMBERS].insert_one(doc)
        new_id_by_num_socio[f"__new__:{num_socio}"] = str(result.inserted_id)
        counts["member_inserts"] += 1

    # 2. Member updates.
    for update in plan.member_updates:
        if not update["fields"]:
            continue
        await db[COLL_MEMBERS].update_one(
            {"_id": ObjectId(update["prod_id"])},
            {"$set": {**update["fields"], "updated_at": datetime.now(timezone.utc)}},
        )
        counts["member_updates"] += 1

    # 3. Licenses.
    for lic in plan.license_upserts:
        member_id = _resolve_member_id(lic["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        await db[COLL_LICENSES].update_one(
            {"member_id": member_id},
            {
                "$set": {
                    **{k: v for k, v in lic.items() if k != "member_id"},
                    "member_id": member_id,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        counts["license_upserts"] += 1

    # 4. Insurances.
    for ins in plan.insurance_upserts:
        member_id = _resolve_member_id(ins["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        key = {
            "member_id": member_id,
            "insurance_type": ins["insurance_type"],
            "start_date": ins["start_date"],
        }
        await db[COLL_INSURANCES].update_one(
            key,
            {
                "$set": {**ins, "member_id": member_id,
                         "updated_at": datetime.now(timezone.utc)},
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        counts["insurance_upserts"] += 1

    # 5. Member payments.
    for pay in plan.payment_upserts:
        member_id = _resolve_member_id(pay["member_id"], new_id_by_num_socio)
        if member_id is None:
            continue
        key = {
            "member_id": member_id,
            "payment_year": pay["payment_year"],
            "payment_type": pay["payment_type"],
        }
        await db[COLL_PAYMENTS].update_one(
            key,
            {
                "$set": {**pay, "member_id": member_id,
                         "updated_at": datetime.now(timezone.utc)},
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        counts["payment_upserts"] += 1

    return counts


def _resolve_member_id(
    ref: str, new_id_by_num_socio: dict[str, str]
) -> str | None:
    if ref.startswith("__new__:"):
        return new_id_by_num_socio.get(ref)
    return ref
```

- [ ] **Step 2: Commit**

```bash
git add backend/scripts/sync/writer.py
git commit -m "feat: add MongoDB writer for sync ActionPlan execution"
```

---

## Task 7: Reporter (dry-run output)

**Files:**
- Create: `backend/scripts/sync/reporter.py`

- [ ] **Step 1: Implement reporter**

```python
# backend/scripts/sync/reporter.py
"""Render ActionPlan as JSON report + stdout summary."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from .planner import ActionPlan


def write_report(plan: ActionPlan, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"sync_report_{date.today().isoformat()}.json"
    path = out_dir / filename
    payload = {
        "summary": summary(plan),
        "member_updates": plan.member_updates,
        "member_inserts": [_strip_correlation(d) for d in plan.member_inserts],
        "license_upserts": plan.license_upserts,
        "insurance_upserts": plan.insurance_upserts,
        "payment_upserts": plan.payment_upserts,
        "skipped": plan.skipped,
        "warnings": plan.warnings,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
    return path


def summary(plan: ActionPlan) -> dict[str, int]:
    return {
        "member_updates": len(plan.member_updates),
        "member_inserts": len(plan.member_inserts),
        "license_upserts": len(plan.license_upserts),
        "insurance_upserts": len(plan.insurance_upserts),
        "payment_upserts": len(plan.payment_upserts),
        "skipped": len(plan.skipped),
        "warnings": len(plan.warnings),
    }


def print_summary(plan: ActionPlan) -> None:
    s = summary(plan)
    print("=" * 60)
    print("SYNC PLAN SUMMARY")
    print("=" * 60)
    for k, v in s.items():
        print(f"  {k:25s} {v:>6d}")
    print("=" * 60)
    if plan.skipped:
        print("\nSKIPPED (first 10):")
        for s_row in plan.skipped[:10]:
            print(
                f"  #{s_row['num_socio']} {s_row['name']} — {s_row['reason']}"
            )
    if plan.warnings:
        print(f"\nWARNINGS: {len(plan.warnings)} (first 5)")
        for w in plan.warnings[:5]:
            print(f"  {w}")


def _strip_correlation(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if not k.startswith("__")}
```

- [ ] **Step 2: Commit**

```bash
git add backend/scripts/sync/reporter.py
git commit -m "feat: add JSON + stdout reporter for sync plan"
```

---

## Task 8: CLI orchestrator + dry-run smoke test

**Files:**
- Create: `backend/scripts/sync_excel_to_prod.py`

- [ ] **Step 1: Implement CLI**

```python
# backend/scripts/sync_excel_to_prod.py
"""CLI: sync Excel ASA 2025-2026 data to MongoDB production.

Usage:
    poetry run python -m scripts.sync_excel_to_prod \
        --excel /path/to/file.xlsx \
        [--env-file backend/.env.production] \
        [--execute]
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from scripts.sync.excel_loader import load_fees, load_insurances, load_members
from scripts.sync.planner import Planner
from scripts.sync.reporter import print_summary, write_report
from scripts.sync.writer import execute_plan


async def load_prod_snapshot(db) -> tuple[list, dict, dict, dict]:
    members = await db["members"].find({}).to_list(length=None)
    licenses_list = await db["licenses"].find({}).to_list(length=None)
    licenses = {str(l["member_id"]): l for l in licenses_list if l.get("member_id")}
    insurances_list = await db["insurances"].find({}).to_list(length=None)
    insurances = {
        (str(i["member_id"]), i.get("insurance_type", "")): i
        for i in insurances_list if i.get("member_id")
    }
    payments_list = await db["member_payments"].find({}).to_list(length=None)
    payments = {
        (str(p["member_id"]), p.get("payment_year"), p.get("payment_type")): p
        for p in payments_list if p.get("member_id")
    }
    return members, licenses, insurances, payments


async def main_async(args: argparse.Namespace) -> int:
    if args.env_file:
        load_dotenv(args.env_file, override=True)
    else:
        load_dotenv()

    mongo_uri = os.getenv("MONGODB_URL")
    db_name = os.getenv("DATABASE_NAME")
    if not mongo_uri or not db_name:
        print("ERROR: MONGODB_URL or DATABASE_NAME not set", file=sys.stderr)
        return 2

    print(f"Target DB: {db_name} @ {mongo_uri[:mongo_uri.find('@') if '@' in mongo_uri else 20]}...")

    excel_path = Path(args.excel)
    if not excel_path.exists():
        print(f"ERROR: Excel file not found: {excel_path}", file=sys.stderr)
        return 2

    print(f"Loading Excel: {excel_path}")
    excel_members = load_members(excel_path)
    excel_fees = load_fees(excel_path)
    excel_insurances = load_insurances(excel_path)
    print(
        f"  members={len(excel_members)} fees={len(excel_fees)} "
        f"insurances={len(excel_insurances)}"
    )

    client = AsyncIOMotorClient(mongo_uri)
    try:
        db = client[db_name]
        print("Loading prod snapshot...")
        prod_members, prod_licenses, prod_insurances, prod_payments = (
            await load_prod_snapshot(db)
        )
        print(
            f"  prod_members={len(prod_members)} "
            f"licenses={len(prod_licenses)} "
            f"insurances={len(prod_insurances)} "
            f"payments={len(prod_payments)}"
        )

        planner = Planner(
            excel_members=excel_members,
            excel_fees=excel_fees,
            excel_insurances=excel_insurances,
            prod_members=prod_members,
            prod_licenses=prod_licenses,
            prod_insurances=prod_insurances,
            prod_payments=prod_payments,
        )
        plan = planner.build()

        report_path = write_report(plan, Path("exports"))
        print(f"\nReport written to: {report_path}")
        print_summary(plan)

        if args.execute:
            print("\n>>> EXECUTE MODE: writing to prod...")
            counts = await execute_plan(db, plan)
            print("Execution counts:")
            for k, v in counts.items():
                print(f"  {k:25s} {v:>6d}")
        else:
            print("\n[DRY-RUN] No changes written. Re-run with --execute to apply.")

        return 0
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--excel", required=True, help="Path to the ASA Excel file")
    parser.add_argument(
        "--env-file",
        help="Optional .env file to load (e.g. .env.production)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually write to MongoDB. Without this, runs in dry-run mode.",
    )
    args = parser.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run dry-run against local DB (safe)**

Configure `backend/.env` for local MongoDB, then:

```bash
cd backend && poetry run python -m scripts.sync_excel_to_prod \
    --excel '/home/abraham/Descargas/Adaptación envio datos ASA 2025-2026 a subidas a APP.xlsx'
```

Expected: prints summary with ~387 member_updates or similar, writes `backend/exports/sync_report_2026-04-17.json`, no writes to DB.

- [ ] **Step 3: Inspect dry-run report**

```bash
cd backend && python -c "
import json
r = json.load(open('exports/sync_report_2026-04-17.json'))
print(r['summary'])
print('warnings sample:', r['warnings'][:3])
print('skipped sample:', r['skipped'][:3])
"
```
Expected: `member_updates + member_inserts + skipped` equals 527 (or the actual Excel row count).

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/sync_excel_to_prod.py
git commit -m "feat: add CLI orchestrator for Excel-to-prod sync"
```

---

## Task 9: Full test-suite verification

- [ ] **Step 1: Run all sync tests together**

```bash
cd backend && poetry run pytest tests/scripts/ -v
```
Expected: all pass (Tasks 1, 4, 5 tests — 25 total).

- [ ] **Step 2: Run full repo test suite to verify no regressions**

```bash
cd backend && poetry run pytest
```
Expected: no failures introduced by new code.

- [ ] **Step 3: Commit if any fixups needed**

Only commit if step 2 exposed a problem that needed a fix.

---

## Task 10: Production dry-run + operator review

This task runs against real production Mongo. Do NOT auto-execute — operator runs manually.

- [ ] **Step 1: Create `.env.production` file**

Operator creates `backend/.env.production` with the prod Mongo URL and DB name. Never commit this file — verify it is gitignored (pattern `.env*` already covers it).

- [ ] **Step 2: Run dry-run against prod**

```bash
cd backend && poetry run python -m scripts.sync_excel_to_prod \
    --excel '/home/abraham/Descargas/Adaptación envio datos ASA 2025-2026 a subidas a APP.xlsx' \
    --env-file .env.production
```

Expected summary roughly:
- `member_updates` ≈ 387
- `member_inserts` ≈ 108
- `license_upserts` ≈ 495
- `insurance_upserts` ≈ 700+
- `payment_upserts` ≈ 1300+
- `skipped` ≈ 32
- `warnings` ≈ ~20

- [ ] **Step 3: Operator reviews `exports/sync_report_YYYY-MM-DD.json`**

Checks to perform:
1. `skipped` array: all 32 entries have `reason=empty_club_no_dni`. If any other reason appears, investigate.
2. `member_inserts`: spot-check 5 entries — confirm names, DNI, club_id look right.
3. `member_updates[0].fields`: first update shouldn't contain all 15 fields (that would indicate over-writing).
4. `payment_upserts`: check per-club distribution matches expectations.
5. `warnings`: inspect every entry. If any are fixable in the Excel, fix and re-run dry-run.

- [ ] **Step 4: Take MongoDB backup**

```bash
mongodump --uri="$MONGODB_URL" --db=spainaikikai --out=backups/pre-sync-$(date +%Y%m%d)
```

- [ ] **Step 5: Execute against prod**

```bash
cd backend && poetry run python -m scripts.sync_excel_to_prod \
    --excel '/home/abraham/Descargas/Adaptación envio datos ASA 2025-2026 a subidas a APP.xlsx' \
    --env-file .env.production \
    --execute
```

- [ ] **Step 6: Verify post-execution counts**

```bash
# Expected deltas approximately:
# members: 1161 → ~1270 (+108 inserts)
# licenses: 1088 → ~1490 (~400 new + updates)
# insurances: 17 → ~900
# member_payments: 57 → ~1400
```

Use MCP `count` queries against each collection.

- [ ] **Step 7: Spot-check in the admin UI**

Log in as super_admin, inspect 5 newly-inserted members and 5 updated members, verify payments show `status=completed` for 2026.

---

## Self-Review Results

- Spec coverage: Every section in the design doc maps to a task — matching (T4), pre-corrections (T2/T3), upserts per collection (T5/T6), dry-run/execute (T7/T8), acceptance checks (T10).
- Placeholder scan: no "TODO", "fill in", or "similar to" patterns; every step has actual code or exact commands.
- Type consistency: `ActionPlan` dataclass fields match the field names used by `writer.py`; `ExcelMemberRow`/`ExcelFeeRow` used consistently; `member_id_ref` convention `__new__:<num>` used in both planner and writer.
