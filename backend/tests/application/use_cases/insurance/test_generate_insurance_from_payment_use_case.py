"""Tests for GenerateInsuranceFromPaymentUseCase."""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from src.domain.entities.insurance import Insurance, InsuranceType, InsuranceStatus
from src.domain.entities.member_payment import MemberPayment, MemberPaymentType, MemberPaymentStatus
from src.application.use_cases.insurance.generate_insurance_from_payment_use_case import (
    GenerateInsuranceFromPaymentUseCase,
    PAYMENT_TYPE_TO_INSURANCE_TYPE
)


@pytest.fixture
def mock_insurance_repository():
    """Mock insurance repository for use case testing."""
    mock_repo = MagicMock()
    mock_repo.find_active_by_member_year_type = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()
    return mock_repo


@pytest.fixture
def sample_accident_member_payment():
    """Sample accident insurance member payment entity for testing."""
    return MemberPayment(
        id="mp123",
        payment_id="payment123",
        member_id="member123",
        payment_year=2026,
        payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
        concept="Seguro de Accidentes",
        amount=25.0,
        status=MemberPaymentStatus.COMPLETED,
        created_at=datetime(2026, 1, 1, 10, 0, 0),
        updated_at=datetime(2026, 1, 1, 10, 0, 0)
    )


@pytest.fixture
def sample_civil_liability_member_payment():
    """Sample civil liability insurance member payment entity for testing."""
    return MemberPayment(
        id="mp456",
        payment_id="payment123",
        member_id="member456",
        payment_year=2026,
        payment_type=MemberPaymentType.SEGURO_RC,
        concept="Seguro de RC",
        amount=15.0,
        status=MemberPaymentStatus.COMPLETED,
        created_at=datetime(2026, 1, 1, 10, 0, 0),
        updated_at=datetime(2026, 1, 1, 10, 0, 0)
    )


@pytest.fixture
def sample_insurance():
    """Sample insurance entity for testing."""
    return Insurance(
        id="ins123",
        member_id="member123",
        insurance_type=InsuranceType.ACCIDENT,
        policy_number="PENDIENTE",
        insurance_company="Spain Aikikai",
        start_date=datetime(2026, 1, 1),
        end_date=datetime(2026, 12, 31, 23, 59, 59),
        status=InsuranceStatus.ACTIVE,
        payment_id="payment123"
    )


