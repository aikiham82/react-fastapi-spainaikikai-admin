"""Tests for PrefillAnnualPaymentUseCase."""

import json
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.application.use_cases.payment.prefill_annual_payment_use_case import (
    PrefillAnnualPaymentUseCase,
    PrefillResult,
    PrefillMemberAssignment,
)
from src.domain.entities.member import Member, MemberStatus
from src.domain.entities.license import (
    License,
    LicenseStatus,
    TechnicalGrade,
    InstructorCategory,
    AgeCategory,
)
from src.domain.entities.insurance import Insurance, InsuranceType, InsuranceStatus
from src.domain.entities.payment import Payment, PaymentStatus, PaymentType


@pytest.fixture
def mock_repos():
    """Create mock repositories for testing."""
    return {
        "member_repo": AsyncMock(),
        "license_repo": AsyncMock(),
        "insurance_repo": AsyncMock(),
        "payment_repo": AsyncMock(),
    }


@pytest.fixture
def use_case(mock_repos):
    """Create use case instance with mocked repositories."""
    return PrefillAnnualPaymentUseCase(
        mock_repos["member_repo"],
        mock_repos["license_repo"],
        mock_repos["insurance_repo"],
        mock_repos["payment_repo"],
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestPrefillAnnualPaymentUseCase:
    """Test suite for PrefillAnnualPaymentUseCase."""

    async def test_prefill_with_members_and_licenses(self, use_case, mock_repos):
        """Test prefilling with 3 active members: KYU adulto, KYU infantil, and DAN licenses.

        Verifies:
        - kyu_count=1 for adult KYU
        - kyu_infantil_count=1 for child KYU
        - dan_count=1 for DAN
        - source="members"
        - correct member assignments
        """
        # Arrange
        club_id = "club-123"
        payment_year = 2026

        # Create 3 active members
        member1 = Member(
            id="member-1",
            first_name="John",
            last_name="Doe",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )
        member2 = Member(
            id="member-2",
            first_name="Jane",
            last_name="Smith",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )
        member3 = Member(
            id="member-3",
            first_name="Bob",
            last_name="Johnson",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        # Create licenses: KYU adulto, KYU infantil, DAN
        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="5th Kyu",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )
        license2 = License(
            id="lic-2",
            license_number="L002",
            member_id="member-2",
            grade="4th Kyu",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.INFANTIL,
            created_at=datetime(2025, 1, 1),
        )
        license3 = License(
            id="lic-3",
            license_number="L003",
            member_id="member-3",
            grade="1st Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [member1, member2, member3]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1, license2, license3]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year, "Test Payer")

        # Assert
        assert result.source == "members"
        assert result.kyu_count == 1
        assert result.kyu_infantil_count == 1
        assert result.dan_count == 1
        assert result.fukushidoin_count == 0
        assert result.shidoin_count == 0
        assert result.seguro_accidentes_count == 0
        assert result.seguro_rc_count == 0
        assert result.payer_name == "Test Payer"
        assert result.include_club_fee is True

        # Verify member assignments
        assert len(result.member_assignments) == 3

        member1_assignment = next(a for a in result.member_assignments if a.member_id == "member-1")
        assert member1_assignment.member_name == "John Doe"
        assert member1_assignment.payment_types == ["kyu"]

        member2_assignment = next(a for a in result.member_assignments if a.member_id == "member-2")
        assert member2_assignment.member_name == "Jane Smith"
        assert member2_assignment.payment_types == ["kyu_infantil"]

        member3_assignment = next(a for a in result.member_assignments if a.member_id == "member-3")
        assert member3_assignment.member_name == "Bob Johnson"
        assert member3_assignment.payment_types == ["dan"]

        # Verify repository calls
        mock_repos["member_repo"].find_by_club_id.assert_called_once_with(club_id, limit=500)
        mock_repos["license_repo"].find_by_member_ids.assert_called_once_with(
            ["member-1", "member-2", "member-3"], limit=1000
        )

    async def test_prefill_with_insurances(self, use_case, mock_repos):
        """Test prefilling with 2 active members with licenses and insurances.

        Verifies:
        - seguro_accidentes_count=1 for ACCIDENT insurance
        - seguro_rc_count=1 for CIVIL_LIABILITY insurance
        - insurance types in member assignments
        """
        # Arrange
        club_id = "club-456"
        payment_year = 2026

        # Create 2 active members
        member1 = Member(
            id="member-1",
            first_name="Alice",
            last_name="Wonder",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )
        member2 = Member(
            id="member-2",
            first_name="Bob",
            last_name="Builder",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        # Create licenses for both members
        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="3rd Kyu",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )
        license2 = License(
            id="lic-2",
            license_number="L002",
            member_id="member-2",
            grade="2nd Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Create insurances: one ACCIDENT, one CIVIL_LIABILITY
        insurance1 = Insurance(
            id="ins-1",
            member_id="member-1",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL001",
            insurance_company="Insurer A",
            status=InsuranceStatus.ACTIVE,
        )
        insurance2 = Insurance(
            id="ins-2",
            member_id="member-2",
            insurance_type=InsuranceType.CIVIL_LIABILITY,
            policy_number="POL002",
            insurance_company="Insurer B",
            status=InsuranceStatus.ACTIVE,
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [member1, member2]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1, license2]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = [insurance1, insurance2]
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.source == "members"
        assert result.kyu_count == 1
        assert result.dan_count == 1
        assert result.seguro_accidentes_count == 1
        assert result.seguro_rc_count == 1

        # Verify member assignments include insurance types
        assert len(result.member_assignments) == 2

        member1_assignment = next(a for a in result.member_assignments if a.member_id == "member-1")
        assert "kyu" in member1_assignment.payment_types
        assert "seguro_accidentes" in member1_assignment.payment_types
        assert len(member1_assignment.payment_types) == 2

        member2_assignment = next(a for a in result.member_assignments if a.member_id == "member-2")
        assert "dan" in member2_assignment.payment_types
        assert "seguro_rc" in member2_assignment.payment_types
        assert len(member2_assignment.payment_types) == 2

    async def test_prefill_fukushidoin_detection(self, use_case, mock_repos):
        """Test prefilling with FUKUSHIDOIN instructor category.

        Verifies:
        - fukushidoin_count=1 for fukushidoin instructor
        - instructor classification takes precedence over technical grade
        """
        # Arrange
        club_id = "club-789"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="Sensei",
            last_name="Master",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="3rd Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.FUKUSHIDOIN,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.source == "members"
        assert result.fukushidoin_count == 1
        assert result.shidoin_count == 0
        assert result.dan_count == 0  # Instructor category takes precedence
        assert result.kyu_count == 0

        member1_assignment = result.member_assignments[0]
        assert member1_assignment.payment_types == ["fukushidoin"]

    async def test_prefill_shidoin_detection(self, use_case, mock_repos):
        """Test prefilling with SHIDOIN instructor category.

        Verifies:
        - shidoin_count=1 for shidoin instructor
        """
        # Arrange
        club_id = "club-999"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="Master",
            last_name="Chief",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="5th Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.SHIDOIN,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.shidoin_count == 1
        assert result.fukushidoin_count == 0
        assert result.dan_count == 0

    async def test_prefill_fallback_to_previous_payment(self, use_case, mock_repos):
        """Test fallback to previous year's payment when no active members exist.

        Verifies:
        - Counts come from previous payment's line_items_data
        - source="previous_payment"
        - member assignments from previous payment
        """
        # Arrange
        club_id = "club-empty"
        payment_year = 2026

        # Create previous year's payment with line items
        line_items = [
            {"item_type": "kyu", "quantity": 5, "price": 30.0},
            {"item_type": "dan", "quantity": 2, "price": 40.0},
            {"item_type": "seguro_accidentes", "quantity": 3, "price": 25.0},
        ]

        member_assignments = [
            {"member_id": "old-m1", "member_name": "Old Member 1", "payment_types": ["kyu"]},
            {"member_id": "old-m2", "member_name": "Old Member 2", "payment_types": ["dan", "seguro_accidentes"]},
        ]

        previous_payment = Payment(
            id="payment-2025",
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_year=2025,
            status=PaymentStatus.COMPLETED,
            amount=350.0,
            payer_name="Previous Payer",
            line_items_data=json.dumps(line_items),
            member_assignments=json.dumps(member_assignments),
        )

        # Setup mocks: no active members, but previous payment exists
        mock_repos["member_repo"].find_by_club_id.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = previous_payment

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.source == "previous_payment"
        assert result.kyu_count == 5
        assert result.dan_count == 2
        assert result.kyu_infantil_count == 0
        assert result.fukushidoin_count == 0
        assert result.shidoin_count == 0
        assert result.seguro_accidentes_count == 3
        assert result.seguro_rc_count == 0
        assert result.payer_name == "Previous Payer"
        assert result.include_club_fee is True

        # Verify member assignments from previous payment
        assert len(result.member_assignments) == 2
        assert result.member_assignments[0].member_id == "old-m1"
        assert result.member_assignments[0].member_name == "Old Member 1"
        assert result.member_assignments[1].member_id == "old-m2"
        assert result.member_assignments[1].payment_types == ["dan", "seguro_accidentes"]

        # Verify it searched for previous year's payment
        mock_repos["payment_repo"].find_by_club_type_year.assert_called_once_with(
            club_id, PaymentType.ANNUAL_QUOTA, 2025
        )

    async def test_prefill_no_members_no_previous_payment(self, use_case, mock_repos):
        """Test when no active members and no previous payment exists.

        Verifies:
        - All counts are 0
        - source="previous_payment"
        - include_club_fee=True
        - empty member_assignments
        """
        # Arrange
        club_id = "club-new"
        payment_year = 2026

        # Setup mocks: no members, no previous payment
        mock_repos["member_repo"].find_by_club_id.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year, "New Payer")

        # Assert
        assert result.source == "previous_payment"
        assert result.kyu_count == 0
        assert result.kyu_infantil_count == 0
        assert result.dan_count == 0
        assert result.fukushidoin_count == 0
        assert result.shidoin_count == 0
        assert result.seguro_accidentes_count == 0
        assert result.seguro_rc_count == 0
        assert result.payer_name == "New Payer"
        assert result.include_club_fee is True
        assert len(result.member_assignments) == 0

    async def test_prefill_club_fee_already_paid(self, use_case, mock_repos):
        """Test club fee determination when payment already completed for year.

        Verifies:
        - include_club_fee=False when completed payment exists for current year
        """
        # Arrange
        club_id = "club-123"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="John",
            last_name="Doe",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="2nd Kyu",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Existing completed payment for current year
        existing_payment = Payment(
            id="payment-2026",
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_year=2026,
            status=PaymentStatus.COMPLETED,
            amount=200.0,
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = existing_payment

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.include_club_fee is False
        assert result.source == "members"

        # Verify it checked for current year's payment
        mock_repos["payment_repo"].find_by_club_type_year.assert_called_once_with(
            club_id, PaymentType.ANNUAL_QUOTA, 2026
        )

    async def test_prefill_club_fee_not_paid(self, use_case, mock_repos):
        """Test club fee determination when no payment for current year.

        Verifies:
        - include_club_fee=True when no completed payment for year
        """
        # Arrange
        club_id = "club-456"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="Jane",
            last_name="Smith",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="1st Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Setup mocks: no payment for current year
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.include_club_fee is True

    async def test_prefill_club_fee_with_pending_payment(self, use_case, mock_repos):
        """Test club fee when payment exists but is not completed.

        Verifies:
        - include_club_fee=True when payment is PENDING (not COMPLETED)
        """
        # Arrange
        club_id = "club-789"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="Test",
            last_name="User",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="3rd Kyu",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Pending payment (not completed)
        pending_payment = Payment(
            id="payment-pending",
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_year=2026,
            status=PaymentStatus.PENDING,
            amount=100.0,
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = pending_payment

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.include_club_fee is True  # Not completed, so club fee still needed

    async def test_prefill_filters_inactive_members(self, use_case, mock_repos):
        """Test that only ACTIVE members are included in prefill.

        Verifies:
        - Inactive members are excluded from counts and assignments
        """
        # Arrange
        club_id = "club-mixed"
        payment_year = 2026

        active_member = Member(
            id="member-active",
            first_name="Active",
            last_name="Member",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        inactive_member = Member(
            id="member-inactive",
            first_name="Inactive",
            last_name="Member",
            status=MemberStatus.INACTIVE,
            club_id=club_id,
        )

        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-active",
            grade="1st Kyu",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        license2 = License(
            id="lic-2",
            license_number="L002",
            member_id="member-inactive",
            grade="2nd Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [active_member, inactive_member]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1, license2]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.kyu_count == 1
        assert result.dan_count == 0  # Inactive member's license not counted
        assert len(result.member_assignments) == 1
        assert result.member_assignments[0].member_id == "member-active"

    async def test_prefill_prefers_active_license_over_expired(self, use_case, mock_repos):
        """Test that active licenses are preferred over expired ones for same member.

        Verifies:
        - When a member has multiple licenses, active one is selected
        """
        # Arrange
        club_id = "club-multi-lic"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="Multi",
            last_name="License",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        # Older expired license
        expired_license = License(
            id="lic-expired",
            license_number="L001",
            member_id="member-1",
            grade="1st Kyu",
            status=LicenseStatus.EXPIRED,
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2024, 1, 1),
        )

        # Newer active license
        active_license = License(
            id="lic-active",
            license_number="L002",
            member_id="member-1",
            grade="2nd Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        # Setup mocks: return both licenses (expired first)
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = [expired_license, active_license]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.dan_count == 1
        assert result.kyu_count == 0  # Active DAN license is preferred
        assert result.member_assignments[0].payment_types == ["dan"]

    async def test_prefill_member_with_multiple_insurance_types(self, use_case, mock_repos):
        """Test member with both ACCIDENT and CIVIL_LIABILITY insurance.

        Verifies:
        - Both insurance types are counted and assigned to member
        """
        # Arrange
        club_id = "club-double-ins"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="Fully",
            last_name="Insured",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        license1 = License(
            id="lic-1",
            license_number="L001",
            member_id="member-1",
            grade="1st Dan",
            status=LicenseStatus.ACTIVE,
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            created_at=datetime(2025, 1, 1),
        )

        insurance1 = Insurance(
            id="ins-1",
            member_id="member-1",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL001",
            insurance_company="Insurer A",
            status=InsuranceStatus.ACTIVE,
        )

        insurance2 = Insurance(
            id="ins-2",
            member_id="member-1",
            insurance_type=InsuranceType.CIVIL_LIABILITY,
            policy_number="POL002",
            insurance_company="Insurer B",
            status=InsuranceStatus.ACTIVE,
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = [license1]
        mock_repos["insurance_repo"].find_by_member_ids.return_value = [insurance1, insurance2]
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.dan_count == 1
        assert result.seguro_accidentes_count == 1
        assert result.seguro_rc_count == 1

        member1_assignment = result.member_assignments[0]
        assert "dan" in member1_assignment.payment_types
        assert "seguro_accidentes" in member1_assignment.payment_types
        assert "seguro_rc" in member1_assignment.payment_types
        assert len(member1_assignment.payment_types) == 3

    async def test_prefill_member_without_license_but_with_insurance(self, use_case, mock_repos):
        """Test member who has insurance but no license.

        Verifies:
        - Insurance counts are still recorded
        - Member assignment is created with only insurance types
        """
        # Arrange
        club_id = "club-ins-only"
        payment_year = 2026

        member1 = Member(
            id="member-1",
            first_name="Insurance",
            last_name="Only",
            status=MemberStatus.ACTIVE,
            club_id=club_id,
        )

        insurance1 = Insurance(
            id="ins-1",
            member_id="member-1",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL001",
            insurance_company="Insurer A",
            status=InsuranceStatus.ACTIVE,
        )

        # Setup mocks: no licenses
        mock_repos["member_repo"].find_by_club_id.return_value = [member1]
        mock_repos["license_repo"].find_by_member_ids.return_value = []
        mock_repos["insurance_repo"].find_by_member_ids.return_value = [insurance1]
        mock_repos["payment_repo"].find_by_club_type_year.return_value = None

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.seguro_accidentes_count == 1
        assert result.kyu_count == 0
        assert result.dan_count == 0

        member1_assignment = result.member_assignments[0]
        assert member1_assignment.payment_types == ["seguro_accidentes"]

    async def test_prefill_previous_payment_with_invalid_json(self, use_case, mock_repos):
        """Test fallback with previous payment containing invalid JSON.

        Verifies:
        - Gracefully handles JSON decode errors
        - Returns zero counts when JSON is invalid
        """
        # Arrange
        club_id = "club-bad-json"
        payment_year = 2026

        previous_payment = Payment(
            id="payment-2025",
            club_id=club_id,
            payment_type=PaymentType.ANNUAL_QUOTA,
            payment_year=2025,
            status=PaymentStatus.COMPLETED,
            amount=100.0,
            payer_name="Previous Payer",
            line_items_data="invalid json{",
            member_assignments="also invalid{",
        )

        # Setup mocks
        mock_repos["member_repo"].find_by_club_id.return_value = []
        mock_repos["payment_repo"].find_by_club_type_year.return_value = previous_payment

        # Act
        result = await use_case.execute(club_id, payment_year)

        # Assert
        assert result.source == "previous_payment"
        assert result.kyu_count == 0
        assert result.dan_count == 0
        assert len(result.member_assignments) == 0
        assert result.payer_name == "Previous Payer"  # Still uses valid fields
