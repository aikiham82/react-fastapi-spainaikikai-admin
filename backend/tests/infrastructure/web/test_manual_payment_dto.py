"""Tests for manual payment DTOs and PaymentMapper.to_response_dto with payment_method."""

import pytest
from pydantic import ValidationError

from src.domain.entities.payment import Payment, PaymentMethod, PaymentStatus, PaymentType
from src.infrastructure.web.mappers_payment import PaymentMapper


@pytest.mark.api
@pytest.mark.unit
class TestManualMemberAssignmentDTO:
    """Test suite for ManualMemberAssignmentDTO."""

    def test_valid_assignment_parses_correctly(self):
        """Valid assignment with known payment_type parses without error."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualMemberAssignmentDTO

        dto = ManualMemberAssignmentDTO(
            member_id="member-abc",
            member_name="Juan Perez",
            payment_types=["kyu"],
        )
        assert dto.member_id == "member-abc"
        assert dto.payment_types == ["kyu"]

    def test_empty_member_id_raises_validation_error(self):
        """Empty member_id must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualMemberAssignmentDTO

        with pytest.raises(ValidationError) as exc_info:
            ManualMemberAssignmentDTO(
                member_id="",
                member_name="Juan",
                payment_types=["kyu"],
            )
        assert "member_id" in str(exc_info.value).lower() or "member id" in str(exc_info.value).lower()

    def test_whitespace_only_member_id_raises_validation_error(self):
        """Whitespace-only member_id must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualMemberAssignmentDTO

        with pytest.raises(ValidationError):
            ManualMemberAssignmentDTO(
                member_id="   ",
                member_name="Juan",
                payment_types=["kyu"],
            )

    def test_invalid_payment_type_raises_validation_error(self):
        """Unknown payment_type value must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualMemberAssignmentDTO

        with pytest.raises(ValidationError) as exc_info:
            ManualMemberAssignmentDTO(
                member_id="member-123",
                member_name="Juan",
                payment_types=["invalid_type"],
            )
        assert "invalid" in str(exc_info.value).lower() or "payment type" in str(exc_info.value).lower()

    def test_empty_payment_types_raises_validation_error(self):
        """Empty payment_types list must be rejected before the per-element loop."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualMemberAssignmentDTO

        with pytest.raises(ValidationError) as exc_info:
            ManualMemberAssignmentDTO(
                member_id="member-123",
                member_name="Juan",
                payment_types=[],
            )
        assert "payment type" in str(exc_info.value).lower() or "payment_types" in str(exc_info.value).lower()

    def test_all_valid_payment_types_are_accepted(self):
        """Each individually valid payment_type should pass."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualMemberAssignmentDTO

        valid_types = [
            "kyu", "kyu_infantil", "dan", "fukushidoin", "shidoin",
            "seguro_accidentes", "seguro_rc", "club_fee",
        ]
        for pt in valid_types:
            dto = ManualMemberAssignmentDTO(
                member_id="member-1",
                member_name="Test",
                payment_types=[pt],
            )
            assert pt in dto.payment_types


@pytest.mark.api
@pytest.mark.unit
class TestManualPaymentRequest:
    """Test suite for ManualPaymentRequest validation."""

    def _valid_payload(self) -> dict:
        return {
            "payer_name": "Club Director",
            "club_id": "club-xyz",
            "payment_year": 2026,
            "payment_method": "cash",
            "member_assignments": [
                {
                    "member_id": "member-1",
                    "member_name": "Ana Garcia",
                    "payment_types": ["kyu"],
                }
            ],
        }

    def test_valid_payload_parses_correctly(self):
        """A fully valid payload must parse without error."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        req = ManualPaymentRequest(**self._valid_payload())
        assert req.payment_method == "cash"
        assert req.payment_year == 2026
        assert req.payer_name == "Club Director"
        assert len(req.member_assignments) == 1

    def test_payment_method_redsys_is_rejected(self):
        """payment_method='redsys' must be rejected for manual payments."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_method"] = "redsys"
        with pytest.raises(ValidationError) as exc_info:
            ManualPaymentRequest(**payload)
        assert "payment_method" in str(exc_info.value).lower() or "redsys" in str(exc_info.value).lower()

    def test_payment_method_bitcoin_is_rejected(self):
        """Arbitrary unknown payment_method values must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_method"] = "bitcoin"
        with pytest.raises(ValidationError) as exc_info:
            ManualPaymentRequest(**payload)
        assert "payment_method" in str(exc_info.value).lower() or "bitcoin" in str(exc_info.value).lower()

    def test_payment_method_transfer_is_accepted(self):
        """payment_method='transfer' must be accepted."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_method"] = "transfer"
        req = ManualPaymentRequest(**payload)
        assert req.payment_method == "transfer"

    def test_payment_method_other_is_accepted(self):
        """payment_method='other' must be accepted."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_method"] = "other"
        req = ManualPaymentRequest(**payload)
        assert req.payment_method == "other"

    def test_payment_year_too_low_is_rejected(self):
        """payment_year below 1900 must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_year"] = 1899
        with pytest.raises(ValidationError) as exc_info:
            ManualPaymentRequest(**payload)
        assert "payment_year" in str(exc_info.value).lower() or "1900" in str(exc_info.value)

    def test_payment_year_too_high_is_rejected(self):
        """payment_year above 2100 must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_year"] = 2101
        with pytest.raises(ValidationError) as exc_info:
            ManualPaymentRequest(**payload)
        assert "payment_year" in str(exc_info.value).lower() or "2100" in str(exc_info.value)

    def test_payment_year_boundary_1900_is_accepted(self):
        """payment_year=1900 is at the lower boundary and must be accepted."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_year"] = 1900
        req = ManualPaymentRequest(**payload)
        assert req.payment_year == 1900

    def test_payment_year_boundary_2100_is_accepted(self):
        """payment_year=2100 is at the upper boundary and must be accepted."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payment_year"] = 2100
        req = ManualPaymentRequest(**payload)
        assert req.payment_year == 2100

    def test_empty_payer_name_is_rejected(self):
        """Empty payer_name must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payer_name"] = ""
        with pytest.raises(ValidationError) as exc_info:
            ManualPaymentRequest(**payload)
        assert "payer_name" in str(exc_info.value).lower() or "payer" in str(exc_info.value).lower()

    def test_whitespace_only_payer_name_is_rejected(self):
        """Whitespace-only payer_name must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["payer_name"] = "   "
        with pytest.raises(ValidationError):
            ManualPaymentRequest(**payload)

    def test_empty_member_assignments_is_rejected(self):
        """Empty member_assignments list must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        payload = self._valid_payload()
        payload["member_assignments"] = []
        with pytest.raises(ValidationError) as exc_info:
            ManualPaymentRequest(**payload)
        assert "member_assignments" in str(exc_info.value).lower() or "assignment" in str(exc_info.value).lower()

    def test_include_club_fee_defaults_to_false(self):
        """include_club_fee should default to False when not supplied."""
        from src.infrastructure.web.dto.manual_payment_dto import ManualPaymentRequest

        req = ManualPaymentRequest(**self._valid_payload())
        assert req.include_club_fee is False