@pytest.mark.unit
@pytest.mark.asyncio
class TestGenerateInsuranceFromPaymentUseCase:
    """Test suite for GenerateInsuranceFromPaymentUseCase."""

    async def test_execute_creates_accident_insurance_successfully(
        self, mock_insurance_repository, sample_accident_member_payment, sample_insurance
    ):
        """Test that execute creates ACCIDENT insurance successfully for a valid payment."""
        # Arrange
        member_payments = [sample_accident_member_payment]
        payment_id = "payment123"
        payment_year = 2026

        mock_insurance_repository.find_active_by_member_year_type.return_value = None
        mock_insurance_repository.create.return_value = sample_insurance

        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute(member_payments, payment_id, payment_year)

        # Assert
        assert len(result) == 1
        assert result[0] == sample_insurance
        mock_insurance_repository.find_active_by_member_year_type.assert_called_once()
        mock_insurance_repository.create.assert_called_once()

        # Verify the created insurance attributes
        created_insurance = mock_insurance_repository.create.call_args[0][0]
        assert created_insurance.member_id == "member123"
        assert created_insurance.insurance_type == InsuranceType.ACCIDENT
        assert created_insurance.policy_number == "PENDIENTE"
        assert created_insurance.insurance_company == "Spain Aikikai"
        assert created_insurance.start_date == datetime(2026, 1, 1)
        assert created_insurance.end_date == datetime(2026, 12, 31, 23, 59, 59)
        assert created_insurance.status == InsuranceStatus.ACTIVE
        assert created_insurance.payment_id == "payment123"

    async def test_execute_creates_civil_liability_insurance_successfully(
        self, mock_insurance_repository, sample_civil_liability_member_payment
    ):
        """Test that execute creates CIVIL_LIABILITY insurance successfully."""
        # Arrange
        expected_insurance = Insurance(
            id="ins456",
            member_id="member456",
            insurance_type=InsuranceType.CIVIL_LIABILITY,
            policy_number="PENDIENTE",
            insurance_company="Spain Aikikai",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 12, 31, 23, 59, 59),
            status=InsuranceStatus.ACTIVE,
            payment_id="payment123"
        )

        mock_insurance_repository.create.return_value = expected_insurance
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([sample_civil_liability_member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 1
        created_insurance = mock_insurance_repository.create.call_args[0][0]
        assert created_insurance.insurance_type == InsuranceType.CIVIL_LIABILITY
        assert created_insurance.member_id == "member456"
        assert created_insurance.policy_number == "PENDIENTE"

    async def test_execute_verifies_default_policy_number_pendiente(
        self, mock_insurance_repository, sample_accident_member_payment
    ):
        """Test that execute uses default policy_number='PENDIENTE' for new insurance."""
        # Arrange
        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([sample_accident_member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 1
        assert result[0].policy_number == "PENDIENTE"

    async def test_execute_verifies_default_insurance_company_spain_aikikai(
        self, mock_insurance_repository, sample_accident_member_payment
    ):
        """Test that execute uses default insurance_company='Spain Aikikai'."""
        # Arrange
        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([sample_accident_member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 1
        assert result[0].insurance_company == "Spain Aikikai"

    async def test_execute_skips_insurance_if_already_exists_for_member_year_type(
        self, mock_insurance_repository, sample_accident_member_payment
    ):
        """Test idempotency: skips insurance creation if one already exists for the member+year+type."""
        # Arrange
        existing_insurance = Insurance(
            id="existing_ins",
            member_id="member123",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-2026-001",
            insurance_company="Spain Aikikai",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 12, 31, 23, 59, 59),
            status=InsuranceStatus.ACTIVE,
            payment_id="payment123"
        )

        mock_insurance_repository.find_active_by_member_year_type.return_value = existing_insurance
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([sample_accident_member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 0  # No new insurance created
        mock_insurance_repository.find_active_by_member_year_type.assert_called_once()
        mock_insurance_repository.create.assert_not_called()

    async def test_execute_skips_unrecognized_payment_types(self, mock_insurance_repository):
        """Test that execute skips payment types not in the insurance mapping."""
        # Arrange - License payment type should be skipped
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member123",
            payment_year=2026,
            payment_type=MemberPaymentType.LICENCIA_KYU,  # Not an insurance type
            concept="Licencia Kyu",
            amount=50.0,
            status=MemberPaymentStatus.COMPLETED
        )

        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", 2026)

        # Assert
        assert len(result) == 0
        mock_insurance_repository.find_active_by_member_year_type.assert_not_called()
        mock_insurance_repository.create.assert_not_called()

    async def test_execute_returns_empty_list_for_empty_member_payments(self, mock_insurance_repository):
        """Test that execute returns empty list when no member payments provided."""
        # Arrange
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([], "payment123", 2026)

        # Assert
        assert result == []
        mock_insurance_repository.find_active_by_member_year_type.assert_not_called()
        mock_insurance_repository.create.assert_not_called()

    async def test_execute_creates_multiple_insurances_for_multiple_members(self, mock_insurance_repository):
        """Test that execute creates insurance for multiple members in a single call."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id=f"member{i}",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
                concept="Seguro de Accidentes",
                amount=25.0,
                status=MemberPaymentStatus.COMPLETED
            )
            for i in range(3)
        ]

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 3
        assert all(ins.insurance_type == InsuranceType.ACCIDENT for ins in result)
        assert result[0].member_id == "member0"
        assert result[1].member_id == "member1"
        assert result[2].member_id == "member2"

    async def test_execute_uses_correct_year_in_validity_dates(self, mock_insurance_repository):
        """Test that execute uses the payment_year correctly in start_date and end_date."""
        # Arrange
        payment_year = 2027
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member123",
            payment_year=payment_year,
            payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
            concept="Seguro de Accidentes",
            amount=25.0,
            status=MemberPaymentStatus.COMPLETED
        )

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", payment_year)

        # Assert
        assert len(result) == 1
        created_insurance = mock_insurance_repository.create.call_args[0][0]
        assert created_insurance.start_date == datetime(2027, 1, 1)
        assert created_insurance.end_date == datetime(2027, 12, 31, 23, 59, 59)

    async def test_execute_handles_both_insurance_types_in_single_call(self, mock_insurance_repository):
        """Test that execute handles both ACCIDENT and CIVIL_LIABILITY types in a single call."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id="member1",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
                concept="Seguro de Accidentes",
                amount=25.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member2",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_RC,
                concept="Seguro de RC",
                amount=15.0,
                status=MemberPaymentStatus.COMPLETED
            )
        ]

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 2
        assert result[0].insurance_type == InsuranceType.ACCIDENT
        assert result[1].insurance_type == InsuranceType.CIVIL_LIABILITY

    async def test_execute_passes_payment_id_to_insurance_entity(self, mock_insurance_repository):
        """Test that execute correctly assigns the payment_id to created insurance entities."""
        # Arrange
        payment_id = "payment_special_123"
        member_payment = MemberPayment(
            payment_id=payment_id,
            member_id="member123",
            payment_year=2026,
            payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
            concept="Seguro de Accidentes",
            amount=25.0,
            status=MemberPaymentStatus.COMPLETED
        )

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([member_payment], payment_id, 2026)

        # Assert
        assert len(result) == 1
        assert result[0].payment_id == payment_id

    async def test_execute_propagates_repository_exceptions_from_find(
        self, mock_insurance_repository, sample_accident_member_payment
    ):
        """Test that execute propagates repository exceptions from find_active_by_member_year_type."""
        # Arrange
        repository_error = Exception("Database connection failed")
        mock_insurance_repository.find_active_by_member_year_type.side_effect = repository_error
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute([sample_accident_member_payment], "payment123", 2026)

        assert str(exc_info.value) == "Database connection failed"

    async def test_execute_propagates_repository_exceptions_from_create(
        self, mock_insurance_repository, sample_accident_member_payment
    ):
        """Test that execute propagates repository exceptions from create operation."""
        # Arrange
        repository_error = Exception("Insert operation failed")
        mock_insurance_repository.create.side_effect = repository_error
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await use_case.execute([sample_accident_member_payment], "payment123", 2026)

        assert str(exc_info.value) == "Insert operation failed"

    async def test_execute_verifies_insurance_status_is_active(self, mock_insurance_repository):
        """Test that all created insurances have ACTIVE status."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id="member1",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
                concept="Seguro de Accidentes",
                amount=25.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member2",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_RC,
                concept="Seguro de RC",
                amount=15.0,
                status=MemberPaymentStatus.COMPLETED
            )
        ]

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 2
        assert all(ins.status == InsuranceStatus.ACTIVE for ins in result)

    async def test_execute_processes_mixed_insurance_and_license_types(self, mock_insurance_repository):
        """Test that execute processes insurance types and skips license payment types."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id="member1",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
                concept="Seguro de Accidentes",
                amount=25.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member2",
                payment_year=2026,
                payment_type=MemberPaymentType.LICENCIA_KYU,  # Should be skipped
                concept="Licencia Kyu",
                amount=50.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member3",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_RC,
                concept="Seguro de RC",
                amount=15.0,
                status=MemberPaymentStatus.COMPLETED
            )
        ]

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 2  # Only insurance types processed
        assert mock_insurance_repository.create.call_count == 2

    async def test_execute_calls_find_with_correct_parameters(self, mock_insurance_repository):
        """Test that execute calls find_active_by_member_year_type with correct parameters."""
        # Arrange
        member_payment = MemberPayment(
            payment_id="payment123",
            member_id="member_test_123",
            payment_year=2026,
            payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
            concept="Seguro de Accidentes",
            amount=25.0,
            status=MemberPaymentStatus.COMPLETED
        )

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute([member_payment], "payment123", 2026)

        # Assert
        mock_insurance_repository.find_active_by_member_year_type.assert_called_once_with(
            member_id="member_test_123",
            payment_year=2026,
            insurance_type=InsuranceType.ACCIDENT
        )

    async def test_execute_handles_partial_idempotency(self, mock_insurance_repository):
        """Test that execute creates only non-existing insurances when some already exist."""
        # Arrange
        member_payments = [
            MemberPayment(
                payment_id="payment123",
                member_id="member1",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
                concept="Seguro de Accidentes",
                amount=25.0,
                status=MemberPaymentStatus.COMPLETED
            ),
            MemberPayment(
                payment_id="payment123",
                member_id="member2",
                payment_year=2026,
                payment_type=MemberPaymentType.SEGURO_ACCIDENTES,
                concept="Seguro de Accidentes",
                amount=25.0,
                status=MemberPaymentStatus.COMPLETED
            )
        ]

        # First member already has insurance, second doesn't
        existing_insurance = Insurance(
            id="existing_ins",
            member_id="member1",
            insurance_type=InsuranceType.ACCIDENT,
            policy_number="POL-2026-001",
            insurance_company="Spain Aikikai",
            start_date=datetime(2026, 1, 1),
            end_date=datetime(2026, 12, 31, 23, 59, 59),
            status=InsuranceStatus.ACTIVE
        )

        call_count = [0]

        def find_side_effect(member_id, payment_year, insurance_type):
            call_count[0] += 1
            if member_id == "member1":
                return existing_insurance
            return None

        mock_insurance_repository.find_active_by_member_year_type.side_effect = find_side_effect

        def create_side_effect(insurance):
            return insurance

        mock_insurance_repository.create.side_effect = create_side_effect
        use_case = GenerateInsuranceFromPaymentUseCase(mock_insurance_repository)

        # Act
        result = await use_case.execute(member_payments, "payment123", 2026)

        # Assert
        assert len(result) == 1  # Only member2 insurance created
        assert result[0].member_id == "member2"
        assert mock_insurance_repository.create.call_count == 1


@pytest.mark.unit
class TestPaymentTypeToInsuranceTypeMapping:
    """Test suite for the PAYMENT_TYPE_TO_INSURANCE_TYPE mapping constant."""

    def test_mapping_contains_all_expected_insurance_payment_types(self):
        """Test that the mapping contains all expected insurance-related payment types."""
        expected_types = [
            MemberPaymentType.SEGURO_ACCIDENTES,
            MemberPaymentType.SEGURO_RC,
        ]

        for payment_type in expected_types:
            assert payment_type in PAYMENT_TYPE_TO_INSURANCE_TYPE, \
                f"{payment_type.value} should be in the mapping"

    def test_mapping_seguro_accidentes_to_accident(self):
        """Test that SEGURO_ACCIDENTES maps to InsuranceType.ACCIDENT."""
        assert PAYMENT_TYPE_TO_INSURANCE_TYPE[MemberPaymentType.SEGURO_ACCIDENTES] == InsuranceType.ACCIDENT

    def test_mapping_seguro_rc_to_civil_liability(self):
        """Test that SEGURO_RC maps to InsuranceType.CIVIL_LIABILITY."""
        assert PAYMENT_TYPE_TO_INSURANCE_TYPE[MemberPaymentType.SEGURO_RC] == InsuranceType.CIVIL_LIABILITY

    def test_mapping_does_not_contain_license_payment_types(self):
        """Test that license payment types are not in the insurance mapping."""
        license_types = [
            MemberPaymentType.LICENCIA_KYU,
            MemberPaymentType.LICENCIA_KYU_INFANTIL,
            MemberPaymentType.LICENCIA_DAN,
            MemberPaymentType.TITULO_FUKUSHIDOIN,
        ]

        for payment_type in license_types:
            assert payment_type not in PAYMENT_TYPE_TO_INSURANCE_TYPE, \
                f"{payment_type.value} should not be in the insurance mapping"

    def test_mapping_has_exactly_two_entries(self):
        """Test that the mapping contains exactly two insurance types."""
        assert len(PAYMENT_TYPE_TO_INSURANCE_TYPE) == 2
