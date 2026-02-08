# License Renewal on Payment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a license payment completes, renew the member's license (update `expiration_date` to Dec 31 of the `payment_year`). Change `license_paid` in the payment summary to derive from license `expiration_date` instead of `MemberPayment` existence.

**Architecture:** Two backend changes: (1) `GenerateLicensesFromPaymentUseCase` gains a renewal path when a license already exists, (2) `GetClubPaymentSummaryUseCase` switches from querying `MemberPayment` to querying `License.expiration_date` to determine `license_paid`. No frontend changes — the API response shape stays the same.

**Tech Stack:** Python, pytest, AsyncMock, FastAPI dependency injection

---

## Task 1: Renew existing license when payment completes

**Context:** Currently, `GenerateLicensesFromPaymentUseCase.execute()` skips (line 87-92) when `find_active_by_member_year` finds an existing license. Instead, it should **renew** that license: update `expiration_date`, `renewal_date`, `is_renewed`, `last_payment_id`, and `status`.

**Files:**
- Modify: `backend/src/application/use_cases/license/generate_licenses_from_payment_use_case.py:80-92`
- Test: `backend/tests/application/use_cases/license/test_generate_licenses_from_payment_use_case.py`

### Step 1: Write failing test for renewal path

Add this test to the existing `TestGenerateLicensesFromPaymentUseCase` class:

```python
async def test_execute_renews_existing_license_instead_of_skipping(self, mock_license_repository):
    """Test that when a license already exists for a member+year+type, it renews it."""
    # Arrange
    member_payment = MemberPayment(
        payment_id="new_payment_456",
        member_id="member123",
        payment_year=2026,
        payment_type=MemberPaymentType.LICENCIA_KYU,
        concept="Licencia Kyu",
        amount=50.0,
        status=MemberPaymentStatus.COMPLETED
    )

    existing_license = License(
        id="existing_lic_id",
        license_number="LIC-2025-0001",
        member_id="member123",
        license_type=LicenseType.KYU,
        grade="Kyu",
        status=LicenseStatus.EXPIRED,
        issue_date=datetime(2025, 1, 1),
        expiration_date=datetime(2025, 12, 31, 23, 59, 59),
        technical_grade=TechnicalGrade.KYU,
        instructor_category=InstructorCategory.NONE,
        age_category=AgeCategory.ADULTO,
        last_payment_id="old_payment_123"
    )

    mock_license_repository.find_active_by_member_year.return_value = None
    # Need a broader search that finds expired licenses too
    mock_license_repository.find_by_member_id.return_value = [existing_license]
    mock_license_repository.update = AsyncMock(side_effect=lambda lic: lic)

    use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

    # Act
    result = await use_case.execute([member_payment], "new_payment_456", 2026)

    # Assert — license was renewed, not created
    assert len(result) == 1
    mock_license_repository.create.assert_not_called()
    mock_license_repository.update.assert_called_once()

    renewed = mock_license_repository.update.call_args[0][0]
    assert renewed.id == "existing_lic_id"
    assert renewed.expiration_date == datetime(2026, 12, 31, 23, 59, 59)
    assert renewed.status == LicenseStatus.ACTIVE
    assert renewed.is_renewed is True
    assert renewed.last_payment_id == "new_payment_456"
```

Also add test for "no existing license to renew → create new one" (the existing `test_execute_creates_kyu_license_successfully` already covers this, but we need to add the new `find_by_member_id` mock returning `[]`):

```python
async def test_execute_creates_new_license_when_no_existing_license_for_member(self, mock_license_repository, sample_member_payment, sample_license):
    """Test that when no license exists at all for the member, a new one is created."""
    mock_license_repository.find_active_by_member_year.return_value = None
    mock_license_repository.find_by_member_id = AsyncMock(return_value=[])
    mock_license_repository.count_by_license_number_prefix.return_value = 0
    mock_license_repository.create.return_value = sample_license

    use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)
    result = await use_case.execute([sample_member_payment], "payment123", 2026)

    assert len(result) == 1
    mock_license_repository.create.assert_called_once()
    mock_license_repository.update.assert_not_called()
```