@pytest.mark.api
@pytest.mark.unit
class TestPaymentUpdateRequest:
    """Test suite for PaymentUpdateRequest payment_method constraint."""

    def test_payment_method_none_is_accepted(self):
        """None (omitted) payment_method is valid for a partial update."""
        from src.infrastructure.web.dto.manual_payment_dto import PaymentUpdateRequest

        req = PaymentUpdateRequest()
        assert req.payment_method is None

    def test_payment_method_cash_is_accepted(self):
        """payment_method='cash' must be accepted."""
        from src.infrastructure.web.dto.manual_payment_dto import PaymentUpdateRequest

        req = PaymentUpdateRequest(payment_method="cash")
        assert req.payment_method == "cash"

    def test_payment_method_transfer_is_accepted(self):
        """payment_method='transfer' must be accepted."""
        from src.infrastructure.web.dto.manual_payment_dto import PaymentUpdateRequest

        req = PaymentUpdateRequest(payment_method="transfer")
        assert req.payment_method == "transfer"

    def test_payment_method_other_is_accepted(self):
        """payment_method='other' must be accepted."""
        from src.infrastructure.web.dto.manual_payment_dto import PaymentUpdateRequest

        req = PaymentUpdateRequest(payment_method="other")
        assert req.payment_method == "other"

    def test_payment_method_redsys_is_rejected(self):
        """payment_method='redsys' must be rejected — cannot re-classify manual as Redsys."""
        from src.infrastructure.web.dto.manual_payment_dto import PaymentUpdateRequest

        with pytest.raises(ValidationError) as exc_info:
            PaymentUpdateRequest(payment_method="redsys")
        assert "payment_method" in str(exc_info.value).lower() or "redsys" in str(exc_info.value).lower()

    def test_payment_method_bitcoin_is_rejected(self):
        """Arbitrary unknown values must be rejected."""
        from src.infrastructure.web.dto.manual_payment_dto import PaymentUpdateRequest

        with pytest.raises(ValidationError) as exc_info:
            PaymentUpdateRequest(payment_method="bitcoin")
        assert "payment_method" in str(exc_info.value).lower() or "bitcoin" in str(exc_info.value).lower()


@pytest.mark.api
@pytest.mark.unit
class TestPaymentMapperIncludesPaymentMethod:
    """Test that PaymentMapper.to_response_dto exposes payment_method."""

    def test_to_response_dto_includes_payment_method_cash(self):
        """When entity has CASH payment_method, DTO must have payment_method='cash'."""
        entity = Payment(
            id="pay-001",
            club_id="club-1",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=100.0,
            status=PaymentStatus.COMPLETED,
            payment_method=PaymentMethod.CASH,
            payment_year=2026,
        )
        dto = PaymentMapper.to_response_dto(entity)
        assert dto.payment_method == "cash"

    def test_to_response_dto_includes_payment_method_transfer(self):
        """When entity has TRANSFER payment_method, DTO must have payment_method='transfer'."""
        entity = Payment(
            id="pay-002",
            club_id="club-1",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=50.0,
            payment_method=PaymentMethod.TRANSFER,
        )
        dto = PaymentMapper.to_response_dto(entity)
        assert dto.payment_method == "transfer"

    def test_to_response_dto_defaults_to_redsys_when_not_set(self):
        """Default payment entity (no explicit payment_method) must map to 'redsys'."""
        entity = Payment(
            id="pay-003",
            club_id="club-1",
            payment_type=PaymentType.ANNUAL_QUOTA,
            amount=75.0,
        )
        dto = PaymentMapper.to_response_dto(entity)
        assert dto.payment_method == "redsys"
