"""Tests for GenerateLicensesFromPaymentUseCase."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.license import (
    License, LicenseType, LicenseStatus,
    TechnicalGrade, InstructorCategory, AgeCategory
)
from src.domain.entities.member_payment import MemberPayment, MemberPaymentType, MemberPaymentStatus
from src.application.use_cases.license.generate_licenses_from_payment_use_case import (
    GenerateLicensesFromPaymentUseCase,
    PAYMENT_TYPE_TO_LICENSE_ATTRS
)


@pytest.fixture
def mock_license_repository():
    """Mock license repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.find_active_by_member_year = AsyncMock(return_value=None)
    mock_repo.count_by_license_number_prefix = AsyncMock(return_value=0)
    mock_repo.create = AsyncMock()
    return mock_repo


@pytest.fixture
def sample_member_payment():
    """Sample member payment entity for testing."""
    return MemberPayment(
        id="mp123",
        payment_id="payment123",
        member_id="member123",
        payment_year=2026,
        payment_type=MemberPaymentType.LICENCIA_KYU,
        concept="Licencia Kyu",
        amount=50.0,
        status=MemberPaymentStatus.COMPLETED,
        created_at=datetime(2026, 1, 1, 10, 0, 0),
        updated_at=datetime(2026, 1, 1, 10, 0, 0)
    )