### Step 2: Run tests to verify they fail

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run pytest tests/application/use_cases/license/test_generate_licenses_from_payment_use_case.py -v -k "renews_existing or no_existing_license_for_member"
```

Expected: FAIL — current code skips when `find_active_by_member_year` returns existing, and doesn't call `find_by_member_id`.

### Step 3: Implement renewal logic

In `generate_licenses_from_payment_use_case.py`, replace the skip block (lines 80-92) with:

```python
        for mp in member_payments:
            attrs = PAYMENT_TYPE_TO_LICENSE_ATTRS.get(mp.payment_type)
            if not attrs:
                continue

            # Check if an active license already exists for this exact year+type
            existing = await self.license_repository.find_active_by_member_year(
                member_id=mp.member_id,
                payment_year=payment_year,
                technical_grade=attrs["technical_grade"].value,
                instructor_category=attrs["instructor_category"].value,
            )
            if existing:
                logger.info(
                    "License already exists for member %s, type %s, year %d — skipping",
                    mp.member_id, mp.payment_type.value, payment_year
                )
                continue

            # Try to find an existing license for this member to renew
            member_licenses = await self.license_repository.find_by_member_id(mp.member_id)
            renewable = self._find_renewable_license(member_licenses, attrs)

            if renewable:
                # Renew the existing license
                renewable.expiration_date = expiration_date
                renewable.renewal_date = datetime.now()
                renewable.is_renewed = True
                renewable.status = LicenseStatus.ACTIVE
                renewable.last_payment_id = payment_id
                updated = await self.license_repository.update(renewable)
                created_licenses.append(updated)
                logger.info(
                    "Renewed license %s for member %s (type: %s, year: %d)",
                    renewable.license_number, mp.member_id, mp.payment_type.value, payment_year
                )
            else:
                # No existing license — create a new one
                prefix = f"LIC-{payment_year}-"
                count = await self.license_repository.count_by_license_number_prefix(prefix)
                license_number = f"{prefix}{count + 1:04d}"

                license = License(
                    license_number=license_number,
                    member_id=mp.member_id,
                    license_type=attrs["license_type"],
                    grade=attrs["grade"],
                    status=LicenseStatus.ACTIVE,
                    issue_date=issue_date,
                    expiration_date=expiration_date,
                    technical_grade=attrs["technical_grade"],
                    instructor_category=attrs["instructor_category"],
                    age_category=attrs["age_category"],
                    last_payment_id=payment_id,
                )

                created = await self.license_repository.create(license)
                created_licenses.append(created)
                logger.info(
                    "Created license %s for member %s (type: %s, year: %d)",
                    license_number, mp.member_id, mp.payment_type.value, payment_year
                )

        return created_licenses
```

Add the helper method to the class:

```python
    @staticmethod
    def _find_renewable_license(
        licenses: List[License], attrs: dict
    ) -> Optional[License]:
        """Find the best license to renew matching the given attributes.

        Prefers the license with the latest expiration_date.
        """
        candidates = [
            lic for lic in licenses
            if lic.technical_grade == attrs["technical_grade"]
            and lic.instructor_category == attrs["instructor_category"]
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda l: l.expiration_date or datetime.min)
```

Add `Optional` and `LicenseStatus` imports if not present (LicenseStatus is already imported; add `Optional` from typing).

### Step 4: Run all tests in the file

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run pytest tests/application/use_cases/license/test_generate_licenses_from_payment_use_case.py -v
```

Expected: ALL PASS. Existing tests should still pass (they mock `find_by_member_id` as not called in skip path, so they need the mock added with return `[]` in the fixture).

**Important:** Update the `mock_license_repository` fixture to also include `find_by_member_id`:

```python
@pytest.fixture
def mock_license_repository():
    mock_repo = MagicMock()
    mock_repo.find_active_by_member_year = AsyncMock(return_value=None)
    mock_repo.find_by_member_id = AsyncMock(return_value=[])
    mock_repo.count_by_license_number_prefix = AsyncMock(return_value=0)
    mock_repo.create = AsyncMock()
    mock_repo.update = AsyncMock()
    return mock_repo
```

### Step 5: Commit

```bash
git add backend/src/application/use_cases/license/generate_licenses_from_payment_use_case.py \
        backend/tests/application/use_cases/license/test_generate_licenses_from_payment_use_case.py
git commit -m "feat: renew existing license when payment completes instead of skipping"
```

---

## Task 2: Derive `license_paid` from license expiration date

**Context:** Currently `GetClubPaymentSummaryUseCase` determines `license_paid` by checking if a COMPLETED `MemberPayment` of license type exists. Change it to check if the member has a license with `expiration_date >= Dec 31 of payment_year`.

**Files:**
- Modify: `backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py:99-114`
- Modify: `backend/src/infrastructure/web/dependencies.py:624-630`
- Create: `backend/tests/application/use_cases/member_payment/test_get_club_payment_summary_use_case.py`

### Step 1: Write failing test

Create the test file:

```python
"""Tests for GetClubPaymentSummaryUseCase."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.license import (
    License, LicenseType, LicenseStatus,
    TechnicalGrade, InstructorCategory, AgeCategory
)
from src.domain.entities.member import Member
from src.domain.entities.club import Club
from src.domain.entities.member_payment import MemberPayment, MemberPaymentType, MemberPaymentStatus
from src.application.use_cases.member_payment.get_club_payment_summary_use_case import (
    GetClubPaymentSummaryUseCase,
)


@pytest.fixture
def mock_repos():
    member_payment_repo = MagicMock()
    club_repo = MagicMock()
    member_repo = MagicMock()
    license_repo = MagicMock()

    club = MagicMock()
    club.name = "Test Club"

    club_repo.find_by_id = AsyncMock(return_value=club)

    member1 = MagicMock()
    member1.id = "m1"
    member1.get_full_name.return_value = "John Doe"

    member2 = MagicMock()
    member2.id = "m2"
    member2.get_full_name.return_value = "Jane Smith"

    member_repo.find_by_club_id = AsyncMock(return_value=[member1, member2])

    member_payment_repo.get_summary_by_member_ids = AsyncMock(return_value={
        "total_amount": 100.0,
        "by_type": {}
    })
    member_payment_repo.find_by_member_ids_year = AsyncMock(return_value=[])

    license_repo.find_by_member_ids = AsyncMock(return_value=[])

    return {
        "member_payment_repo": member_payment_repo,
        "club_repo": club_repo,
        "member_repo": member_repo,
        "license_repo": license_repo,
    }


@pytest.mark.unit
@pytest.mark.asyncio
class TestGetClubPaymentSummaryLicensePaid:

    async def test_license_paid_true_when_license_covers_year(self, mock_repos):
        """license_paid=True when member has license with expiration_date >= Dec 31 of year."""
        license_2026 = MagicMock()
        license_2026.member_id = "m1"
        license_2026.expiration_date = datetime(2026, 12, 31, 23, 59, 59)
        license_2026.status = LicenseStatus.ACTIVE

        mock_repos["license_repo"].find_by_member_ids.return_value = [license_2026]

        use_case = GetClubPaymentSummaryUseCase(
            member_payment_repository=mock_repos["member_payment_repo"],
            club_repository=mock_repos["club_repo"],
            member_repository=mock_repos["member_repo"],
            license_repository=mock_repos["license_repo"],
        )

        result = await use_case.execute("club1", payment_year=2026)

        m1_summary = next(m for m in result.members if m.member_id == "m1")
        m2_summary = next(m for m in result.members if m.member_id == "m2")
        assert m1_summary.license_paid is True
        assert m2_summary.license_paid is False

    async def test_license_paid_false_when_license_expired_before_year(self, mock_repos):
        """license_paid=False when member's license expired before the queried year."""
        old_license = MagicMock()
        old_license.member_id = "m1"
        old_license.expiration_date = datetime(2024, 12, 31, 23, 59, 59)
        old_license.status = LicenseStatus.EXPIRED

        mock_repos["license_repo"].find_by_member_ids.return_value = [old_license]

        use_case = GetClubPaymentSummaryUseCase(
            member_payment_repository=mock_repos["member_payment_repo"],
            club_repository=mock_repos["club_repo"],
            member_repository=mock_repos["member_repo"],
            license_repository=mock_repos["license_repo"],
        )

        result = await use_case.execute("club1", payment_year=2026)

        m1_summary = next(m for m in result.members if m.member_id == "m1")
        assert m1_summary.license_paid is False

    async def test_insurance_paid_still_uses_member_payments(self, mock_repos):
        """insurance_paid should still come from MemberPayment records (unchanged)."""
        insurance_payment = MagicMock()
        insurance_payment.member_id = "m1"
        insurance_payment.is_license_payment = False
        insurance_payment.is_insurance_payment = True
        insurance_payment.amount = 30.0

        mock_repos["member_payment_repo"].find_by_member_ids_year.return_value = [insurance_payment]

        use_case = GetClubPaymentSummaryUseCase(
            member_payment_repository=mock_repos["member_payment_repo"],
            club_repository=mock_repos["club_repo"],
            member_repository=mock_repos["member_repo"],
            license_repository=mock_repos["license_repo"],
        )

        result = await use_case.execute("club1", payment_year=2026)

        m1_summary = next(m for m in result.members if m.member_id == "m1")
        assert m1_summary.insurance_paid is True
```

### Step 2: Run tests to verify they fail

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run pytest tests/application/use_cases/member_payment/test_get_club_payment_summary_use_case.py -v
```

Expected: FAIL — `GetClubPaymentSummaryUseCase.__init__` does not accept `license_repository` param.

### Step 3: Implement the change

**3a. Modify `GetClubPaymentSummaryUseCase`** (`get_club_payment_summary_use_case.py`):

Add `license_repository` to constructor:

```python
from src.application.ports.license_repository import LicenseRepositoryPort