@pytest.fixture
def sample_license():
    """Sample license entity for testing."""
    return License(
        id="lic123",
        license_number="LIC-2026-0001",
        member_id="member123",
        license_type=LicenseType.KYU,
        grade="Kyu",
        status=LicenseStatus.ACTIVE,
        issue_date=datetime(2026, 1, 1),
        expiration_date=datetime(2026, 12, 31, 23, 59, 59),
        technical_grade=TechnicalGrade.KYU,
        instructor_category=InstructorCategory.NONE,
        age_category=AgeCategory.ADULTO,
        last_payment_id="payment123"
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestGenerateLicensesFromPaymentUseCase:
    """Test suite for GenerateLicensesFromPaymentUseCase."""

    async def test_execute_creates_kyu_license_successfully(self, mock_license_repository, sample_member_payment, sample_license):
        """Test that execute creates a KYU license successfully for a valid payment."""
        # Arrange
        member_payments = [sample_member_payment]
        payment_id = "payment123"
        payment_year = 2026

        mock_license_repository.find_active_by_member_year.return_value = None
        mock_license_repository.count_by_license_number_prefix.return_value = 0
        mock_license_repository.create.return_value = sample_license

        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute(member_payments, payment_id, payment_year)

        # Assert
        assert len(result) == 1
        assert result[0] == sample_license
        mock_license_repository.find_active_by_member_year.assert_called_once()
        mock_license_repository.count_by_license_number_prefix.assert_called_once_with("LIC-2026-")
        mock_license_repository.create.assert_called_once()

        # Verify the created license attributes
        created_license = mock_license_repository.create.call_args[0][0]
        assert created_license.license_number == "LIC-2026-0001"
        assert created_license.member_id == "member123"
        assert created_license.grade == "Kyu"
        assert created_license.technical_grade == TechnicalGrade.KYU
        assert created_license.instructor_category == InstructorCategory.NONE
        assert created_license.age_category == AgeCategory.ADULTO
        assert created_license.license_type == LicenseType.KYU
        assert created_license.status == LicenseStatus.ACTIVE
        assert created_license.issue_date == datetime(2026, 1, 1)
        assert created_license.expiration_date == datetime(2026, 12, 31, 23, 59, 59)
        assert created_license.last_payment_id == "payment123"

    async def test_execute_creates_kyu_infantil_license_successfully(self, mock_license_repository):
        """Test that execute creates a KYU_INFANTIL license with correct age category."""
        # Arrange
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member456",
            payment_year=2026,
            payment_type=MemberPaymentType.LICENCIA_KYU_INFANTIL,
            concept="Licencia Kyu Infantil",
            amount=30.0,
            status=MemberPaymentStatus.COMPLETED
        )

        expected_license = License(
            id="lic456",
            license_number="LIC-2026-0001",
            member_id="member456",
            license_type=LicenseType.KYU,
            grade="Kyu Infantil",
            status=LicenseStatus.ACTIVE,
            issue_date=datetime(2026, 1, 1),
            expiration_date=datetime(2026, 12, 31, 23, 59, 59),
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.INFANTIL,
            last_payment_id="payment123"
        )

        mock_license_repository.create.return_value = expected_license
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 1
        created_license = mock_license_repository.create.call_args[0][0]
        assert created_license.age_category == AgeCategory.INFANTIL
        assert created_license.grade == "Kyu Infantil"

    async def test_execute_creates_dan_license_successfully(self, mock_license_repository):
        """Test that execute creates a DAN license with correct technical grade."""
        # Arrange
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member789",
            payment_year=2026,
            payment_type=MemberPaymentType.LICENCIA_DAN,
            concept="Licencia Dan",
            amount=100.0,
            status=MemberPaymentStatus.COMPLETED
        )

        expected_license = License(
            id="lic789",
            license_number="LIC-2026-0001",
            member_id="member789",
            license_type=LicenseType.DAN,
            grade="Dan",
            status=LicenseStatus.ACTIVE,
            issue_date=datetime(2026, 1, 1),
            expiration_date=datetime(2026, 12, 31, 23, 59, 59),
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            last_payment_id="payment123"
        )

        mock_license_repository.create.return_value = expected_license
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 1
        created_license = mock_license_repository.create.call_args[0][0]
        assert created_license.technical_grade == TechnicalGrade.DAN
        assert created_license.license_type == LicenseType.DAN
        assert created_license.grade == "Dan"

    async def test_execute_creates_fukushidoin_license_successfully(self, mock_license_repository):
        """Test that execute creates a FUKUSHIDOIN instructor license with correct categories."""
        # Arrange
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member999",
            payment_year=2026,
            payment_type=MemberPaymentType.TITULO_FUKUSHIDOIN,
            concept="Título Fukushidoin",
            amount=150.0,
            status=MemberPaymentStatus.COMPLETED
        )

        expected_license = License(
            id="lic999",
            license_number="LIC-2026-0001",
            member_id="member999",
            license_type=LicenseType.INSTRUCTOR,
            grade="Fukushidoin/Shidoin",
            status=LicenseStatus.ACTIVE,
            issue_date=datetime(2026, 1, 1),
            expiration_date=datetime(2026, 12, 31, 23, 59, 59),
            technical_grade=TechnicalGrade.DAN,
            instructor_category=InstructorCategory.FUKUSHIDOIN,
            age_category=AgeCategory.ADULTO,
            last_payment_id="payment123"
        )

        mock_license_repository.create.return_value = expected_license
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 1
        created_license = mock_license_repository.create.call_args[0][0]
        assert created_license.technical_grade == TechnicalGrade.DAN
        assert created_license.instructor_category == InstructorCategory.FUKUSHIDOIN
        assert created_license.license_type == LicenseType.INSTRUCTOR
        assert created_license.grade == "Fukushidoin/Shidoin"

    async def test_execute_skips_license_if_already_exists_for_member_year_type(self, mock_license_repository, sample_member_payment):
        """Test idempotency: skips license creation if one already exists for the member+year+type."""
        # Arrange
        existing_license = License(
            id="existing_lic",
            license_number="LIC-2026-0001",
            member_id="member123",
            license_type=LicenseType.KYU,
            grade="Kyu",
            status=LicenseStatus.ACTIVE,
            issue_date=datetime(2026, 1, 1),
            expiration_date=datetime(2026, 12, 31, 23, 59, 59),
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO
        )

        mock_license_repository.find_active_by_member_year.return_value = existing_license
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([sample_member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 0  # No new licenses created
        mock_license_repository.find_active_by_member_year.assert_called_once()
        mock_license_repository.count_by_license_number_prefix.assert_not_called()
        mock_license_repository.create.assert_not_called()

    async def test_execute_skips_unrecognized_payment_types(self, mock_license_repository):
        """Test that execute skips payment types not in the mapping."""
        # Arrange
        # TITULO_SHIDOIN is not in PAYMENT_TYPE_TO_LICENSE_ATTRS mapping
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member123",
            payment_year=2026,
            payment_type=MemberPaymentType.TITULO_SHIDOIN,
            concept="Título Shidoin",
            amount=200.0,
            status=MemberPaymentStatus.COMPLETED
        )

        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 0
        mock_license_repository.find_active_by_member_year.assert_not_called()
        mock_license_repository.count_by_license_number_prefix.assert_not_called()
        mock_license_repository.create.assert_not_called()

    async def test_execute_returns_empty_list_for_empty_member_payments(self, mock_license_repository):
        """Test that execute returns empty list when no member payments provided."""
        # Arrange
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([], "payment123", 2026)

        # Assert
        assert result == []
        mock_license_repository.find_active_by_member_year.assert_not_called()
        mock_license_repository.count_by_license_number_prefix.assert_not_called()
        mock_license_repository.create.assert_not_called()

    async def test_execute_generates_sequential_license_numbers(self, mock_license_repository):
        """Test that execute generates sequential license numbers for multiple members."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id=f"member{i}",
                payment_year=2026,
                payment_type=MemberPaymentType.LICENCIA_KYU,
                concept="Licencia Kyu",
                amount=50.0,
                status=MemberPaymentStatus.COMPLETED
            )
            for i in range(3)
        ]

        # Mock count to return incrementing values
        call_count = [0]

        def count_side_effect(prefix):
            result = call_count[0]
            call_count[0] += 1
            return result

        mock_license_repository.count_by_license_number_prefix.side_effect = count_side_effect

        # Mock create to return license with the same number
        def create_side_effect(license):
            return license

        mock_license_repository.create.side_effect = create_side_effect

        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 3
        assert result[0].license_number == "LIC-2026-0001"
        assert result[1].license_number == "LIC-2026-0002"
        assert result[2].license_number == "LIC-2026-0003"

    async def test_execute_uses_correct_year_in_license_number_and_dates(self, mock_license_repository):
        """Test that execute uses the payment_year correctly in license number and validity dates."""
        # Arrange
        payment_year = 2027
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member123",
            payment_year=payment_year,
            payment_type=MemberPaymentType.LICENCIA_KYU,
            concept="Licencia Kyu",
            amount=50.0,
            status=MemberPaymentStatus.COMPLETED
        )

        expected_license = License(
            id="lic123",
            license_number="LIC-2027-0005",
            member_id="member123",
            license_type=LicenseType.KYU,
            grade="Kyu",
            status=LicenseStatus.ACTIVE,
            issue_date=datetime(2027, 1, 1),
            expiration_date=datetime(2027, 12, 31, 23, 59, 59),
            technical_grade=TechnicalGrade.KYU,
            instructor_category=InstructorCategory.NONE,
            age_category=AgeCategory.ADULTO,
            last_payment_id="payment123"
        )

        mock_license_repository.count_by_license_number_prefix.return_value = 4  # Next should be 0005
        mock_license_repository.create.return_value = expected_license
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", payment_year)

        # Assert
        assert len(result) == 1
        mock_license_repository.count_by_license_number_prefix.assert_called_once_with("LIC-2027-")

        created_license = mock_license_repository.create.call_args[0][0]
        assert created_license.license_number == "LIC-2027-0005"
        assert created_license.issue_date == datetime(2027, 1, 1)
        assert created_license.expiration_date == datetime(2027, 12, 31, 23, 59, 59)

    async def test_execute_handles_multiple_payment_types_in_single_call(self, mock_license_repository):
        """Test that execute handles multiple different payment types in a single call."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id="member1",
                payment_year=2026,
                payment_type=MemberPaymentType.LICENCIA_KYU,
                concept="Licencia Kyu",
                amount=50.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member2",
                payment_year=2026,
                payment_type=MemberPaymentType.LICENCIA_DAN,
                concept="Licencia Dan",
                amount=100.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member3",
                payment_year=2026,
                payment_type=MemberPaymentType.TITULO_FUKUSHIDOIN,
                concept="Título Fukushidoin",
                amount=150.0,
                status=MemberPaymentStatus.COMPLETED
            )
        ]

        def create_side_effect(license):
            return license

        mock_license_repository.create.side_effect = create_side_effect
        mock_license_repository.count_by_license_number_prefix.return_value = 0

        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 3
        assert result[0].technical_grade == TechnicalGrade.KYU
        assert result[1].technical_grade == TechnicalGrade.DAN
        assert result[2].instructor_category == InstructorCategory.FUKUSHIDOIN

    async def test_execute_propagates_repository_exceptions_from_find(self, mock_license_repository, sample_member_payment):
        """Test that execute propagates repository exceptions from find_active_by_member_year."""
        # Arrange
        repository_error = Exception("Database connection failed")
        mock_license_repository.find_active_by_member_year.side_effect = repository_error
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute([sample_member_payment], "payment123", 2026)

        assert str(exc_info.value) == "Database connection failed"

    async def test_execute_propagates_repository_exceptions_from_count(self, mock_license_repository, sample_member_payment):
        """Test that execute propagates repository exceptions from count_by_license_number_prefix."""
        # Arrange
        repository_error = Exception("Count operation failed")
        mock_license_repository.count_by_license_number_prefix.side_effect = repository_error
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute([sample_member_payment], "payment123", 2026)

        assert str(exc_info.value) == "Count operation failed"

    async def test_execute_propagates_repository_exceptions_from_create(self, mock_license_repository, sample_member_payment):
        """Test that execute propagates repository exceptions from create operation."""
        # Arrange
        repository_error = Exception("Insert operation failed")
        mock_license_repository.create.side_effect = repository_error
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute([sample_member_payment], "payment123", 2026)

        assert str(exc_info.value) == "Insert operation failed"

    async def test_execute_verifies_license_number_format_with_four_digit_padding(self, mock_license_repository):
        """Test that license numbers are correctly formatted with four-digit padding."""
        # Arrange
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member123",
            payment_year=2026,
            payment_type=MemberPaymentType.LICENCIA_KYU,
            concept="Licencia Kyu",
            amount=50.0,
            status=MemberPaymentStatus.COMPLETED
        )

        mock_license_repository.count_by_license_number_prefix.return_value = 999  # Next is 1000

        def create_side_effect(license):
            return license

        mock_license_repository.create.side_effect = create_side_effect
        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 1
        assert result[0].license_number == "LIC-2026-1000"  # Should have exactly 4 digits

    async def test_execute_processes_mixed_recognized_and_unrecognized_types(self, mock_license_repository):
        """Test that execute processes recognized types and skips unrecognized ones."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id="member1",
                payment_year=2026,
                payment_type=MemberPaymentType.LICENCIA_KYU,
                concept="Licencia Kyu",
                amount=50.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member2",
                payment_year=2026,
                payment_type=MemberPaymentType.TITULO_SHIDOIN,  # Not in mapping
                concept="Título Shidoin",
                amount=200.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member3",
                payment_year=2026,
                payment_type=MemberPaymentType.LICENCIA_DAN,
                concept="Licencia Dan",
                amount=100.0,
                status=MemberPaymentStatus.COMPLETED
            )
        ]

        def create_side_effect(license):
            return license

        mock_license_repository.create.side_effect = create_side_effect
        mock_license_repository.count_by_license_number_prefix.return_value = 0

        use_case = GenerateLicensesFromPaymentUseCase(mock_license_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 2  # Only KYU and DAN processed
        assert mock_license_repository.create.call_count == 2


@pytest.mark.unit
class TestPaymentTypeToLicenseAttrsMapping:
    """Test suite for the PAYMENT_TYPE_TO_LICENSE_ATTRS mapping constant."""

    def test_mapping_contains_all_expected_license_payment_types(self):
        """Test that the mapping contains all expected license-related payment types."""
        expected_types = [
            MemberPaymentType.LICENCIA_KYU,
            MemberPaymentType.LICENCIA_KYU_INFANTIL,
            MemberPaymentType.LICENCIA_DAN,
            MemberPaymentType.TITULO_FUKUSHIDOIN,
        ]

        for payment_type in expected_types:
            assert payment_type in PAYMENT_TYPE_TO_LICENSE_ATTRS, \
                f"{payment_type.value} should be in the mapping"

    def test_mapping_kyu_has_correct_attributes(self):
        """Test that KYU mapping has correct attributes."""
        attrs = PAYMENT_TYPE_TO_LICENSE_ATTRS[MemberPaymentType.LICENCIA_KYU]

        assert attrs["technical_grade"] == TechnicalGrade.KYU
        assert attrs["instructor_category"] == InstructorCategory.NONE
        assert attrs["age_category"] == AgeCategory.ADULTO
        assert attrs["license_type"] == LicenseType.KYU
        assert attrs["grade"] == "Kyu"

    def test_mapping_kyu_infantil_has_correct_attributes(self):
        """Test that KYU_INFANTIL mapping has correct attributes."""
        attrs = PAYMENT_TYPE_TO_LICENSE_ATTRS[MemberPaymentType.LICENCIA_KYU_INFANTIL]

        assert attrs["technical_grade"] == TechnicalGrade.KYU
        assert attrs["instructor_category"] == InstructorCategory.NONE
        assert attrs["age_category"] == AgeCategory.INFANTIL
        assert attrs["license_type"] == LicenseType.KYU
        assert attrs["grade"] == "Kyu Infantil"

    def test_mapping_dan_has_correct_attributes(self):
        """Test that DAN mapping has correct attributes."""
        attrs = PAYMENT_TYPE_TO_LICENSE_ATTRS[MemberPaymentType.LICENCIA_DAN]

        assert attrs["technical_grade"] == TechnicalGrade.DAN
        assert attrs["instructor_category"] == InstructorCategory.NONE
        assert attrs["age_category"] == AgeCategory.ADULTO
        assert attrs["license_type"] == LicenseType.DAN
        assert attrs["grade"] == "Dan"

    def test_mapping_fukushidoin_has_correct_attributes(self):
        """Test that FUKUSHIDOIN mapping has correct attributes."""
        attrs = PAYMENT_TYPE_TO_LICENSE_ATTRS[MemberPaymentType.TITULO_FUKUSHIDOIN]

        assert attrs["technical_grade"] == TechnicalGrade.DAN
        assert attrs["instructor_category"] == InstructorCategory.FUKUSHIDOIN
        assert attrs["age_category"] == AgeCategory.ADULTO
        assert attrs["license_type"] == LicenseType.INSTRUCTOR
        assert attrs["grade"] == "Fukushidoin/Shidoin"

    def test_mapping_does_not_contain_insurance_payment_types(self):
        """Test that insurance payment types are not in the license mapping."""
        insurance_types = [
            MemberPaymentType.SEGURO_ACCIDENTES,
            MemberPaymentType.SEGURO_RC,
        ]

        for payment_type in insurance_types:
            assert payment_type not in PAYMENT_TYPE_TO_LICENSE_ATTRS, \
                f"{payment_type.value} should not be in the license mapping"