class GetClubPaymentSummaryUseCase:
    def __init__(
        self,
        member_payment_repository: MemberPaymentRepositoryPort,
        club_repository: ClubRepositoryPort,
        member_repository: MemberRepositoryPort,
        license_repository: Optional[LicenseRepositoryPort] = None,
    ):
        self.member_payment_repository = member_payment_repository
        self.club_repository = club_repository
        self.member_repository = member_repository
        self.license_repository = license_repository
```

Add `Optional` to the imports from typing.

Replace the `license_paid` logic in `execute()` (lines 99-114). The new logic:

```python
        # Determine license_paid from license expiration dates
        license_by_member: Dict[str, bool] = {}
        year_end = datetime(payment_year, 12, 31)
        if self.license_repository:
            licenses = await self.license_repository.find_by_member_ids(member_ids, limit=0)
            for lic in licenses:
                if lic.member_id and lic.expiration_date and lic.expiration_date >= year_end:
                    license_by_member[lic.member_id] = True

        # Build member-level payment map (insurance_paid still from MemberPayments)
        member_payments: Dict[str, Dict] = {}
        for payment in payments:
            if payment.member_id not in member_payments:
                member_payments[payment.member_id] = {
                    "insurance_paid": False,
                    "total_paid": 0.0
                }

            if payment.is_insurance_payment:
                member_payments[payment.member_id]["insurance_paid"] = True

            member_payments[payment.member_id]["total_paid"] += payment.amount
```

Update the member summaries loop:

```python
        for member in members:
            payment_data = member_payments.get(member.id, {
                "insurance_paid": False,
                "total_paid": 0.0
            })

            has_license = license_by_member.get(member.id, False)

            if has_license:
                members_with_license += 1
            if payment_data["insurance_paid"]:
                members_with_insurance += 1

            member_summaries.append(MemberPaymentSummary(
                member_id=member.id,
                member_name=member.get_full_name(),
                license_paid=has_license,
                insurance_paid=payment_data["insurance_paid"],
                total_paid=payment_data["total_paid"]
            ))
```

**3b. Update dependency injection** (`dependencies.py:624-630`):

```python
@lru_cache()
def get_club_payment_summary_use_case() -> GetClubPaymentSummaryUseCase:
    """Get club payment summary use case."""
    return GetClubPaymentSummaryUseCase(
        member_payment_repository=get_member_payment_repository(),
        club_repository=get_club_repository(),
        member_repository=get_member_repository(),
        license_repository=get_license_repository(),
    )
```

### Step 4: Run all tests

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run pytest tests/application/use_cases/member_payment/test_get_club_payment_summary_use_case.py -v
```

Expected: ALL PASS

Also run the full test suite to check for regressions:

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run pytest --cov=src -x -v
```

### Step 5: Commit

```bash
git add backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py \
        backend/src/infrastructure/web/dependencies.py \
        backend/tests/application/use_cases/member_payment/test_get_club_payment_summary_use_case.py
git commit -m "feat: derive license_paid from license expiration date instead of MemberPayment"
```

---

## Task 3: Verify end-to-end (manual)

### Step 1: Start backend

```bash
cd /home/abraham/Projects/react-fastapi-spainaikikai-admin/backend
poetry run uvicorn src.main:app --reload
```

### Step 2: Verify dashboard still works

```bash
curl -s http://localhost:8000/api/v1/dashboard/stats | python3 -m json.tool
```

Expected: Response with stats, no 500 errors.

### Step 3: Verify payment summary endpoint

```bash
# Get a valid club_id first, then:
curl -s "http://localhost:8000/api/v1/member-payments/club/{club_id}/summary?payment_year=2026" \
  -H "Authorization: Bearer {token}" | python3 -m json.tool
```

Expected: `license_paid` values reflect license `expiration_date`, not MemberPayment existence.

---

## Summary of all changes

| File | Change |
|------|--------|
| `backend/src/application/use_cases/license/generate_licenses_from_payment_use_case.py` | Add renewal path: when license exists, renew instead of skip. Add `_find_renewable_license` helper. |
| `backend/tests/application/use_cases/license/test_generate_licenses_from_payment_use_case.py` | Add renewal tests, update fixture with `find_by_member_id` mock. |
| `backend/src/application/use_cases/member_payment/get_club_payment_summary_use_case.py` | Add `license_repository` param. Derive `license_paid` from license `expiration_date`. |
| `backend/src/infrastructure/web/dependencies.py` | Pass `license_repository` to `GetClubPaymentSummaryUseCase`. |
| `backend/tests/application/use_cases/member_payment/test_get_club_payment_summary_use_case.py` | New test file for summary use case with license-based `license_paid`. |

**Total: 3 source files modified, 2 test files modified/created**
